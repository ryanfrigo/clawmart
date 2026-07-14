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
  type QueryCtx,
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

async function requireIdentity(ctx: {
  auth: {
    getUserIdentity(): Promise<{ subject: string; email?: string } | null>;
  };
}) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("unauthenticated");
  return identity;
}

async function requireUser(ctx: Parameters<typeof requireIdentity>[0]) {
  return (await requireIdentity(ctx)).subject;
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

// "Surprise me" idea generation — cheap, but still bounded.
const SURPRISE_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_SURPRISES_PER_DAY_USER = 15;
const MAX_SURPRISES_PER_DAY_GLOBAL = 300;

/** Called by agents.surpriseIdea before its model call. Throws rate_limited. */
export const bumpSurpriseLimit = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args): Promise<null> => {
    await bumpRateLimit(
      ctx,
      "surprise:global",
      SURPRISE_WINDOW_MS,
      MAX_SURPRISES_PER_DAY_GLOBAL
    );
    await bumpRateLimit(
      ctx,
      `surprise:user:${args.userId}`,
      SURPRISE_WINDOW_MS,
      MAX_SURPRISES_PER_DAY_USER
    );
    return null;
  },
});

/**
 * Signups collected by a company's public page — the market-fit signal.
 *
 * Attribution is keyed by the immutable company id (`co:<id>`), so it survives
 * slug changes and can never be inherited by a later company that reuses a
 * freed slug. Rows written before 2026-07-13 used `c/<slug>` — still counted
 * for continuity (and deleted with the company, so they can't leak either).
 * Bounded reads: a page with >1000 signups reports 1001 and the UI shows
 * "1,000+" — an unbounded .collect() would hit Convex's per-query read limit
 * for exactly the most successful companies.
 */
const WAITLIST_COUNT_CAP = 1000;

function waitlistSources(companyId: Id<"companies">, slug: string): string[] {
  return [`co:${companyId}`, `c/${slug}`];
}

async function waitlistCountFor(
  ctx: { db: QueryCtx["db"] },
  companyId: Id<"companies">,
  slug: string
): Promise<number> {
  // Dedupe by email across the migrated co:<id> and legacy c:<slug> keys so
  // the badge count matches the (also-deduped) signups list — a subscriber
  // present under both keys is one person. Bounded: at most 2×(CAP+1) reads.
  const emails = new Set<string>();
  for (const source of waitlistSources(companyId, slug)) {
    const rows = await ctx.db
      .query("waitlist")
      .withIndex("by_source", (q) => q.eq("source", source))
      .take(WAITLIST_COUNT_CAP + 1);
    for (const r of rows) emails.add(r.email);
    if (emails.size > WAITLIST_COUNT_CAP) return emails.size;
  }
  return emails.size;
}

// ---------------------------------------------------------------------------
// Public mutations
// ---------------------------------------------------------------------------

export const create = mutation({
  args: { idea: v.string() },
  handler: async (ctx, args): Promise<{ companyId: Id<"companies">; slug: string }> => {
    const identity = await requireIdentity(ctx);
    const ownerId = identity.subject;

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
      // For the morning digest. Present only when the Clerk JWT template
      // exposes the email claim; the digest quietly skips companies without.
      ownerEmail:
        typeof identity.email === "string" ? identity.email : undefined,
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
    const identity = await requireIdentity(ctx);
    const company = await ctx.db.get(args.companyId);
    if (!company || company.ownerId !== identity.subject) {
      throw new ConvexError("not_found");
    }
    if (company.status === "building") throw new ConvexError("build_in_progress");
    // Keep the digest address current — ownerEmail is otherwise a frozen
    // snapshot from creation, and users do change their Clerk email.
    if (typeof identity.email === "string" && identity.email !== company.ownerEmail) {
      await ctx.db.patch(args.companyId, { ownerEmail: identity.email });
    }
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
    const sorted = rows.sort((a, b) => b.createdAt - a.createdAt);
    return Promise.all(
      sorted.map(async (c) => ({
        _id: c._id,
        slug: c.slug,
        name: c.name,
        tagline: c.tagline,
        status: c.status,
        idea: c.idea,
        createdAt: c.createdAt,
        // Always computed: a failed-rebuild page keeps serving (and keeps
        // collecting signups) — the owner must never see a false zero.
        waitlistCount: await waitlistCountFor(ctx, c._id, c.slug),
      }))
    );
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
      waitlistCount: await waitlistCountFor(ctx, company._id, company.slug),
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
      // Stable key for waitlist attribution (survives slug changes; already
      // non-secret — it appears in owner URLs and grants no access).
      companyId: company._id,
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
    // Waitlist rows too — a freed slug must never hand this company's signup
    // count to whoever claims the slug next (no-fabricated-counters rule).
    for (const source of waitlistSources(args.companyId, company.slug)) {
      const signups = await ctx.db
        .query("waitlist")
        .withIndex("by_source", (q) => q.eq("source", source))
        .collect();
      for (const row of signups) await ctx.db.delete(row._id);
    }
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
      // Going live locks the slug unconditionally — even if the brand step
      // never produced a usable name, a shared /c/ URL must never change.
      await ctx.db.patch(args.companyId, {
        status: "live",
        slugLocked: true,
        updatedAt: now,
      });
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
        .withIndex("by_status", (q) => q.eq("status", "building"))
        .take(500)
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

// ---------------------------------------------------------------------------
// Internal — daily CEO check-in (see convex/checkins.ts + crons.ts)
// ---------------------------------------------------------------------------

/** Re-run guard + cost cap: at most this many check-ins per daily cron tick. */
const CHECKIN_MIN_GAP_MS = 20 * 60 * 60 * 1000;
const CHECKIN_BATCH_MAX = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Companies due a check-in — IDs ONLY, one small indexed read. Per-company
 * stats are fetched by separate queries (companyCheckinStats) so no single
 * Convex query aggregates unbounded reads across companies. Least-recently
 * checked first, so the daily cap rotates instead of starving newer companies.
 */
export const dueCheckins = internalQuery({
  args: {},
  handler: async (ctx): Promise<Id<"companies">[]> => {
    const now = Date.now();
    const live = await ctx.db
      .query("companies")
      .withIndex("by_status", (q) => q.eq("status", "live"))
      .take(500);
    return live
      .filter((c) => (c.lastCheckinAt ?? 0) < now - CHECKIN_MIN_GAP_MS)
      .sort((a, b) => (a.lastCheckinAt ?? 0) - (b.lastCheckinAt ?? 0))
      .slice(0, CHECKIN_BATCH_MAX)
      .map((c) => c._id);
  },
});

/** One company's check-in inputs — its own bounded query. Null when not due. */
export const companyCheckinStats = internalQuery({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const c = await ctx.db.get(args.companyId);
    if (!c || c.status !== "live") return null;
    if ((c.lastCheckinAt ?? 0) >= now - CHECKIN_MIN_GAP_MS) return null;

    const totalSignups = await waitlistCountFor(ctx, c._id, c.slug);
    let newSignups = 0;
    for (const source of waitlistSources(c._id, c.slug)) {
      const recent = await ctx.db
        .query("waitlist")
        .withIndex("by_source", (q) => q.eq("source", source))
        .order("desc") // creation order — recent rows first, tiny scans
        .take(WAITLIST_COUNT_CAP);
      newSignups += recent.filter((r) => r.createdAt > now - DAY_MS).length;
    }
    const plan = await ctx.db
      .query("companyAssets")
      .withIndex("by_company_kind", (q) =>
        q.eq("companyId", c._id).eq("kind", "strategist")
      )
      .first();
    let positioning = c.tagline ?? c.idea.slice(0, 200);
    try {
      const parsed = plan ? (JSON.parse(plan.json) as { positioning?: string }) : null;
      if (parsed && typeof parsed.positioning === "string") {
        positioning = parsed.positioning.slice(0, 600);
      }
    } catch {
      // fall back to tagline/idea
    }
    return {
      name: c.name,
      slug: c.slug,
      positioning,
      totalSignups,
      newSignups,
    };
  },
});

/**
 * Companies whose check-in landed within the digest window, with the note —
 * consumed by checkins.sendDigests. Bounded, indexed.
 */
export const digestRows = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const DIGEST_WINDOW_MS = 3 * 60 * 60 * 1000;
    const live = await ctx.db
      .query("companies")
      .withIndex("by_status", (q) => q.eq("status", "live"))
      .take(500);
    const fresh = live.filter(
      (c) => c.ownerEmail && (c.lastCheckinAt ?? 0) > now - DIGEST_WINDOW_MS
    );
    const rows: Array<{
      ownerEmail: string;
      name: string;
      slug: string;
      note: string;
      totalSignups: number;
      newSignups: number;
    }> = [];
    for (const c of fresh) {
      // The check-in note is the most recent "ceo" event — posted moments
      // ago, so this desc scan terminates almost immediately.
      const events = await ctx.db
        .query("agentEvents")
        .withIndex("by_company", (q) => q.eq("companyId", c._id))
        .order("desc")
        .take(25);
      const note = events.find((e) => e.agentKey === "ceo")?.text;
      if (!note) continue;
      const totalSignups = await waitlistCountFor(ctx, c._id, c.slug);
      let newSignups = 0;
      for (const source of waitlistSources(c._id, c.slug)) {
        const recent = await ctx.db
          .query("waitlist")
          .withIndex("by_source", (q) => q.eq("source", source))
          .order("desc")
          .take(WAITLIST_COUNT_CAP);
        newSignups += recent.filter((r) => r.createdAt > now - DAY_MS).length;
      }
      rows.push({
        ownerEmail: c.ownerEmail!,
        name: c.name,
        slug: c.slug,
        note,
        totalSignups,
        newSignups,
      });
    }
    return rows;
  },
});

/**
 * The actual signups for a company — owner-only. This is the market-fit
 * payoff: the emails you'll contact when you build the real thing. Bounded to
 * the most recent SIGNUPS_MAX (the count badge shows the full scale).
 */
const SIGNUPS_MAX = 100;

export const signups = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const company = await ctx.db.get(args.companyId);
    if (!company || company.ownerId !== identity.subject) return null;

    // Collapse the migrated co:<id> and legacy c:<slug> source keys by email:
    // someone who joined both before and after the 2026-07-13 key change is
    // the same person and must not be exported (or emailed) twice.
    const byEmail = new Map<string, number>();
    for (const source of waitlistSources(args.companyId, company.slug)) {
      const rows = await ctx.db
        .query("waitlist")
        .withIndex("by_source", (q) => q.eq("source", source))
        .order("desc")
        .take(SIGNUPS_MAX);
      for (const r of rows) {
        // Keep the earliest join time — when they actually signed up.
        const prev = byEmail.get(r.email);
        if (prev === undefined || r.createdAt < prev) byEmail.set(r.email, r.createdAt);
      }
    }
    const deduped = Array.from(byEmail, ([email, createdAt]) => ({ email, createdAt }));
    return deduped
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, SIGNUPS_MAX);
  },
});

/** At-most-one digest email per owner per day, even across overlapping runs. */
export const claimDigestSend = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args): Promise<{ ok: boolean }> => {
    try {
      await bumpRateLimit(ctx, `digest:${args.email}`, 20 * 60 * 60 * 1000, 1);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  },
});

export const recordCheckin = internalMutation({
  args: {
    companyId: v.id("companies"),
    focus: v.string(),
    note: v.string(),
  },
  handler: async (ctx, args): Promise<{ recorded: boolean }> => {
    const company = await ctx.db.get(args.companyId);
    if (!company) return { recorded: false };
    const now = Date.now();
    // Idempotency: a re-scheduled/replayed run never double-posts a day.
    if ((company.lastCheckinAt ?? 0) > now - CHECKIN_MIN_GAP_MS) {
      return { recorded: false };
    }
    await ctx.db.patch(args.companyId, { lastCheckinAt: now });
    await ctx.db.insert("agentEvents", {
      companyId: args.companyId,
      agentKey: "ceo",
      kind: "output",
      text: `Daily check-in — ${args.focus.slice(0, 60)}: ${args.note.slice(0, 500)}`,
      ts: now,
    });
    return { recorded: true };
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
