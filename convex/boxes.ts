/**
 * Clawmart dev boxes — control surface (V8 runtime).
 *
 * A dev box is a real EC2 instance a user spins up for a LIVE company. It runs a
 * BYOK agent that opens PRs against the user's repo for the user to review — it
 * is never auto-merged and Clawmart never claims to run the business for them
 * (docs/adr/2026-07-18-ec2-provisioning.md; trust rules in CLAUDE.md).
 *
 * This module is the DB + auth layer. The actual AWS calls live in the Node
 * action convex/provisioning.ts, which this module schedules. Everything is
 * feature-flagged: with CLAWMART_BOXES_ENABLED unset, provisionDevBox refuses
 * and no box can be created.
 *
 * Mirrors the house patterns in companies.ts: requireIdentity, ConvexError
 * codes, sliding-window bumpRateLimit, scheduler.runAfter to hand off to the
 * action, and agentEvents inserts so the existing /studio/[id] feed shows box
 * progress with zero UI changes.
 */
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { boxDeadlineMs, isBoxFinished, parseBoxPrUrl } from "./lib/boxevents";
import { getAgent } from "./lib/roster";
import { settleTaskFromBox, touchMission } from "./missions";

const BOX_EVENT_KEY = "devbox";
const DEFAULT_INSTANCE_TYPE = "t4g.small";
const DEFAULT_BASE_BRANCH = "main";
const TASK_MAX = 4000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_BOXES_PER_USER_PER_DAY = 5;
const MAX_BOXES_GLOBAL_PER_DAY = 20;

async function requireIdentity(ctx: {
  auth: { getUserIdentity(): Promise<{ subject: string; email?: string } | null> };
}) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("unauthenticated");
  return identity;
}

async function rateLimitRow(ctx: MutationCtx, key: string) {
  return ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
}

/**
 * Read-only: is this window already full? Charges nothing.
 *
 * A caller that turns a refusal into a RETURN VALUE cannot use the throwing
 * limiter below. A throw rolls the whole mutation back, but a CAUGHT throw does
 * not: increments already made by earlier windows would commit for a box that
 * was never created, so refused claims would drain the shared global budget.
 * Such a caller checks every window first and charges only once nothing left
 * can refuse (claimBoxForTask).
 */
async function rateLimitFull(ctx: MutationCtx, key: string, windowMs: number, max: number) {
  const row = await rateLimitRow(ctx, key);
  return !!row && Date.now() - row.windowStart <= windowMs && row.count >= max;
}

/** Same sliding-window limiter as companies.bumpRateLimit (kept local — surgical). */
async function bumpRateLimit(ctx: MutationCtx, key: string, windowMs: number, max: number) {
  const now = Date.now();
  const existing = await rateLimitRow(ctx, key);
  if (!existing || now - existing.windowStart > windowMs) {
    if (existing) await ctx.db.patch(existing._id, { windowStart: now, count: 1 });
    else await ctx.db.insert("rateLimits", { key, windowStart: now, count: 1 });
  } else if (existing.count >= max) {
    throw new ConvexError("rate_limited");
  } else {
    await ctx.db.patch(existing._id, { count: existing.count + 1 });
  }
}

function boxId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return "box_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Repos a box may target. Fails CLOSED: an unset allowlist permits nothing,
 * because the bot PAT is server-held and a caller must never be able to aim it
 * at an arbitrary repository.
 */
function repoAllowlist(): string[] {
  return (process.env.CLAWMART_BOX_REPO_ALLOWLIST ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Branch a box works from when the caller names none.
 *
 * Configurable because the mission path takes no caller-supplied branch by
 * design, so an allowlisted repo whose default branch is not "main" was
 * otherwise unreachable from it. One value for every allowlisted repo —
 * per-repo branches are not supported.
 */
function defaultBaseBranch(): string {
  return process.env.CLAWMART_BOX_BASE_BRANCH?.trim() || DEFAULT_BASE_BRANCH;
}

async function byBoxId(ctx: MutationCtx, id: string): Promise<Doc<"devBoxes"> | null> {
  return ctx.db
    .query("devBoxes")
    .withIndex("by_box", (q) => q.eq("boxId", id))
    .first();
}

/** Start tearing a box down. Safe to call in any state; idempotent-ish. */
async function beginTerminate(ctx: MutationCtx, box: Doc<"devBoxes">): Promise<void> {
  if (box.status !== "provisioning" && box.status !== "running") return;
  await ctx.db.patch(box._id, { status: "terminating", updatedAt: Date.now() });
  await ctx.scheduler.runAfter(0, internal.provisioning.terminateBox, {
    boxId: box.boxId,
    instanceId: box.instanceId,
  });
}

// ---------------------------------------------------------------------------
// Public mutations
// ---------------------------------------------------------------------------

/** Spin up a real dev box for a live company. Owner-only, flag-gated, rate-limited. */
export const provisionDevBox = mutation({
  args: {
    companyId: v.id("companies"),
    task: v.string(),
    repoUrl: v.optional(v.string()),
    baseBranch: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ boxId: string }> => {
    if (process.env.CLAWMART_BOXES_ENABLED !== "1") throw new ConvexError("boxes_disabled");

    const identity = await requireIdentity(ctx);
    const company = await ctx.db.get(args.companyId);
    if (!company || company.ownerId !== identity.subject) throw new ConvexError("not_found");
    if (company.status !== "live") throw new ConvexError("company_not_live");

    const task = args.task.trim();
    if (task.length < 8) throw new ConvexError("task_too_short");
    if (task.length > TASK_MAX) throw new ConvexError("task_too_long");

    // The bot PAT is server-held, so a user must not aim a box at an arbitrary
    // repo. Fail CLOSED: an empty allowlist permits nothing, and any repo must be
    // an explicit member — never treat "no allowlist" as "allow everything".
    const allow = repoAllowlist();
    if (allow.length === 0) throw new ConvexError("no_repo_configured");
    const repoUrl = (args.repoUrl ?? allow[0]).trim();
    if (!allow.includes(repoUrl)) throw new ConvexError("repo_not_allowed");

    // Never two live boxes for the same company.
    const existing = await ctx.db
      .query("devBoxes")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
    if (existing.some((b) => b.status === "provisioning" || b.status === "running")) {
      throw new ConvexError("box_already_running");
    }

    await bumpRateLimit(ctx, "devboxes:global", DAY_MS, MAX_BOXES_GLOBAL_PER_DAY);
    await bumpRateLimit(ctx, `devboxes:user:${identity.subject}`, DAY_MS, MAX_BOXES_PER_USER_PER_DAY);

    const id = boxId();
    const region = process.env.AWS_REGION ?? "us-east-2";
    const baseBranch = args.baseBranch?.trim() || defaultBaseBranch();
    const now = Date.now();

    await ctx.db.insert("devBoxes", {
      companyId: args.companyId,
      ownerId: identity.subject,
      boxId: id,
      status: "provisioning",
      region,
      instanceType: process.env.CLAWMART_BOX_INSTANCE_TYPE ?? DEFAULT_INSTANCE_TYPE,
      repoUrl,
      baseBranch,
      callbackSecretHash: "", // filled by the action once the box secret exists
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("agentEvents", {
      companyId: args.companyId,
      agentKey: BOX_EVENT_KEY,
      kind: "status",
      text: "Spinning up a real dev box — it will open a pull request for you to review.",
      ts: now,
    });

    await ctx.scheduler.runAfter(0, internal.provisioning.provisionBox, {
      boxId: id,
      companyId: args.companyId,
      repoUrl,
      baseBranch,
      task,
    });
    return { boxId: id };
  },
});

/** Terminate a box now. Owner-only. Safe to call in any state (idempotent-ish). */
export const killDevBox = mutation({
  args: { boxId: v.string() },
  handler: async (ctx, args): Promise<null> => {
    const identity = await requireIdentity(ctx);
    const box = await ctx.db
      .query("devBoxes")
      .withIndex("by_box", (q) => q.eq("boxId", args.boxId))
      .first();
    if (!box || box.ownerId !== identity.subject) throw new ConvexError("not_found");
    if (box.status === "terminated") return null;

    await ctx.db.patch(box._id, { status: "terminating", updatedAt: Date.now() });
    await ctx.db.insert("agentEvents", {
      companyId: box.companyId,
      agentKey: BOX_EVENT_KEY,
      kind: "status",
      text: "Terminating dev box…",
      ts: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.provisioning.terminateBox, {
      boxId: box.boxId,
      instanceId: box.instanceId,
    });
    return null;
  },
});

// ---------------------------------------------------------------------------
// The mission bridge (docs/AGENCY.md) — dispatch, deadline, release
// ---------------------------------------------------------------------------

/**
 * Hand ONE mission task to a real dev box, or refuse and say why.
 *
 * Called from missionEngine.runTask for a codeCapable specialist on a mission
 * that opted into execution. Every refusal is a plain return value, never a
 * throw: the caller falls back to the ordinary model path, so a mission can
 * lose its box for any reason and still deliver a draft — the flag being off is
 * simply the most common of those reasons.
 *
 * Guardrails, all enforced here because this mutation is the only thing in the
 * Agency that can spend money:
 *   - CLAWMART_BOXES_ENABLED, checked before a single read or write;
 *   - the mission's own `execute` opt-in, re-checked rather than trusted;
 *   - the agent must be one of the eight codeCapable engineering roles;
 *   - ONE box per mission, ever (by_mission index), not one per task;
 *   - the company's existing "never two live boxes" rule;
 *   - the same per-user and global daily box windows as the manual button.
 */
export const claimBoxForTask = internalMutation({
  args: { taskId: v.id("missionTasks") },
  handler: async (ctx, args): Promise<{ ok: boolean; reason: string }> => {
    // First line, before any read or write. This is what makes "with the flag
    // unset a mission behaves exactly as it does today" literally true rather
    // than approximately true.
    if (process.env.CLAWMART_BOXES_ENABLED !== "1") return { ok: false, reason: "boxes_disabled" };

    const task = await ctx.db.get(args.taskId);
    if (!task || task.status !== "running") return { ok: false, reason: "task_not_running" };

    const mission = await ctx.db.get(task.missionId);
    if (!mission || mission.status !== "running") {
      return { ok: false, reason: "mission_not_running" };
    }
    if (mission.execute !== true) return { ok: false, reason: "execution_not_enabled" };
    // A dev box writes to a real repository. Only the roles that were reviewed
    // for that (roster.codeCapable) may reach one, whatever the planner staffed.
    if (!getAgent(task.agentKey)?.codeCapable) {
      return { ok: false, reason: "agent_not_code_capable" };
    }

    // One box per MISSION, not per task: booting EC2 per task is minutes of
    // latency and money for each. The rows are never deleted, so this also holds
    // after the box is gone — a mission gets one shot at execution and its other
    // codeCapable tasks draft text exactly as they do today.
    const forMission = await ctx.db
      .query("devBoxes")
      .withIndex("by_mission", (q) => q.eq("missionId", task.missionId))
      .collect();
    // Already dispatched for THIS task (a duplicate runTask schedule): report
    // success so the caller does not start a model racing its own box.
    if (forMission.some((b) => b.missionTaskId === args.taskId)) {
      return { ok: true, reason: "already_dispatched" };
    }
    if (forMission.length > 0) return { ok: false, reason: "mission_box_used" };

    const company = await ctx.db.get(task.companyId);
    if (!company || company.status !== "live") return { ok: false, reason: "company_not_live" };

    const allow = repoAllowlist();
    if (allow.length === 0) return { ok: false, reason: "no_repo_configured" };
    // No caller-supplied repo on this path at all: the mission never names one,
    // so a prompt-injected plan cannot steer a box at a different repository.
    const repoUrl = allow[0];

    const live = await ctx.db
      .query("devBoxes")
      .withIndex("by_company", (q) => q.eq("companyId", task.companyId))
      .collect();
    if (live.some((b) => b.status === "provisioning" || b.status === "running")) {
      return { ok: false, reason: "box_already_running" };
    }

    // Same sliding windows as the manual button, charged to the mission's owner.
    // CHECKED first, then charged, because on this path a refusal is a return
    // value: a caught throw would leave the global window's increment in the
    // committing transaction, so refusals would burn the shared daily budget for
    // a box nobody got. Nothing below this point can refuse, so every increment
    // now corresponds to a box that is actually being created.
    const userWindow = `devboxes:user:${mission.ownerId}`;
    if (
      (await rateLimitFull(ctx, "devboxes:global", DAY_MS, MAX_BOXES_GLOBAL_PER_DAY)) ||
      (await rateLimitFull(ctx, userWindow, DAY_MS, MAX_BOXES_PER_USER_PER_DAY))
    ) {
      return { ok: false, reason: "rate_limited" };
    }
    await bumpRateLimit(ctx, "devboxes:global", DAY_MS, MAX_BOXES_GLOBAL_PER_DAY);
    await bumpRateLimit(ctx, userWindow, DAY_MS, MAX_BOXES_PER_USER_PER_DAY);

    const id = boxId();
    const baseBranch = defaultBaseBranch();
    const now = Date.now();
    // What the box is actually asked to do. The specialist's brief plus the
    // mission goal for context — no teammate handoffs and no company copy: the
    // box works in a repository, and everything sent to it becomes part of an
    // agent prompt that also reads untrusted repository content.
    const boxTask = [task.title, task.brief, `Mission goal: ${mission.goal}`]
      .join("\n\n")
      .slice(0, TASK_MAX);

    await ctx.db.insert("devBoxes", {
      companyId: task.companyId,
      ownerId: mission.ownerId,
      boxId: id,
      status: "provisioning",
      region: process.env.AWS_REGION ?? "us-east-2",
      instanceType: process.env.CLAWMART_BOX_INSTANCE_TYPE ?? DEFAULT_INSTANCE_TYPE,
      repoUrl,
      baseBranch,
      callbackSecretHash: "", // filled by the action once the box secret exists
      missionId: task.missionId,
      missionTaskId: args.taskId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("agentEvents", {
      companyId: task.companyId,
      agentKey: BOX_EVENT_KEY,
      kind: "status",
      // Honest about what a box does and does not guarantee: it works on a
      // branch, and it opens a pull request only if it actually changed
      // something. Nothing is merged either way (CLAUDE.md trust rules).
      text: `${getAgent(task.agentKey)?.name ?? task.agentKey} is taking "${task.title}" to a real dev box — if it produces a change it will open a pull request for you to review.`,
      ts: now,
    });

    await ctx.scheduler.runAfter(0, internal.provisioning.provisionBox, {
      boxId: id,
      companyId: task.companyId,
      repoUrl,
      baseBranch,
      task: boxTask,
      // The box runs as the specialist the planner staffed — the same key this
      // mutation already validated as codeCapable and already named in the feed.
      // Without it every box would run as the globally configured default agent.
      agentKey: task.agentKey,
    });
    // The guaranteed settle. Scheduled at dispatch, not derived from anything the
    // box says, so a task handed to a box always settles even if the box never
    // speaks again.
    await ctx.scheduler.runAfter(boxDeadlineMs(), internal.boxes.expireMissionBox, { boxId: id });
    return { ok: true, reason: "dispatched" };
  },
});

/**
 * The deadline. Settles the task and tears the box down if the box is still
 * around when its own hard shutdown timer plus a grace window has passed.
 *
 * This — not the stale-mission watchdog — is the backstop for a box that dies
 * without its terminal event: a crashed harness, a container killed mid-run, an
 * instance that never finished booting. The watchdog stays behind it as a
 * catch-all, which is the right order: a mission should not depend on a
 * five-minute cron to notice that its only executor is gone.
 */
export const expireMissionBox = internalMutation({
  args: { boxId: v.string() },
  handler: async (ctx, args): Promise<null> => {
    const box = await byBoxId(ctx, args.boxId);
    if (!box) return null;
    if (box.missionTaskId) {
      // A PR the box reported before dying still counts; settleTaskFromBox is a
      // no-op if the task already settled through any other path.
      await settleTaskFromBox(ctx, box.missionTaskId, {
        boxId: box.boxId,
        repoUrl: box.repoUrl,
        prUrl: box.prUrl,
        error: "the dev box did not report a pull request before its deadline",
      });
    }
    await beginTerminate(ctx, box);
    return null;
  },
});

/**
 * Release a mission's box when the mission settles without it (cancelled by the
 * owner, or closed by the stale-mission watchdog). Scheduled from missions.ts —
 * never imported — so that module keeps no dependency on this one.
 */
export const releaseMissionBox = internalMutation({
  args: { missionId: v.id("missions"), reason: v.string() },
  handler: async (ctx, args): Promise<null> => {
    const boxes = await ctx.db
      .query("devBoxes")
      .withIndex("by_mission", (q) => q.eq("missionId", args.missionId))
      .collect();
    for (const box of boxes) {
      if (box.status !== "provisioning" && box.status !== "running") continue;
      await ctx.db.insert("agentEvents", {
        companyId: box.companyId,
        agentKey: BOX_EVENT_KEY,
        kind: "status",
        text: `Releasing the dev box — ${args.reason}.`,
        ts: Date.now(),
      });
      await beginTerminate(ctx, box);
    }
    return null;
  },
});

// ---------------------------------------------------------------------------
// Public query — owner-gated, secret-free
// ---------------------------------------------------------------------------

export const boxesForCompany = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const company = await ctx.db.get(args.companyId);
    if (!company || company.ownerId !== identity.subject) return [];
    const rows = await ctx.db
      .query("devBoxes")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
    return rows
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((b) => ({
        boxId: b.boxId,
        status: b.status,
        publicIp: b.publicIp,
        instanceType: b.instanceType,
        repoUrl: b.repoUrl,
        prUrl: b.prUrl,
        createdAt: b.createdAt,
        error: b.error,
      }));
  },
});

// ---------------------------------------------------------------------------
// Internal mutations/queries — reached only from the action + httpAction
// ---------------------------------------------------------------------------

export const getByBoxId = internalQuery({
  args: { boxId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("devBoxes")
      .withIndex("by_box", (q) => q.eq("boxId", args.boxId))
      .first();
  },
});

export const recordLaunch = internalMutation({
  args: {
    boxId: v.string(),
    instanceId: v.string(),
    callbackSecretHash: v.string(),
  },
  handler: async (ctx, args): Promise<null> => {
    const box = await ctx.db
      .query("devBoxes")
      .withIndex("by_box", (q) => q.eq("boxId", args.boxId))
      .first();
    if (!box) return null;
    // If the user hit "kill" while the box was still provisioning, don't
    // resurrect it — record the now-known instanceId and terminate the orphan.
    if (box.status === "terminating" || box.status === "terminated") {
      await ctx.db.patch(box._id, { instanceId: args.instanceId, updatedAt: Date.now() });
      await ctx.scheduler.runAfter(0, internal.provisioning.terminateBox, {
        boxId: box.boxId,
        instanceId: args.instanceId,
      });
      return null;
    }
    await ctx.db.patch(box._id, {
      instanceId: args.instanceId,
      callbackSecretHash: args.callbackSecretHash,
      status: "running",
      updatedAt: Date.now(),
    });
    await ctx.db.insert("agentEvents", {
      companyId: box.companyId,
      agentKey: BOX_EVENT_KEY,
      kind: "status",
      text: "Dev box is up. The agent is starting work…",
      ts: Date.now(),
    });
    return null;
  },
});

/**
 * Called by the /box/event httpAction after it validates the box secret.
 *
 * For a box the Agency dispatched this is also the completion path: the harness
 * has no structured callback, so the mission's task is settled from the two
 * terminal lines the entrypoint emits. Everything that pattern-matches the
 * stream lives in lib/boxevents.ts, where the rules that keep untrusted
 * repository bytes from forging those lines are unit-tested.
 */
export const recordBoxEvent = internalMutation({
  args: {
    boxId: v.string(),
    kind: v.union(v.literal("status"), v.literal("output")),
    text: v.string(),
  },
  handler: async (ctx, args): Promise<null> => {
    const box = await byBoxId(ctx, args.boxId);
    if (!box) return null;
    await ctx.db.insert("agentEvents", {
      companyId: box.companyId,
      agentKey: BOX_EVENT_KEY,
      kind: args.kind,
      text: args.text.slice(0, 2000),
      ts: Date.now(),
    });

    if (!box.missionId || !box.missionTaskId) return null;

    // A working box is mission progress — otherwise the 15-minute watchdog would
    // close a mission whose box is legitimately allowed to run for an hour.
    await touchMission(ctx, box.missionId);

    // First reported pull request wins; later lines cannot rewrite it.
    const prUrl = box.prUrl ?? parseBoxPrUrl(args.kind, args.text, box.repoUrl) ?? undefined;
    if (prUrl && prUrl !== box.prUrl) {
      await ctx.db.patch(box._id, { prUrl, updatedAt: Date.now() });
    }

    if (isBoxFinished(args.kind, args.text)) {
      await settleTaskFromBox(ctx, box.missionTaskId, {
        boxId: box.boxId,
        repoUrl: box.repoUrl,
        prUrl,
        error: "the dev box finished without opening a pull request",
      });
      // The box's work is over the moment it says so. Tearing it down here (in
      // this order, after the task is settled) frees the company's box slot and
      // revokes the callback credential immediately instead of leaving both live
      // until the deadline. Mission boxes only — a manually started box keeps
      // exactly the lifecycle it has today.
      await beginTerminate(ctx, box);
    }
    return null;
  },
});

export const markTerminated = internalMutation({
  args: { boxId: v.string() },
  handler: async (ctx, args): Promise<null> => {
    const box = await byBoxId(ctx, args.boxId);
    if (!box) return null;
    // A terminated box will never report again. If it was carrying a mission
    // task that is somehow still running, settle it now — with the pull request
    // it managed to open, if it opened one.
    if (box.missionTaskId) {
      await settleTaskFromBox(ctx, box.missionTaskId, {
        boxId: box.boxId,
        repoUrl: box.repoUrl,
        prUrl: box.prUrl,
        error: "the dev box was terminated before it reported a pull request",
      });
    }
    await ctx.db.patch(box._id, {
      status: "terminated",
      terminatedAt: Date.now(),
      updatedAt: Date.now(),
      callbackSecretHash: "", // revoke the box's callback credential on teardown
    });
    await ctx.db.insert("agentEvents", {
      companyId: box.companyId,
      agentKey: BOX_EVENT_KEY,
      kind: "status",
      text: "Dev box terminated.",
      ts: Date.now(),
    });
    return null;
  },
});

export const markFailed = internalMutation({
  args: { boxId: v.string(), error: v.string() },
  handler: async (ctx, args): Promise<null> => {
    const box = await byBoxId(ctx, args.boxId);
    if (!box) return null;
    // A box that never launched must not leave its task hanging until the
    // deadline: provisioning failures are known instantly and settle instantly.
    if (box.missionTaskId) {
      await settleTaskFromBox(ctx, box.missionTaskId, {
        boxId: box.boxId,
        repoUrl: box.repoUrl,
        prUrl: box.prUrl,
        error: `dev box failed: ${args.error.slice(0, 200)}`,
      });
    }
    await ctx.db.patch(box._id, {
      status: "failed",
      error: args.error.slice(0, 500),
      updatedAt: Date.now(),
      callbackSecretHash: "", // revoke the box's callback credential on failure
    });
    await ctx.db.insert("agentEvents", {
      companyId: box.companyId,
      agentKey: BOX_EVENT_KEY,
      kind: "status",
      text: `Dev box failed: ${args.error.slice(0, 200)}`,
      ts: Date.now(),
    });
    return null;
  },
});
