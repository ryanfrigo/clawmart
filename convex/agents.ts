import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByWorkforce = query({
  args: { workforceId: v.id("workforces") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_workforce", (q) => q.eq("workforceId", args.workforceId))
      .collect();
  },
});

export const update = mutation({
  args: {
    id: v.id("agents"),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    tools: v.optional(v.array(v.string())),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("idle"),
        v.literal("error"),
        v.literal("paused")
      )
    ),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, filtered);
  },
});

export const create = mutation({
  args: {
    workforceId: v.id("workforces"),
    name: v.string(),
    role: v.string(),
    description: v.string(),
    systemPrompt: v.string(),
    tools: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("agents", {
      ...args,
      status: "idle",
      messagesProcessed: 0,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("agents") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_agent", (q) => q.eq("agentId", args.id))
      .collect();
    for (const msg of messages) await ctx.db.delete(msg._id);
    await ctx.db.delete(args.id);
  },
});
