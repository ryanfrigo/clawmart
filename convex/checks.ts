/**
 * Free AI Visibility Check.
 *
 * Public surface: api.checks.run (secret-guarded action) + api.checks.get.
 * Everything else internal. 24h cache per normalized domain, per-IP and
 * per-domain rate limits, daily spend breaker. Sampling: 10 buyer-intent
 * prompts x 2 models x 1 run, written progressively so the UI can poll.
 */

import { v, ConvexError } from "convex/values";
import {
  action,
  query,
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import {
  normalizeDomain,
  buildFreeCheckPrompts,
  detectMention,
  detectCompetitors,
  tierFor,
  buildTeaserFindings,
  chunk,
  type CrawlResult,
  type PromptSpec,
} from "./lib/pure";
import {
  freeCheckModels,
  llmComplete,
  inferBrandContext,
  isMockMode,
  COST_PER_CALL_USD,
  type ModelSpec,
} from "./llm";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_CHECKS_PER_IP_PER_HOUR = 10;
const MAX_CHECKS_PER_DOMAIN_PER_HOUR = 4;
const FREE_CHECK_CALLS = 20; // 10 prompts x 2 models x 1 run

function requireSharedSecret(provided: string): void {
  const expected = process.env.SERVER_SHARED_SECRET;
  if (!expected || provided !== expected) {
    throw new ConvexError("unauthorized");
  }
}

// ---------------------------------------------------------------------------
// Public: run
// ---------------------------------------------------------------------------

export const run = action({
  args: {
    domain: v.string(),
    ipHash: v.string(),
    secret: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ checkId: string; cached: boolean }> => {
    requireSharedSecret(args.secret);

    const domain = normalizeDomain(args.domain);
    if (!domain) throw new ConvexError("invalid_domain");

    // Fresh cache hit (running or complete) — free, no rate-limit charge.
    const cached = await ctx.runQuery(internal.checks.freshByDomain, { domain });
    if (cached) return { checkId: cached, cached: true };

    const ipOk = await ctx.runMutation(internal.checks.hitRateLimit, {
      key: `check-ip:${args.ipHash}`,
      windowMs: RATE_WINDOW_MS,
      max: MAX_CHECKS_PER_IP_PER_HOUR,
    });
    if (!ipOk) throw new ConvexError("rate_limited");
    const domainOk = await ctx.runMutation(internal.checks.hitRateLimit, {
      key: `check-domain:${domain}`,
      windowMs: RATE_WINDOW_MS,
      max: MAX_CHECKS_PER_DOMAIN_PER_HOUR,
    });
    if (!domainOk) throw new ConvexError("rate_limited");

    const budget = await ctx.runQuery(internal.spend.check, {
      projectedUsd: FREE_CHECK_CALLS * COST_PER_CALL_USD,
    });
    if (!budget.ok) throw new ConvexError("at_capacity");

    const checkId = await ctx.runMutation(internal.checks.createRunning, {
      domain,
    });
    await ctx.scheduler.runAfter(0, internal.checks.execute, {
      checkId,
      domain,
    });
    return { checkId, cached: false };
  },
});

// ---------------------------------------------------------------------------
// Public: get (safe fields only)
// ---------------------------------------------------------------------------

export const get = query({
  args: { checkId: v.id("checks") },
  handler: async (ctx, args) => {
    const check = await ctx.db.get(args.checkId);
    if (!check) return null;
    return {
      status: check.status,
      tier: check.tier,
      brandName: check.brandName,
      category: check.category,
      competitors: check.competitors,
      findings: check.findings,
      sampleCount: check.sampleCount,
      mentionCount: check.mentionCount,
      modelsUsed: check.modelsUsed,
      error: check.error,
      createdAt: check.createdAt,
    };
  },
});

// ---------------------------------------------------------------------------
// Internal: cache, rate limits, row lifecycle
// ---------------------------------------------------------------------------

export const freshByDomain = internalQuery({
  args: { domain: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const rows = await ctx.db
      .query("checks")
      .withIndex("by_domain", (q) => q.eq("domain", args.domain))
      .collect();
    const fresh = rows
      .filter((r) => r.expiresAt > now && r.status !== "failed")
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    return fresh?._id ?? null;
  },
});

/** Fixed-window rate limiter on the rateLimits table. Returns true when allowed. */
export const hitRateLimit = internalMutation({
  args: { key: v.string(), windowMs: v.number(), max: v.number() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const row = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (!row || now - row.windowStart >= args.windowMs) {
      if (row) {
        await ctx.db.patch(row._id, { windowStart: now, count: 1 });
      } else {
        await ctx.db.insert("rateLimits", {
          key: args.key,
          windowStart: now,
          count: 1,
        });
      }
      return true;
    }
    if (row.count >= args.max) return false;
    await ctx.db.patch(row._id, { count: row.count + 1 });
    return true;
  },
});

export const createRunning = internalMutation({
  args: { domain: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("checks", {
      domain: args.domain,
      status: "running",
      createdAt: now,
      expiresAt: now + CACHE_TTL_MS,
    });
  },
});

export const patch = internalMutation({
  args: {
    checkId: v.id("checks"),
    status: v.optional(
      v.union(v.literal("running"), v.literal("complete"), v.literal("failed"))
    ),
    tier: v.optional(
      v.union(
        v.literal("invisible"),
        v.literal("faint"),
        v.literal("mixed"),
        v.literal("visible")
      )
    ),
    brandName: v.optional(v.string()),
    category: v.optional(v.string()),
    competitors: v.optional(v.array(v.string())),
    findings: v.optional(v.array(v.string())),
    sampleCount: v.optional(v.number()),
    mentionCount: v.optional(v.number()),
    modelsUsed: v.optional(v.array(v.string())),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { checkId, ...fields } = args;
    const updates = Object.fromEntries(
      Object.entries(fields).filter(([, val]) => val !== undefined)
    );
    await ctx.db.patch(checkId, updates);
    return null;
  },
});

// ---------------------------------------------------------------------------
// Internal: execute — crawl + sample inside a single action, progressive writes
// ---------------------------------------------------------------------------

type FreeSample = {
  grounded: boolean;
  mentioned: boolean;
  competitorsMentioned: string[];
};

export const execute = internalAction({
  args: { checkId: v.id("checks"), domain: v.string() },
  handler: async (ctx, args) => {
    const { checkId, domain } = args;
    try {
      const crawl: CrawlResult = await ctx.runAction(internal.crawler.crawl, {
        domain,
      });
      const brand = await inferBrandContext(ctx, { domain, crawl });
      const models: ModelSpec[] = freeCheckModels();
      await ctx.runMutation(internal.checks.patch, {
        checkId,
        brandName: brand.brandName,
        category: brand.category,
        competitors: brand.competitors,
        modelsUsed: models.map((m) => m.id),
        sampleCount: 0,
        mentionCount: 0,
      });

      // Re-check the breaker right before the batch.
      const budget = await ctx.runQuery(internal.spend.check, {
        projectedUsd: FREE_CHECK_CALLS * COST_PER_CALL_USD,
      });
      if (!budget.ok) throw new Error("at_capacity");

      const prompts: PromptSpec[] = buildFreeCheckPrompts(
        brand.category,
        brand.competitors
      );
      const samples: FreeSample[] = [];

      for (const batch of chunk(prompts, 5)) {
        const jobs = batch.flatMap((p) =>
          models.map((model) => ({ prompt: p, model }))
        );
        const settled = await Promise.allSettled(
          jobs.map((job) =>
            llmComplete(ctx, {
              model: job.model,
              prompt: job.prompt.text,
              maxTokens: 400,
              mock: isMockMode()
                ? {
                    brandName: brand.brandName,
                    domain,
                    category: brand.category,
                    competitors: brand.competitors,
                    seed: `${domain}|${job.prompt.id}|1`,
                  }
                : undefined,
            })
          )
        );
        settled.forEach((res, i) => {
          if (res.status !== "fulfilled") return; // free check tolerates gaps
          samples.push({
            grounded: jobs[i].model.grounded,
            mentioned: detectMention(
              res.value.text,
              brand.brandName,
              domain
            ),
            competitorsMentioned: detectCompetitors(
              res.value.text,
              brand.competitors
            ),
          });
        });
        await ctx.runMutation(internal.checks.patch, {
          checkId,
          sampleCount: samples.length,
          mentionCount: samples.filter((s) => s.mentioned).length,
        });
      }

      const grounded = samples.filter((s) => s.grounded);
      if (grounded.length === 0) throw new Error("no_grounded_samples");
      const groundedMentions = grounded.filter((s) => s.mentioned).length;
      const tier = tierFor(groundedMentions, grounded.length);

      const compCounts = new Map<string, number>(
        brand.competitors.map((c) => [c, 0])
      );
      for (const s of samples) {
        for (const c of s.competitorsMentioned) {
          compCounts.set(c, (compCounts.get(c) ?? 0) + 1);
        }
      }
      const shareOfVoice = [
        {
          name: brand.brandName,
          mentions: samples.filter((s) => s.mentioned).length,
          isYou: true,
        },
        ...Array.from(compCounts.entries()).map(([name, mentions]) => ({
          name,
          mentions,
          isYou: false,
        })),
      ];

      const findings = buildTeaserFindings({
        groundedMentions,
        groundedSamples: grounded.length,
        groundedModelId: models.find((m) => m.grounded)?.id ?? "",
        shareOfVoice,
        crawl,
      });

      await ctx.runMutation(internal.checks.patch, {
        checkId,
        status: "complete",
        tier,
        findings,
        sampleCount: samples.length,
        mentionCount: samples.filter((s) => s.mentioned).length,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "check_failed";
      const safe = ["at_capacity", "no_grounded_samples"].includes(msg)
        ? msg
        : "check_failed";
      await ctx.runMutation(internal.checks.patch, {
        checkId,
        status: "failed",
        error: safe,
      });
    }
    return null;
  },
});
