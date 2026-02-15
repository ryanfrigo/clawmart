import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listByWorkforce = query({
  args: { workforceId: v.id("workforces"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_workforce", (q) => q.eq("workforceId", args.workforceId))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

export const send = mutation({
  args: {
    agentId: v.id("agents"),
    workforceId: v.id("workforces"),
    role: v.union(v.literal("user"), v.literal("agent"), v.literal("system")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
