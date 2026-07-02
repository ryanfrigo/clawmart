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
