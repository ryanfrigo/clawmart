/**
 * Daily LLM spend circuit breaker. All internal.
 *
 * Hard stop at DAILY_SPEND_LIMIT_USD (default $20/day): callers check
 * `internal.spend.check` BEFORE a batch and surface a graceful
 * "at capacity" to users. `internal.spend.record` is called once per LLM
 * call (flat ~$0.01 estimate — see BUILD-CONTRACT.md).
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function dailyLimitUsd(): number {
  const parsed = parseFloat(process.env.DAILY_SPEND_LIMIT_USD ?? "20");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
}

export const record = internalMutation({
  args: { usd: v.number(), calls: v.number() },
  handler: async (ctx, args) => {
    const day = todayUtc();
    const row = await ctx.db
      .query("spend")
      .withIndex("by_day", (q) => q.eq("day", day))
      .first();
    if (row) {
      await ctx.db.patch(row._id, {
        usdSpent: row.usdSpent + args.usd,
        callCount: row.callCount + args.calls,
      });
    } else {
      await ctx.db.insert("spend", {
        day,
        usdSpent: args.usd,
        callCount: args.calls,
      });
    }
    return null;
  },
});

export const check = internalQuery({
  args: { projectedUsd: v.number() },
  handler: async (ctx, args) => {
    const day = todayUtc();
    const row = await ctx.db
      .query("spend")
      .withIndex("by_day", (q) => q.eq("day", day))
      .first();
    const spentUsd = row?.usdSpent ?? 0;
    const limitUsd = dailyLimitUsd();
    return {
      ok: spentUsd + args.projectedUsd <= limitUsd,
      spentUsd,
      limitUsd,
    };
  },
});

/** Cron: prune spend rows older than 30 days. */
export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const rows = await ctx.db.query("spend").collect();
    for (const row of rows) {
      if (row.day < cutoff) await ctx.db.delete(row._id);
    }
    return null;
  },
});
