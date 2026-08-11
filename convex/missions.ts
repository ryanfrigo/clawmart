/**
 * Clawmart Agency — mission control (DB + auth layer).
 *
 * A mission points the whole roster (convex/lib/roster.ts) at one goal. An
 * orchestrator plans a task DAG, then tasks execute in parallel waves: each
 * settled task ticks the mission, which claims whatever just became ready.
 *
 * This module owns state and authorization only; the model calls live in the
 * action convex/missionEngine.ts, which this module schedules. That split is the
 * same one companies.ts/agents.ts and boxes.ts/provisioning.ts already use.
 *
 * Mission events are written into the existing `agentEvents` table keyed by
 * companyId, so the live feed in /studio/[id] shows mission progress with no
 * changes to the feed itself.
 */
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import type { Auth } from "convex/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { boxDeadlineMs, boxTaskEnvelope } from "./lib/boxevents";
import {
  getAgent,
  MAX_COMPANY_MEMORY,
  MAX_CONCURRENT_TASKS,
  MAX_MEMORY_LEARNINGS,
  MAX_TASKS,
  MEMORY_TEXT_MAX,
  renderMemory,
} from "./lib/roster";
import { nextCooldownMs } from "./lib/router";

const GOAL_MIN = 12;
const GOAL_MAX = 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_ACTIVE_MISSIONS_PER_COMPANY = 2;
const MAX_MISSIONS_PER_USER_PER_DAY = 8;
const MAX_MISSIONS_GLOBAL_PER_DAY = 60;

/** How many tasks of one mission may be in flight at once. Defined in
 *  lib/roster.ts (pure, so the UI can render it too); re-exported here because
 *  the engine and its tests reason about it under this name. */
export { MAX_CONCURRENT_TASKS };

/** A mission with no progress for this long is closed by the watchdog. */
const MISSION_STALE_MS = 15 * 60 * 1000;

const EVENT_KEY = "agency";

/**
 * The signed-in owner key, or throw. Same contract as companies.requireUser:
 * `getAuthUserId`, never `identity.subject` — Convex Auth's `sub` claim is
 * "<userId>|<sessionId>" and rotates every session (convex/auth.ts).
 */
async function requireIdentity(ctx: { auth: Auth }) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new ConvexError("unauthenticated");
  return { subject: userId };
}

/** Same sliding-window limiter as companies.bumpRateLimit (kept local — surgical). */
async function bumpRateLimit(ctx: MutationCtx, key: string, windowMs: number, max: number) {
  const now = Date.now();
  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  if (!existing || now - existing.windowStart > windowMs) {
    if (existing) await ctx.db.patch(existing._id, { windowStart: now, count: 1 });
    else await ctx.db.insert("rateLimits", { key, windowStart: now, count: 1 });
  } else if (existing.count >= max) {
    throw new ConvexError("rate_limited");
  } else {
    await ctx.db.patch(existing._id, { count: existing.count + 1 });
  }
}

async function event(
  ctx: MutationCtx,
  companyId: Id<"companies">,
  agentKey: string,
  kind: "status" | "output",
  text: string
) {
  await ctx.db.insert("agentEvents", {
    companyId,
    agentKey,
    kind,
    text: text.slice(0, 2000),
    ts: Date.now(),
  });
}

/** Short company context string every agent on the mission receives. */
async function companyBrief(ctx: QueryCtx, company: Doc<"companies">): Promise<string> {
  const parts = [`${company.name}${company.tagline ? ` — ${company.tagline}` : ""}`, company.idea];
  const plan = await ctx.db
    .query("companyAssets")
    .withIndex("by_company_kind", (q) => q.eq("companyId", company._id).eq("kind", "plan"))
    .first();
  if (plan) {
    try {
      const parsed = JSON.parse(plan.json) as { positioning?: unknown };
      if (typeof parsed.positioning === "string") parts.push(`Positioning: ${parsed.positioning}`);
    } catch {
      // A malformed stored asset must not block a mission — context is optional.
    }
  }
  return parts.join("\n").slice(0, 2000);
}

/**
 * What earlier missions taught the army about this company, budgeted for a
 * prompt. Newest first: renderMemory drops whole lines off the end, so a
 * company at the row cap sheds its oldest learnings, never its freshest.
 */
async function companyMemory(ctx: QueryCtx, companyId: Id<"companies">): Promise<string> {
  const rows = await ctx.db
    .query("companyMemory")
    .withIndex("by_company", (q) => q.eq("companyId", companyId))
    .order("desc")
    .take(MAX_COMPANY_MEMORY);
  return renderMemory(rows.map((r) => r.text));
}

// ---------------------------------------------------------------------------
// Public mutations
// ---------------------------------------------------------------------------

/** Dispatch the roster at a goal. Owner-only, live companies only, rate-limited. */
export const startMission = mutation({
  args: {
    companyId: v.id("companies"),
    goal: v.string(),
    strategy: v.union(v.literal("free"), v.literal("balanced"), v.literal("quality")),
    // Opt in to real execution: a codeCapable specialist may be handed to a dev
    // box instead of drafting text (docs/AGENCY.md "Missions that execute").
    // Optional, defaults off, and still subject to CLAWMART_BOXES_ENABLED — with
    // the flag unset this changes nothing about how the mission runs.
    execute: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{ missionId: Id<"missions"> }> => {
    const identity = await requireIdentity(ctx);

    const goal = args.goal.trim();
    if (goal.length < GOAL_MIN || goal.length > GOAL_MAX) throw new ConvexError("invalid_goal");

    const company = await ctx.db.get(args.companyId);
    if (!company || company.ownerId !== identity.subject) throw new ConvexError("not_found");
    // A mission staffs itself from the company's plan and brand; before the
    // build lands there is nothing honest for the army to work from.
    if (company.status !== "live") throw new ConvexError("company_not_live");

    const existing = await ctx.db
      .query("missions")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
    const inFlight = existing.filter((m) => m.status === "planning" || m.status === "running");
    if (inFlight.length >= MAX_ACTIVE_MISSIONS_PER_COMPANY) {
      throw new ConvexError("too_many_active_missions");
    }

    await bumpRateLimit(
      ctx,
      `mission:user:${identity.subject}`,
      DAY_MS,
      MAX_MISSIONS_PER_USER_PER_DAY
    );
    await bumpRateLimit(ctx, "mission:global", DAY_MS, MAX_MISSIONS_GLOBAL_PER_DAY);

    const now = Date.now();
    const missionId = await ctx.db.insert("missions", {
      companyId: args.companyId,
      ownerId: identity.subject,
      goal,
      strategy: args.strategy,
      // Written only when opted in, so a normal mission row is unchanged.
      ...(args.execute === true ? { execute: true } : {}),
      status: "planning",
      taskCount: 0,
      doneCount: 0,
      failedCount: 0,
      tokensIn: 0,
      tokensOut: 0,
      createdAt: now,
      updatedAt: now,
    });

    await event(ctx, args.companyId, EVENT_KEY, "status", `New mission: ${goal}`);
    await ctx.scheduler.runAfter(0, internal.missionEngine.planMission, { missionId });
    return { missionId };
  },
});

/** Stop a mission. Running tasks finish their current call but nothing new starts. */
export const cancel = mutation({
  args: { missionId: v.id("missions") },
  handler: async (ctx, args): Promise<null> => {
    const identity = await requireIdentity(ctx);
    const mission = await ctx.db.get(args.missionId);
    if (!mission || mission.ownerId !== identity.subject) throw new ConvexError("not_found");
    if (mission.status !== "planning" && mission.status !== "running") return null;

    const now = Date.now();
    const tasks = await ctx.db
      .query("missionTasks")
      .withIndex("by_mission", (q) => q.eq("missionId", args.missionId))
      .collect();
    for (const task of tasks) {
      if (task.status === "queued") {
        await ctx.db.patch(task._id, { status: "skipped", finishedAt: now });
      }
    }

    await ctx.db.patch(args.missionId, {
      status: "cancelled",
      updatedAt: now,
      finishedAt: now,
    });
    // A mission that opted into execution may own a real EC2 instance, and
    // cancelling the mission has to stop paying for it. Scheduled rather than
    // imported so boxes.ts can keep importing this module without a cycle, and
    // gated on `execute` so a mission that never touched a box does exactly what
    // it did before this existed.
    if (mission.execute === true) {
      await ctx.scheduler.runAfter(0, internal.boxes.releaseMissionBox, {
        missionId: args.missionId,
        reason: "mission cancelled",
      });
    }
    await event(ctx, mission.companyId, EVENT_KEY, "status", "Mission cancelled by owner.");
    return null;
  },
});

/**
 * Delete one learning. Owner-only.
 *
 * Memory is injected into every future mission for the company, so a wrong
 * learning compounds — it must be removable by hand, or it quietly poisons
 * every plan and every brief from here on.
 */
export const forgetMemory = mutation({
  args: { memoryId: v.id("companyMemory") },
  handler: async (ctx, args): Promise<null> => {
    const identity = await requireIdentity(ctx);
    const row = await ctx.db.get(args.memoryId);
    // Same shape as cancel(): missing and not-yours are indistinguishable.
    if (!row) throw new ConvexError("not_found");
    const company = await ctx.db.get(row.companyId);
    if (!company || company.ownerId !== identity.subject) throw new ConvexError("not_found");
    await ctx.db.delete(args.memoryId);
    return null;
  },
});

// ---------------------------------------------------------------------------
// Public queries
// ---------------------------------------------------------------------------

export const listForCompany = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const ownerId = await getAuthUserId(ctx);
    if (ownerId === null) return [];
    const company = await ctx.db.get(args.companyId);
    if (!company || company.ownerId !== ownerId) return [];

    const missions = await ctx.db
      .query("missions")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .order("desc")
      .take(20);

    return missions.map((m) => ({
      _id: m._id,
      goal: m.goal,
      strategy: m.strategy,
      status: m.status,
      approach: m.approach,
      taskCount: m.taskCount,
      doneCount: m.doneCount,
      failedCount: m.failedCount,
      createdAt: m.createdAt,
      finishedAt: m.finishedAt,
    }));
  },
});

/** What the team has learned about this company. Owner-only, newest first. */
export const listMemory = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const ownerId = await getAuthUserId(ctx);
    if (ownerId === null) return [];
    const company = await ctx.db.get(args.companyId);
    if (!company || company.ownerId !== ownerId) return [];

    const rows = await ctx.db
      .query("companyMemory")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .order("desc")
      .take(MAX_COMPANY_MEMORY);

    return rows.map((r) => ({
      _id: r._id,
      text: r.text,
      sourceMissionId: r.sourceMissionId,
      createdAt: r.createdAt,
    }));
  },
});

/** Mission + its task board. Owner-only; returns null for anyone else. */
export const missionBoard = query({
  args: { missionId: v.id("missions") },
  handler: async (ctx, args) => {
    const ownerId = await getAuthUserId(ctx);
    if (ownerId === null) return null;
    const mission = await ctx.db.get(args.missionId);
    if (!mission || mission.ownerId !== ownerId) return null;

    const tasks = await ctx.db
      .query("missionTasks")
      .withIndex("by_mission", (q) => q.eq("missionId", args.missionId))
      .collect();

    return {
      mission: {
        _id: mission._id,
        companyId: mission.companyId,
        goal: mission.goal,
        strategy: mission.strategy,
        status: mission.status,
        approach: mission.approach,
        taskCount: mission.taskCount,
        doneCount: mission.doneCount,
        failedCount: mission.failedCount,
        tokensIn: mission.tokensIn,
        tokensOut: mission.tokensOut,
        error: mission.error,
        createdAt: mission.createdAt,
        finishedAt: mission.finishedAt,
      },
      tasks: tasks
        .sort((a, b) => a.index - b.index)
        .map((t) => {
          const agent = getAgent(t.agentKey);
          return {
            _id: t._id,
            index: t.index,
            agentKey: t.agentKey,
            agentName: agent?.name ?? t.agentKey,
            division: agent?.division ?? "operations",
            title: t.title,
            brief: t.brief,
            dependsOn: t.dependsOn,
            status: t.status,
            model: t.model,
            outputJson: t.outputJson,
            error: t.error,
            startedAt: t.startedAt,
            finishedAt: t.finishedAt,
          };
        }),
    };
  },
});

// ---------------------------------------------------------------------------
// Internal: planning
// ---------------------------------------------------------------------------

export const planContext = internalQuery({
  args: { missionId: v.id("missions") },
  handler: async (ctx, args) => {
    const mission = await ctx.db.get(args.missionId);
    if (!mission) return null;
    const company = await ctx.db.get(mission.companyId);
    if (!company) return null;
    return {
      status: mission.status,
      goal: mission.goal,
      strategy: mission.strategy,
      company: await companyBrief(ctx, company),
      memory: await companyMemory(ctx, company._id),
    };
  },
});

export const savePlan = internalMutation({
  args: {
    missionId: v.id("missions"),
    approach: v.string(),
    tasks: v.array(
      v.object({
        title: v.string(),
        agentKey: v.string(),
        brief: v.string(),
        dependsOn: v.array(v.number()),
      })
    ),
  },
  handler: async (ctx, args): Promise<null> => {
    const mission = await ctx.db.get(args.missionId);
    // Duplicate schedule, or a cancel that landed mid-plan: drop the plan.
    if (!mission || mission.status !== "planning") return null;

    const tasks = args.tasks.slice(0, MAX_TASKS);
    if (tasks.length === 0) return null;

    const now = Date.now();
    for (const [index, task] of tasks.entries()) {
      await ctx.db.insert("missionTasks", {
        missionId: args.missionId,
        companyId: mission.companyId,
        index,
        agentKey: task.agentKey,
        title: task.title,
        brief: task.brief,
        // Defence in depth: lib/roster.validatePlan already guarantees this,
        // but a forward edge here would deadlock the mission forever.
        dependsOn: task.dependsOn.filter((d) => Number.isInteger(d) && d >= 0 && d < index),
        status: "queued",
        attempt: 0,
        createdAt: now,
      });
    }

    await ctx.db.patch(args.missionId, {
      status: "running",
      approach: args.approach,
      taskCount: tasks.length,
      updatedAt: now,
    });

    const names = tasks.map((t) => getAgent(t.agentKey)?.name ?? t.agentKey).join(", ");
    await event(
      ctx,
      mission.companyId,
      EVENT_KEY,
      "status",
      `Staffed ${tasks.length} specialists: ${names}`
    );
    return null;
  },
});

export const failMission = internalMutation({
  args: { missionId: v.id("missions"), error: v.string() },
  handler: async (ctx, args): Promise<null> => {
    const mission = await ctx.db.get(args.missionId);
    if (!mission || mission.status === "done" || mission.status === "cancelled") return null;
    const now = Date.now();
    await ctx.db.patch(args.missionId, {
      status: "failed",
      error: args.error.slice(0, 500),
      updatedAt: now,
      finishedAt: now,
    });
    await event(
      ctx,
      mission.companyId,
      EVENT_KEY,
      "status",
      `Mission failed: ${args.error.slice(0, 200)}`
    );
    return null;
  },
});

// ---------------------------------------------------------------------------
// Internal: wave scheduling
// ---------------------------------------------------------------------------

/**
 * Claim the tasks that are ready to run, up to the concurrency cap.
 *
 * Transactional, so two concurrent ticks cannot claim the same task. Also
 * settles the mission: tasks blocked by a failed dependency are skipped, and
 * when nothing is running or claimable the mission is finalized.
 */
export const claimReadyTasks = internalMutation({
  args: { missionId: v.id("missions") },
  handler: async (ctx, args) => {
    const mission = await ctx.db.get(args.missionId);
    if (!mission || mission.status !== "running") return { claimed: [] };

    const tasks = await ctx.db
      .query("missionTasks")
      .withIndex("by_mission", (q) => q.eq("missionId", args.missionId))
      .collect();

    const byIndex = new Map(tasks.map((t) => [t.index, t]));
    const now = Date.now();

    // Cascade: a queued task whose dependency failed or was skipped can never
    // run, so settle it now rather than leaving the mission hanging.
    for (const task of tasks) {
      if (task.status !== "queued") continue;
      const blocked = task.dependsOn.some((d) => {
        const dep = byIndex.get(d);
        return !dep || dep.status === "failed" || dep.status === "skipped";
      });
      if (blocked) {
        await ctx.db.patch(task._id, { status: "skipped", finishedAt: now });
        task.status = "skipped";
      }
    }

    const running = tasks.filter((t) => t.status === "running");
    const capacity = MAX_CONCURRENT_TASKS - running.length;
    const ready =
      capacity <= 0
        ? []
        : tasks
            .filter(
              (t) =>
                t.status === "queued" &&
                t.dependsOn.every((d) => byIndex.get(d)?.status === "done")
            )
            .sort((a, b) => a.index - b.index)
            .slice(0, capacity);

    for (const task of ready) {
      await ctx.db.patch(task._id, {
        status: "running",
        attempt: task.attempt + 1,
        startedAt: now,
      });
      await event(
        ctx,
        mission.companyId,
        task.agentKey,
        "status",
        `${getAgent(task.agentKey)?.name ?? task.agentKey} started: ${task.title}`
      );
    }

    // Nothing running and nothing left to claim => the mission is settled.
    if (running.length === 0 && ready.length === 0) {
      const unsettled = tasks.some((t) => t.status === "queued" || t.status === "running");
      if (!unsettled) {
        const failed = tasks.filter((t) => t.status === "failed" || t.status === "skipped").length;
        const done = tasks.filter((t) => t.status === "done").length;
        await ctx.db.patch(args.missionId, {
          // Partial credit is the honest outcome: some specialists delivered.
          status: done > 0 ? "done" : "failed",
          doneCount: tasks.length,
          failedCount: failed,
          updatedAt: now,
          finishedAt: now,
          ...(done === 0 ? { error: "every task failed" } : {}),
        });
        await event(
          ctx,
          mission.companyId,
          EVENT_KEY,
          "status",
          done > 0
            ? `Mission complete — ${done}/${tasks.length} deliverables ready${failed ? ` (${failed} failed)` : ""}.`
            : "Mission failed — no specialist completed their task."
        );
        if (done > 0) {
          // Distill what the team learned into company memory, so the next
          // mission starts from here instead of from zero. Scheduled from
          // inside this transactional settle, and the patch above takes the
          // mission out of "running", so it fires exactly once per mission
          // however many ticks race. Best-effort by design: the mission is
          // already `done` and nothing the distiller does can reopen it.
          await ctx.scheduler.runAfter(0, internal.missionEngine.distillMemory, {
            missionId: args.missionId,
          });
        }
      }
    }

    return { claimed: ready.map((t) => ({ taskId: t._id, agentKey: t.agentKey })) };
  },
});

/** Everything one task's agent needs: brief, company, and upstream handoffs. */
export const taskContext = internalQuery({
  args: { taskId: v.id("missionTasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task || task.status !== "running") return null;
    const mission = await ctx.db.get(task.missionId);
    if (!mission || mission.status !== "running") return null;
    const company = await ctx.db.get(task.companyId);
    if (!company) return null;

    const siblings = await ctx.db
      .query("missionTasks")
      .withIndex("by_mission", (q) => q.eq("missionId", task.missionId))
      .collect();
    const byIndex = new Map(siblings.map((t) => [t.index, t]));

    const upstream = task.dependsOn
      .map((d) => byIndex.get(d))
      .filter((t): t is Doc<"missionTasks"> => !!t && t.status === "done")
      .map((t) => ({
        agent: getAgent(t.agentKey)?.name ?? t.agentKey,
        title: t.title,
        handoff: t.handoff ?? "",
      }));

    return {
      missionId: task.missionId, // the engine ticks the mission after settling
      goal: mission.goal,
      strategy: mission.strategy,
      // Did the owner opt this mission into real execution? The engine still has
      // to clear boxes.claimBoxForTask (feature flag, allowlist, rate limits,
      // one box per mission) before anything is dispatched.
      execute: mission.execute === true,
      agentKey: task.agentKey,
      title: task.title,
      brief: task.brief,
      company: await companyBrief(ctx, company),
      upstream,
      memory: await companyMemory(ctx, task.companyId),
    };
  },
});

/**
 * Mark one running task delivered and roll its numbers into the mission.
 *
 * Extracted so the model path (completeTask) and the dev-box path
 * (settleTaskFromBox) share exactly one definition of "delivered" — two copies
 * would drift on the mission counters, which are what claimReadyTasks settles
 * the whole mission from.
 */
async function markTaskDone(
  ctx: MutationCtx,
  task: Doc<"missionTasks">,
  result: {
    outputJson: string;
    summary: string;
    handoff: string;
    model: string;
    tokensIn?: number;
    tokensOut?: number;
  }
): Promise<void> {
  await ctx.db.patch(task._id, {
    status: "done",
    outputJson: result.outputJson,
    handoff: result.handoff,
    model: result.model,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    finishedAt: Date.now(),
  });

  const mission = await ctx.db.get(task.missionId);
  if (mission) {
    await ctx.db.patch(task.missionId, {
      doneCount: mission.doneCount + 1,
      tokensIn: mission.tokensIn + (result.tokensIn ?? 0),
      tokensOut: mission.tokensOut + (result.tokensOut ?? 0),
      updatedAt: Date.now(),
    });
  }

  await event(
    ctx,
    task.companyId,
    task.agentKey,
    "output",
    `${getAgent(task.agentKey)?.name ?? task.agentKey}: ${result.summary}`
  );
}

/** The failure twin of markTaskDone. Same reason for existing. */
async function markTaskFailed(
  ctx: MutationCtx,
  task: Doc<"missionTasks">,
  error: string
): Promise<void> {
  await ctx.db.patch(task._id, {
    status: "failed",
    error: error.slice(0, 500),
    finishedAt: Date.now(),
  });

  const mission = await ctx.db.get(task.missionId);
  if (mission) {
    await ctx.db.patch(task.missionId, {
      doneCount: mission.doneCount + 1,
      failedCount: mission.failedCount + 1,
      updatedAt: Date.now(),
    });
  }

  await event(
    ctx,
    task.companyId,
    task.agentKey,
    "status",
    `${getAgent(task.agentKey)?.name ?? task.agentKey} failed: ${error.slice(0, 160)}`
  );
}

export const completeTask = internalMutation({
  args: {
    taskId: v.id("missionTasks"),
    outputJson: v.string(),
    summary: v.string(),
    handoff: v.string(),
    model: v.string(),
    tokensIn: v.optional(v.number()),
    tokensOut: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<null> => {
    const task = await ctx.db.get(args.taskId);
    if (!task || task.status !== "running") return null;
    await markTaskDone(ctx, task, args);
    return null;
  },
});

export const failTask = internalMutation({
  args: { taskId: v.id("missionTasks"), error: v.string() },
  handler: async (ctx, args): Promise<null> => {
    const task = await ctx.db.get(args.taskId);
    if (!task || task.status !== "running") return null;
    await markTaskFailed(ctx, task, args.error);
    return null;
  },
});

// ---------------------------------------------------------------------------
// Internal: the dev-box bridge (called from boxes.ts, same transaction)
// ---------------------------------------------------------------------------

/**
 * Settle a task that was dispatched to a dev box, from whatever the box did.
 *
 * Called directly (not scheduled) by every path in boxes.ts that learns a box's
 * fate: the harness's terminal event, a provisioning failure, termination, and
 * the deadline mutation. In-transaction and idempotent — the FIRST caller to
 * find the task still `running` settles it and the rest are no-ops, so the
 * "box terminated" path can never overwrite a pull request the box already
 * reported, in either arrival order.
 *
 * A box that reported no pull request FAILS its task. That is the honest
 * outcome: the skip cascade then settles anything downstream instead of letting
 * a dependent specialist build on work that does not exist, and partial credit
 * still lets the rest of the mission finish `done`.
 */
export async function settleTaskFromBox(
  ctx: MutationCtx,
  taskId: Id<"missionTasks">,
  outcome: { boxId: string; repoUrl: string; prUrl?: string; error?: string }
): Promise<void> {
  const task = await ctx.db.get(taskId);
  if (!task || task.status !== "running") return;

  if (outcome.prUrl) {
    const envelope = boxTaskEnvelope({
      boxId: outcome.boxId,
      repoUrl: outcome.repoUrl,
      prUrl: outcome.prUrl,
      title: task.title,
    });
    await markTaskDone(ctx, task, {
      outputJson: JSON.stringify(envelope),
      summary: envelope.summary,
      handoff: envelope.handoff,
      // Not a model id: the box picks its own model (CLAWMART_BOX_MODEL) and
      // never reports it on a channel we would trust. Naming the executor is
      // more useful to the owner than guessing at the model anyway.
      model: "dev box",
    });
  } else {
    await markTaskFailed(ctx, task, outcome.error ?? "the dev box opened no pull request");
  }

  // Tick regardless of outcome: this task was holding a concurrency slot and may
  // be the last thing between the mission and being settled.
  await ctx.scheduler.runAfter(0, internal.missionEngine.tick, { missionId: task.missionId });
}

/**
 * Heartbeat a mission from its box's progress: a box event IS mission progress,
 * so it should reset the stale-mission clock like any other.
 *
 * Defence in depth rather than the main protection — failStaleMissions already
 * skips a mission whose box is inside its deadline (hasLiveBox), because a box
 * can legitimately go many minutes between events. This keeps `updatedAt`
 * honest for the UI and covers the gap where the box row has gone inactive but
 * events are still arriving.
 *
 * It cannot keep a mission alive forever: boxes.expireMissionBox settles the
 * task at the box's own deadline however chatty the box was.
 */
export async function touchMission(
  ctx: MutationCtx,
  missionId: Id<"missions">
): Promise<void> {
  const mission = await ctx.db.get(missionId);
  if (!mission || mission.status !== "running") return;
  await ctx.db.patch(missionId, { updatedAt: Date.now() });
}

// ---------------------------------------------------------------------------
// Internal: company memory
// ---------------------------------------------------------------------------

/** What the distiller reads: the goal, the company, and every handoff kept. */
export const missionOutcome = internalQuery({
  args: { missionId: v.id("missions") },
  handler: async (ctx, args) => {
    const mission = await ctx.db.get(args.missionId);
    // Only a settled, successful mission has anything to learn from.
    if (!mission || mission.status !== "done") return null;
    const company = await ctx.db.get(mission.companyId);
    if (!company) return null;

    const tasks = await ctx.db
      .query("missionTasks")
      .withIndex("by_mission", (q) => q.eq("missionId", args.missionId))
      .collect();

    const deliverables = tasks
      .filter((t) => t.status === "done" && !!t.handoff)
      .sort((a, b) => a.index - b.index)
      .map((t) => ({
        agent: getAgent(t.agentKey)?.name ?? t.agentKey,
        title: t.title,
        handoff: t.handoff ?? "",
      }));
    if (deliverables.length === 0) return null;

    return {
      goal: mission.goal,
      strategy: mission.strategy,
      company: await companyBrief(ctx, company),
      deliverables,
    };
  },
});

/**
 * File distilled learnings against the company, oldest rows evicted.
 *
 * The cap is enforced on write rather than on read: memory is injected into
 * every future prompt, so an unbounded table would be an unbounded cost, not
 * just an unbounded row count.
 */
export const rememberLearnings = internalMutation({
  args: { missionId: v.id("missions"), learnings: v.array(v.string()) },
  handler: async (ctx, args): Promise<null> => {
    const mission = await ctx.db.get(args.missionId);
    if (!mission) return null;

    const existing = await ctx.db
      .query("companyMemory")
      .withIndex("by_company", (q) => q.eq("companyId", mission.companyId))
      .collect();
    // Missions on one company overlap heavily, so the same conclusion gets
    // re-derived often. Storing it twice would just spend the cap twice.
    const seen = new Set(existing.map((r) => r.text.trim().toLowerCase()));

    const now = Date.now();
    let stored = 0;
    for (const raw of args.learnings.slice(0, MAX_MEMORY_LEARNINGS)) {
      const text = raw.trim().replace(/\s+/g, " ").slice(0, MEMORY_TEXT_MAX);
      if (!text || seen.has(text.toLowerCase())) continue;
      seen.add(text.toLowerCase());
      await ctx.db.insert("companyMemory", {
        companyId: mission.companyId,
        text,
        sourceMissionId: args.missionId,
        createdAt: now,
        updatedAt: now,
      });
      stored += 1;
    }
    if (stored === 0) return null;

    const rows = await ctx.db
      .query("companyMemory")
      .withIndex("by_company", (q) => q.eq("companyId", mission.companyId))
      .order("desc")
      .collect();
    for (const row of rows.slice(MAX_COMPANY_MEMORY)) {
      await ctx.db.delete(row._id);
    }

    await event(
      ctx,
      mission.companyId,
      EVENT_KEY,
      "status",
      `Filed ${stored} learning${stored === 1 ? "" : "s"} to company memory.`
    );
    return null;
  },
});

// ---------------------------------------------------------------------------
// Internal: model circuit breaker (lib/router.ts)
// ---------------------------------------------------------------------------

export const cooledDownModels = internalQuery({
  args: {},
  handler: async (ctx): Promise<string[]> => {
    const now = Date.now();
    const rows = await ctx.db.query("modelHealth").collect();
    return rows.filter((r) => r.cooldownUntil > now).map((r) => r.model);
  },
});

export const reportModelResult = internalMutation({
  args: {
    model: v.string(),
    ok: v.boolean(),
    cooldownMs: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<null> => {
    const now = Date.now();
    const existing = await ctx.db
      .query("modelHealth")
      .withIndex("by_model", (q) => q.eq("model", args.model))
      .first();

    if (args.ok) {
      if (existing) {
        await ctx.db.patch(existing._id, { failures: 0, cooldownUntil: 0, updatedAt: now });
      }
      return null;
    }

    const failures = (existing?.failures ?? 0) + 1;
    // The failure count lives here, so the backoff is computed here. A caller
    // may override it — a 429's Retry-After is more authoritative than our
    // exponential guess. A hint of 0 is NOT an override: `Retry-After: 0`, a
    // past HTTP date, or a negative value would otherwise set cooldownUntil to
    // now and disable the breaker for exactly the endpoint that just rate-
    // limited us (`??` does not fall through on 0).
    const hint = args.cooldownMs && args.cooldownMs > 0 ? args.cooldownMs : undefined;
    const cooldownUntil = now + (hint ?? nextCooldownMs(failures));
    if (existing) {
      await ctx.db.patch(existing._id, {
        failures,
        cooldownUntil,
        lastError: args.error?.slice(0, 300),
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("modelHealth", {
        model: args.model,
        failures,
        cooldownUntil,
        lastError: args.error?.slice(0, 300),
        updatedAt: now,
      });
    }
    return null;
  },
});

// ---------------------------------------------------------------------------
// Watchdog
// ---------------------------------------------------------------------------

/**
 * Is this mission's dev box still within the deadline it was dispatched under?
 *
 * Reads devBoxes, which boxes.ts owns, because the alternative is importing that
 * module here and closing the import cycle boxes.ts → missions.ts. Only ever
 * called for a mission that opted into execution, so a normal mission does not
 * pay for the query.
 */
async function hasLiveBox(ctx: MutationCtx, missionId: Id<"missions">): Promise<boolean> {
  const cutoff = Date.now() - boxDeadlineMs();
  const boxes = await ctx.db
    .query("devBoxes")
    .withIndex("by_mission", (q) => q.eq("missionId", missionId))
    .collect();
  return boxes.some(
    (b) => (b.status === "provisioning" || b.status === "running") && b.createdAt > cutoff
  );
}

/**
 * A crashed action leaves a mission stuck in planning/running, which would hold
 * the per-company active-mission slot forever. Close anything with no progress
 * for MISSION_STALE_MS. Indexed by status — never a table scan.
 */
export const failStaleMissions = internalMutation({
  args: {},
  handler: async (ctx): Promise<null> => {
    const cutoff = Date.now() - MISSION_STALE_MS;
    for (const status of ["planning", "running"] as const) {
      const candidates = await ctx.db
        .query("missions")
        .withIndex("by_status", (q) => q.eq("status", status))
        .take(50);
      for (const mission of candidates) {
        if (mission.updatedAt > cutoff) continue;
        // A mission whose dev box is still inside its own deadline is NOT
        // stalled. A box legitimately runs silent for long stretches — its
        // verification gate alone allows 15 minutes for install and 10 per step
        // (infra/agent/harness/verify.py) — and it only reports progress between
        // them. Closing the mission here would fail a task whose executor is
        // still working, and would do it on every slow repository.
        //
        // This cannot hold a mission open indefinitely: boxes.claimBoxForTask
        // schedules boxes.expireMissionBox at exactly this deadline, which
        // settles the task and terminates the box, and the EC2 instance
        // self-terminates on its own timer regardless.
        if (mission.execute === true && (await hasLiveBox(ctx, mission._id))) continue;
        const now = Date.now();
        const tasks = await ctx.db
          .query("missionTasks")
          .withIndex("by_mission", (q) => q.eq("missionId", mission._id))
          .collect();
        const done = tasks.filter((t) => t.status === "done").length;
        for (const task of tasks) {
          if (task.status === "queued" || task.status === "running") {
            await ctx.db.patch(task._id, {
              status: "failed",
              error: "mission stalled",
              finishedAt: now,
            });
          }
        }
        await ctx.db.patch(mission._id, {
          status: done > 0 ? "done" : "failed",
          error: done > 0 ? undefined : "mission stalled with no completed tasks",
          doneCount: tasks.length,
          failedCount: tasks.length - done,
          updatedAt: now,
          finishedAt: now,
        });
        // A stalled mission that owned a box is the case where an instance is
        // most likely still burning money with nobody watching it. Same gate as
        // cancel(): only missions that opted into execution do anything here.
        if (mission.execute === true) {
          await ctx.scheduler.runAfter(0, internal.boxes.releaseMissionBox, {
            missionId: mission._id,
            reason: "mission stalled",
          });
        }
        await event(
          ctx,
          mission.companyId,
          EVENT_KEY,
          "status",
          done > 0
            ? `Mission closed after a stall — ${done} deliverables kept.`
            : "Mission stalled and was closed."
        );
      }
    }
    return null;
  },
});
