import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {
    category: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let skills;
    if (args.category) {
      skills = await ctx.db
        .query("skills")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .collect();
    } else {
      skills = await ctx.db.query("skills").collect();
    }
    // Filter to active only by default
    return skills.filter((s) => s.status === "active");
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("skills").collect();
  },
});

export const get = query({
  args: { id: v.id("skills") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listByAuthor = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) return [];
    return await ctx.db
      .query("skills")
      .withIndex("by_author", (q) => q.eq("authorId", user._id))
      .collect();
  },
});

export const create = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    description: v.string(),
    longDescription: v.optional(v.string()),
    category: v.string(),
    endpoint: v.string(),
    method: v.union(v.literal("GET"), v.literal("POST")),
    pricePerCall: v.number(),
    tags: v.array(v.string()),
    exampleInput: v.optional(v.string()),
    exampleOutput: v.optional(v.string()),
    responseTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) throw new Error("User not found. Please sign in.");

    const skillId = await ctx.db.insert("skills", {
      name: args.name,
      description: args.description,
      longDescription: args.longDescription,
      category: args.category,
      endpoint: args.endpoint,
      method: args.method,
      pricePerCall: args.pricePerCall,
      authorId: user._id,
      authorName: user.name ?? user.email,
      tags: args.tags,
      exampleInput: args.exampleInput,
      exampleOutput: args.exampleOutput,
      responseTime: args.responseTime,
      totalCalls: 0,
      totalReviews: 0,
      averageRating: 0,
      status: "active",
      createdAt: Date.now(),
    });
    return skillId;
  },
});

export const update = mutation({
  args: {
    id: v.id("skills"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    longDescription: v.optional(v.string()),
    endpoint: v.optional(v.string()),
    pricePerCall: v.optional(v.number()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("pending"),
        v.literal("disabled")
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

export const remove = mutation({
  args: { id: v.id("skills") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
