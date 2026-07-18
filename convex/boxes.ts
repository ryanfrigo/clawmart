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

function boxId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return "box_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
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
    // repo. Only repos on the server allowlist are permitted.
    const allow = (process.env.CLAWMART_BOX_REPO_ALLOWLIST ?? "")
      .split(",").map((s) => s.trim()).filter(Boolean);
    const repoUrl = (args.repoUrl ?? allow[0] ?? "").trim();
    if (!repoUrl) throw new ConvexError("no_repo_configured");
    if (allow.length && !allow.includes(repoUrl)) throw new ConvexError("repo_not_allowed");

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
    const baseBranch = (args.baseBranch ?? DEFAULT_BASE_BRANCH).trim();
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

/** Called by the /box/event httpAction after it validates the box secret. */
export const recordBoxEvent = internalMutation({
  args: {
    boxId: v.string(),
    kind: v.union(v.literal("status"), v.literal("output")),
    text: v.string(),
  },
  handler: async (ctx, args): Promise<null> => {
    const box = await ctx.db
      .query("devBoxes")
      .withIndex("by_box", (q) => q.eq("boxId", args.boxId))
      .first();
    if (!box) return null;
    await ctx.db.insert("agentEvents", {
      companyId: box.companyId,
      agentKey: BOX_EVENT_KEY,
      kind: args.kind,
      text: args.text.slice(0, 2000),
      ts: Date.now(),
    });
    return null;
  },
});

export const markTerminated = internalMutation({
  args: { boxId: v.string() },
  handler: async (ctx, args): Promise<null> => {
    const box = await ctx.db
      .query("devBoxes")
      .withIndex("by_box", (q) => q.eq("boxId", args.boxId))
      .first();
    if (!box) return null;
    await ctx.db.patch(box._id, {
      status: "terminated",
      terminatedAt: Date.now(),
      updatedAt: Date.now(),
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
    const box = await ctx.db
      .query("devBoxes")
      .withIndex("by_box", (q) => q.eq("boxId", args.boxId))
      .first();
    if (!box) return null;
    await ctx.db.patch(box._id, {
      status: "failed",
      error: args.error.slice(0, 500),
      updatedAt: Date.now(),
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
