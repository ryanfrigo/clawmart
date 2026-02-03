// convex/payments.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Record a payment
export const record = mutation({
  args: {
    nonce: v.string(),
    skillId: v.string(),
    payer: v.string(),
    amount: v.number(),
    token: v.string(),
    txHash: v.string(),
  },
  handler: async (ctx, args) => {
    // Check for replay
    const existing = await ctx.db.query("payments")
      .withIndex("by_nonce", q => q.eq("nonce", args.nonce))
      .first();
    
    if (existing) {
      throw new Error("Payment already recorded");
    }
    
    const paymentId = await ctx.db.insert("payments", {
      ...args,
      status: "confirmed",
      timestamp: Date.now(),
    });
    
    // Update skill usage
    const skill = await ctx.db.query("skills")
      .filter(q => q.eq(q.field("id"), args.skillId))
      .first();
    
    if (skill) {
      await ctx.db.patch(skill._id, {
        usage: skill.usage + 1,
      });
    }
    
    // Log activity
    await ctx.db.insert("activity", {
      type: "skill_purchased",
      actor: args.payer,
      skillId: args.skillId,
      metadata: { amount: args.amount, token: args.token },
      timestamp: Date.now(),
    });
    
    return { id: paymentId };
  },
});

// Check if payment exists
export const exists = query({
  args: { nonce: v.string() },
  handler: async (ctx, args) => {
    const payment = await ctx.db.query("payments")
      .withIndex("by_nonce", q => q.eq("nonce", args.nonce))
      .first();
    
    return !!payment;
  },
});

// Get payment by txHash
export const getByTx = query({
  args: { txHash: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("payments")
      .filter(q => q.eq(q.field("txHash"), args.txHash))
      .first();
  },
});

// Get recent activity
export const activity = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db.query("activity")
      .withIndex("by_timestamp", q => q.order("desc"))
      .take(args.limit || 20);
  },
});
