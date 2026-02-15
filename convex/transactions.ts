import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listByBuyer = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) return [];
    const txns = await ctx.db
      .query("transactions")
      .withIndex("by_buyer", (q) => q.eq("buyerId", user._id))
      .collect();
    return txns.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const listBySeller = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) return [];
    const txns = await ctx.db
      .query("transactions")
      .withIndex("by_seller", (q) => q.eq("sellerId", user._id))
      .collect();
    return txns.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const create = mutation({
  args: {
    skillId: v.id("skills"),
    buyerClerkId: v.string(),
    amount: v.number(),
    txHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const buyer = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.buyerClerkId))
      .first();
    if (!buyer) throw new Error("Buyer not found");

    const skill = await ctx.db.get(args.skillId);
    if (!skill) throw new Error("Skill not found");

    const txnId = await ctx.db.insert("transactions", {
      skillId: args.skillId,
      buyerId: buyer._id,
      sellerId: skill.authorId,
      amount: args.amount,
      status: "completed",
      txHash: args.txHash,
      createdAt: Date.now(),
    });

    // Increment call count
    await ctx.db.patch(args.skillId, {
      totalCalls: skill.totalCalls + 1,
    });

    return txnId;
  },
});
