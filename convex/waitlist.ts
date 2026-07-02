/**
 * "Monthly fix drops" waitlist — validates the recurring SKU before we build
 * it (spec: build only after >=25 signups or >=10 kit sales).
 */

import { v, ConvexError } from "convex/values";
import { mutation } from "./_generated/server";
import { isValidEmail, normalizeDomain } from "./lib/pure";

export const join = mutation({
  args: {
    email: v.string(),
    source: v.string(), // "report" | "check" | "home"
    domain: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!isValidEmail(email)) throw new ConvexError("invalid_email");

    // Global flood guard: this endpoint is called directly from the browser
    // (no server-side IP), so cap total inserts per hour to bound abuse. A new
    // product won't legitimately exceed this; a script flood will.
    const WINDOW_MS = 60 * 60 * 1000;
    const MAX_PER_HOUR = 300;
    const key = "waitlist-global";
    const now = Date.now();
    const rl = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    if (!rl || now - rl.windowStart > WINDOW_MS) {
      if (rl) await ctx.db.patch(rl._id, { windowStart: now, count: 1 });
      else await ctx.db.insert("rateLimits", { key, windowStart: now, count: 1 });
    } else if (rl.count >= MAX_PER_HOUR) {
      throw new ConvexError("rate_limited");
    } else {
      await ctx.db.patch(rl._id, { count: rl.count + 1 });
    }

    const existing = await ctx.db
      .query("waitlist")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!existing) {
      const domain = args.domain ? normalizeDomain(args.domain) : null;
      await ctx.db.insert("waitlist", {
        email,
        source: args.source.slice(0, 32),
        ...(domain ? { domain } : {}),
        createdAt: Date.now(),
      });
    }
    return { ok: true as const };
  },
});
