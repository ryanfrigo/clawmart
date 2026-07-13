/**
 * "New packs" waitlist — validates demand for future packs before we build
 * them. Called directly from the browser, so it carries its own flood guard.
 */

import { v, ConvexError } from "convex/values";
import { mutation } from "./_generated/server";
import { isValidEmail } from "./lib/pure";

export const join = mutation({
  args: {
    email: v.string(),
    source: v.string(), // e.g. "home" | "packs" | "purchase"
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

    // Dedupe per (email, source), not globally per email: someone on the packs
    // waitlist who also signs up on a /c/<slug> concept page is a distinct,
    // countable signal for that company.
    const source = args.source.slice(0, 64);
    const existing = await ctx.db
      .query("waitlist")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();
    if (!existing.some((row) => row.source === source)) {
      const domain = args.domain?.trim().toLowerCase();
      await ctx.db.insert("waitlist", {
        email,
        source,
        ...(domain ? { domain } : {}),
        createdAt: Date.now(),
      });
    }
    return { ok: true as const };
  },
});
