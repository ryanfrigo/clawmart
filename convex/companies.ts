/**
 * Company Studio — companies, builds, and the read surface for the UI.
 *
 * Public surface (Clerk-auth'd unless noted):
 * - api.companies.create        create a company from an idea and start the build
 * - api.companies.rebuild       re-run a finished/failed build
 * - api.companies.listMine      dashboard list
 * - api.companies.get           owner-only company doc
 * - api.companies.buildState    owner-only runs + events + assets (live feed)
 * - api.companies.getPublicBySlug  UNAUTHENTICATED — powers /c/[slug]
 *
 * The engine's state transitions (markRunning / completeStep / failStep) are
 * internal and only reachable from convex/agents.ts.
 */

import { v, ConvexError } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { PIPELINE, AGENTS, slugify, slugSuffix, type AgentKey } from "./lib/agents";

const MAX_COMPANIES_PER_USER = 3;
const IDEA_MIN = 20;
const IDEA_MAX = 2000;

// Global cost guardrail: builds per rolling day across ALL users.
const BUILD_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_BUILDS_PER_DAY_GLOBAL = 40;
const MAX_BUILDS_PER_DAY_USER = 10;

async function requireUser(ctx: { auth: { getUserIdentity(): Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("unauthenticated");
  return identity.subject;
}

/** Same sliding-window pattern as purchases.createPending. */
async function bumpRateLimit(
  ctx: MutationCtx,
  key: string,
  windowMs: number,
  max: number
): Promise<void> {
  const now = Date.now();
  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  if (!existing || now - existing.windowStart > windowMs) {
    if (existing) {
      await ctx.db.patch(existing._id, { windowStart: now, count: 1 });
    } else {
      await ctx.db.insert("rateLimits", { key, windowStart: now, count: 1 });
    }
  } else if (existing.count >= max) {
    throw new ConvexError("rate_limited");
  } else {
    await ctx.db.patch(existing._id, { count: existing.count + 1 });
  }
}

async function uniqueSlug(ctx: MutationCtx, base: string): Promise<string> {
  let candidate = base;
  for (let i = 0; i < 5; i++) {
    const clash = await ctx.db
      .query("companies")
      .withIndex("by_slug", (q) => q.eq("slug", candidate))
      .first();
    if (!clash) return candidate;
    candidate = `${base}-${slugSuffix()}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** Reset run/event state and schedule step 0. Caller has already authorized. */
async function beginBuild(ctx: MutationCtx, company: Doc<"companies">): Promise<void> {
  await bumpRateLimit(
    ctx,
    "studio-builds:global",
    BUILD_WINDOW_MS,
    MAX_BUILDS_PER_DAY_GLOBAL
  );
  await bumpRateLimit(
    ctx,
    `studio-builds:user:${company.ownerId}`,
    BUILD_WINDOW_MS,
    MAX_BUILDS_PER_DAY_USER
  );

  const oldRuns = await ctx.db
    .query("agentRuns")
    .withIndex("by_company", (q) => q.eq("companyId", company._id))
    .collect();
  for (const run of oldRuns) await ctx.db.delete(run._id);
  const oldEvents = await ctx.db
    .query("agentEvents")
    .withIndex("by_company", (q) => q.eq("companyId", company._id))
    .collect();
  for (const ev of oldEvents) await ctx.db.delete(ev._id);

  const now = Date.now();
  for (const key of PIPELINE) {
    await ctx.db.insert("agentRuns", {
      companyId: company._id,
      agentKey: key,
      status: "queued",
      model: AGENTS[key].model,
      attempt: 0,
      createdAt: now,
    });
  }
  await ctx.db.patch(company._id, { status: "building", updatedAt: now });
  await ctx.db.insert("agentEvents", {
    companyId: company._id,
    agentKey: "strategist",
    kind: "status",
    text: "Founding team assembled — build started.",
    ts: now,
  });
  await ctx.scheduler.runAfter(0, internal.agents.runStep, {
    companyId: company._id,
    stepIndex: 0,
  });
}

// ---------------------------------------------------------------------------
// Public mutations
// ---------------------------------------------------------------------------

export const create = mutation({
  args: { idea: v.string() },
  handler: async (ctx, args): Promise<{ companyId: Id<"companies">; slug: string }> => {
    const ownerId = await requireUser(ctx);

    const idea = args.idea.trim();
    if (idea.length < IDEA_MIN) throw new ConvexError("idea_too_short");
    if (idea.length > IDEA_MAX) throw new ConvexError("idea_too_long");

    const mine = await ctx.db
      .query("companies")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect();
    if (mine.length >= MAX_COMPANIES_PER_USER) {
      throw new ConvexError("company_limit");
    }

    const now = Date.now();
    const slug = await uniqueSlug(ctx, `co-${slugSuffix()}${slugSuffix()}`);
    const companyId = await ctx.db.insert("companies", {
      ownerId,
      slug,
      idea,
      name: "Unnamed company",
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
    const company = await ctx.db.get(companyId);
    if (!company) throw new ConvexError("not_found");
    await beginBuild(ctx, company);
    return { companyId, slug };
  },
});

export const rebuild = mutation({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args): Promise<null> => {
    const ownerId = await requireUser(ctx);
    const company = await ctx.db.get(args.companyId);
    if (!company || company.ownerId !== ownerId) throw new ConvexError("not_found");
    if (company.status === "building") throw new ConvexError("build_in_progress");
    await beginBuild(ctx, company);
    return null;
  },
});

// ---------------------------------------------------------------------------
// Public queries
// ---------------------------------------------------------------------------

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const rows = await ctx.db
      .query("companies")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .collect();
    return rows
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((c) => ({
        _id: c._id,
        slug: c.slug,
        name: c.name,
        tagline: c.tagline,
        status: c.status,
        idea: c.idea,
        createdAt: c.createdAt,
      }));
  },
});

export const get = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const company = await ctx.db.get(args.companyId);
    if (!company || company.ownerId !== identity.subject) return null;
    return company;
  },
});

/** Everything /studio/[id] needs, in one reactive query. Owner-only. */
export const buildState = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const company = await ctx.db.get(args.companyId);
    if (!company || company.ownerId !== identity.subject) return null;

    const runs = await ctx.db
      .query("agentRuns")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
    const events = await ctx.db
      .query("agentEvents")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
    const assets = await ctx.db
      .query("companyAssets")
      .withIndex("by_company_kind", (q) => q.eq("companyId", args.companyId))
      .collect();

    return {
      company,
      runs: PIPELINE.map((key) => runs.find((r) => r.agentKey === key) ?? null),
      events: events.sort((a, b) => a.ts - b.ts).slice(-200),
      assets: Object.fromEntries(assets.map((a) => [a.kind, a.json])),
    };
  },
});

/**
 * UNAUTHENTICATED — powers the public /c/[slug] page. Safe fields only.
 *
 * Serves the landing whenever a landing asset EXISTS, not just when status is
 * "live": assets are only overwritten on successful steps, so a failed or
 * in-progress REBUILD keeps the previously shared page up instead of demoting
 * it to a holding stub. First builds have no assets yet → holding page.
 */
export const getPublicBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const company = await ctx.db
      .query("companies")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!company) return null;

    const assets = await ctx.db
      .query("companyAssets")
      .withIndex("by_company_kind", (q) => q.eq("companyId", company._id))
      .collect();
    const byKind = Object.fromEntries(assets.map((a) => [a.kind, a.json]));
    return {
      name: company.name,
      tagline: company.tagline ?? null,
      status: company.status,
      landing: byKind["landing"] ?? null,
      brand: byKind["brand"] ?? null,
    };
  },
});

export const remove = mutation({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args): Promise<null> => {
    const ownerId = await requireUser(ctx);
    const company = await ctx.db.get(args.companyId);
    if (!company || company.ownerId !== ownerId) throw new ConvexError("not_found");
    // Any still-scheduled runStep no-ops once these rows are gone
    // (getStepContext returns null for a missing company/run).
    const runs = await ctx.db
      .query("agentRuns")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
    for (const row of runs) await ctx.db.delete(row._id);
    const events = await ctx.db
      .query("agentEvents")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
    for (const row of events) await ctx.db.delete(row._id);
    const assets = await ctx.db
      .query("companyAssets")
      .withIndex("by_company_kind", (q) => q.eq("companyId", args.companyId))
      .collect();
    for (const row of assets) await ctx.db.delete(row._id);
    await ctx.db.delete(args.companyId);
    return null;
  },
});

// ---------------------------------------------------------------------------
// Internal — engine state transitions (called only from convex/agents.ts)
// ---------------------------------------------------------------------------

export const getStepContext = internalQuery({
  args: { companyId: v.id("companies"), stepIndex: v.number() },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) return null;
    const key = PIPELINE[args.stepIndex];
    if (!key) return null;
    const run = (
      await ctx.db
        .query("agentRuns")
        .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
        .collect()
    ).find((r) => r.agentKey === key);
    if (!run) return null;
    const assets = await ctx.db
      .query("companyAssets")
      .withIndex("by_company_kind", (q) => q.eq("companyId", args.companyId))
      .collect();
    return {
      idea: company.idea,
      run: { _id: run._id, status: run.status, attempt: run.attempt },
      assets: Object.fromEntries(assets.map((a) => [a.kind, a.json])) as Partial<
        Record<AgentKey, string>
      >,
    };
  },
});

export const markRunning = internalMutation({
  args: {
    companyId: v.id("companies"),
    runId: v.id("agentRuns"),
    agentKey: v.string(),
    attempt: v.number(),
    title: v.string(),
    model: v.string(),
  },
  handler: async (ctx, args): Promise<null> => {
    await ctx.db.patch(args.runId, {
      status: "running",
      attempt: args.attempt,
      startedAt: Date.now(),
    });
    await ctx.db.insert("agentEvents", {
      companyId: args.companyId,
      agentKey: args.agentKey,
      kind: "status",
      text:
        args.attempt > 1
          ? `${args.title} retrying (${args.model})…`
          : `${args.title} working (${args.model})…`,
      ts: Date.now(),
    });
    return null;
  },
});

export const completeStep = internalMutation({
  args: {
    companyId: v.id("companies"),
    runId: v.id("agentRuns"),
    stepIndex: v.number(),
    outputJson: v.string(),
    preview: v.string(),
    tokensIn: v.optional(v.number()),
    tokensOut: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<null> => {
    const run = await ctx.db.get(args.runId);
    // Idempotency: a replayed/duplicate schedule is a no-op.
    if (!run || run.status !== "running") return null;
    const company = await ctx.db.get(args.companyId);
    if (!company) return null;

    const key = PIPELINE[args.stepIndex];
    const now = Date.now();

    const existing = await ctx.db
      .query("companyAssets")
      .withIndex("by_company_kind", (q) =>
        q.eq("companyId", args.companyId).eq("kind", key)
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { json: args.outputJson, updatedAt: now });
    } else {
      await ctx.db.insert("companyAssets", {
        companyId: args.companyId,
        kind: key,
        json: args.outputJson,
        updatedAt: now,
      });
    }

    await ctx.db.patch(args.runId, {
      status: "done",
      finishedAt: now,
      tokensIn: args.tokensIn,
      tokensOut: args.tokensOut,
    });

    // The brand step names the company and settles its public slug — once.
    // A locked slug never changes on rebuild: shared /c/ links must not rot.
    if (key === "brand") {
      try {
        const brand = JSON.parse(args.outputJson) as {
          name?: string;
          tagline?: string;
        };
        if (brand.name && typeof brand.name === "string") {
          const patch: Partial<Doc<"companies">> = {
            name: brand.name.slice(0, 80),
            tagline:
              typeof brand.tagline === "string"
                ? brand.tagline.slice(0, 160)
                : company.tagline,
            updatedAt: now,
          };
          if (!company.slugLocked) {
            patch.slug = await uniqueSlug(ctx, slugify(brand.name));
            patch.slugLocked = true;
          }
          await ctx.db.patch(args.companyId, patch);
        }
      } catch {
        // keep provisional name — never fail the build over branding metadata
      }
    }

    await ctx.db.insert("agentEvents", {
      companyId: args.companyId,
      agentKey: key,
      kind: "output",
      text: args.preview,
      ts: now,
    });

    const nextIndex = args.stepIndex + 1;
    if (nextIndex < PIPELINE.length) {
      await ctx.scheduler.runAfter(0, internal.agents.runStep, {
        companyId: args.companyId,
        stepIndex: nextIndex,
      });
    } else {
      await ctx.db.patch(args.companyId, { status: "live", updatedAt: now });
      await ctx.db.insert("agentEvents", {
        companyId: args.companyId,
        agentKey: key,
        kind: "status",
        text: "Build complete — your company page is live.",
        ts: now,
      });
    }
    return null;
  },
});

/**
 * Watchdog (crons.ts): a "building" company with no run activity for this long
 * has a crashed pipeline (deploy mid-build, action death). Mark it failed so
 * the owner can rebuild — otherwise rebuild's build_in_progress guard bricks
 * the company forever.
 */
const BUILD_STALE_MS = 10 * 60 * 1000;

export const failStaleBuilds = internalMutation({
  args: {},
  handler: async (ctx): Promise<null> => {
    const cutoff = Date.now() - BUILD_STALE_MS;
    const building = (
      await ctx.db
        .query("companies")
        .filter((q) => q.eq(q.field("status"), "building"))
        .collect()
    ).filter((c) => c.updatedAt < cutoff);

    for (const company of building) {
      const runs = await ctx.db
        .query("agentRuns")
        .withIndex("by_company", (q) => q.eq("companyId", company._id))
        .collect();
      const lastActivity = Math.max(
        company.updatedAt,
        ...runs.map((r) => Math.max(r.createdAt, r.startedAt ?? 0, r.finishedAt ?? 0))
      );
      if (lastActivity >= cutoff) continue;

      const now = Date.now();
      const activeKey =
        runs.find((r) => r.status === "running")?.agentKey ??
        runs.find((r) => r.status === "queued")?.agentKey ??
        "strategist";
      for (const r of runs) {
        if (r.status === "queued" || r.status === "running") {
          await ctx.db.patch(r._id, {
            status: "failed",
            error: "build stalled — stopped by watchdog",
            finishedAt: now,
          });
        }
      }
      await ctx.db.patch(company._id, { status: "failed", updatedAt: now });
      await ctx.db.insert("agentEvents", {
        companyId: company._id,
        agentKey: activeKey,
        kind: "status",
        text: "Build stalled and was stopped. You can rebuild from the dashboard.",
        ts: now,
      });
    }
    return null;
  },
});

export const failStep = internalMutation({
  args: {
    companyId: v.id("companies"),
    runId: v.id("agentRuns"),
    agentKey: v.string(),
    error: v.string(),
  },
  handler: async (ctx, args): Promise<null> => {
    const run = await ctx.db.get(args.runId);
    if (!run || run.status === "done") return null;
    const now = Date.now();
    await ctx.db.patch(args.runId, {
      status: "failed",
      error: args.error.slice(0, 500),
      finishedAt: now,
    });
    await ctx.db.patch(args.companyId, { status: "failed", updatedAt: now });
    await ctx.db.insert("agentEvents", {
      companyId: args.companyId,
      agentKey: args.agentKey,
      kind: "status",
      text: `Build stopped: ${args.error.slice(0, 200)}. You can retry from the dashboard.`,
      ts: now,
    });
    return null;
  },
});
