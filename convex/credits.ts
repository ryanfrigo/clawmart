import { v } from "convex/values"
import { mutation, query, internalMutation } from "./_generated/server"

// Helper: resolve Clerk identity → internal user _id
async function getCurrentUserId(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> }; db: any }) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
    .first()
  return user?._id ?? null
}

// Get user's current credit balance
export const getBalance = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) return null

    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first()

    return balance?.credits || 0
  },
})

// Get user's credit transaction history
export const getTransactions = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) return []

    return await ctx.db
      .query("creditTransactions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(args.limit || 50)
  },
})

// Spend credits for a skill call (internal - called by skill APIs)
export const spendCredits = internalMutation({
  args: {
    userId: v.id("users"),
    skillId: v.string(),
    creditsRequired: v.number(),
    metadata: v.optional(v.object({
      endpoint: v.optional(v.string()),
      responseTime: v.optional(v.number()),
      success: v.optional(v.boolean()),
    }))
  },
  handler: async (ctx, args) => {
    const { userId, skillId, creditsRequired, metadata } = args

    // Get current balance
    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first()

    const currentCredits = balance?.credits || 0

    if (currentCredits < creditsRequired) {
      throw new Error(`Insufficient credits. Required: ${creditsRequired}, Available: ${currentCredits}`)
    }

    // Update balance
    if (balance) {
      await ctx.db.patch(balance._id, {
        credits: currentCredits - creditsRequired,
        lastUsed: Date.now(),
      })
    } else {
      // This shouldn't happen, but create balance if it doesn't exist
      await ctx.db.insert("creditBalances", {
        userId,
        credits: -creditsRequired,
        lastUsed: Date.now(),
      })
    }

    // Record transaction
    await ctx.db.insert("creditTransactions", {
      userId,
      type: "spent",
      amount: -creditsRequired,
      description: `Used ${skillId} skill`,
      skillId,
      metadata: metadata || {},
      createdAt: Date.now(),
    })

    return { success: true, remainingCredits: currentCredits - creditsRequired }
  },
})

// Add credits to user's balance (called by Stripe webhook after payment)
export const addCredits = mutation({
  args: {
    userId: v.id("users"),
    credits: v.number(),
    description: v.string(),
    paymentId: v.optional(v.string()),
    packageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, credits, description, paymentId, packageId } = args

    // Get or create balance
    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first()

    if (balance) {
      await ctx.db.patch(balance._id, {
        credits: balance.credits + credits,
      })
    } else {
      await ctx.db.insert("creditBalances", {
        userId,
        credits,
        lastUsed: undefined,
      })
    }

    // Record transaction
    await ctx.db.insert("creditTransactions", {
      userId,
      type: "purchased",
      amount: credits,
      description,
      paymentId,
      packageId,
      createdAt: Date.now(),
    })

    return { success: true, newBalance: (balance?.credits || 0) + credits }
  },
})

// Public mutation: deduct credits for a skill call (called from frontend)
// spendCredits is an internalMutation, so this wrapper exposes the same logic publicly
export const spendAndCall = mutation({
  args: {
    skillId: v.id("skills"),
    input: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")

    // Look up user by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .first()
    if (!user) throw new Error("User not found. Please sign in again.")

    // Get skill to find pricePerCall
    const skill = await ctx.db.get(args.skillId)
    if (!skill) throw new Error("Skill not found")

    // Convert price to credits: 1 credit = $0.001, so creditsRequired = price / 0.001
    const creditsRequired = Math.ceil(skill.pricePerCall / 0.001)

    // Check current balance
    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
      .first()

    const currentCredits = balance?.credits || 0
    if (currentCredits < creditsRequired) {
      throw new Error(
        `Insufficient credits. Required: ${creditsRequired}, Available: ${currentCredits}`
      )
    }

    // Deduct credits
    if (balance) {
      await ctx.db.patch(balance._id, {
        credits: currentCredits - creditsRequired,
        lastUsed: Date.now(),
      })
    }

    // Record transaction
    await ctx.db.insert("creditTransactions", {
      userId: user._id,
      type: "spent",
      amount: -creditsRequired,
      description: `Used ${skill.name} skill`,
      skillId: args.skillId,
      metadata: { input: args.input.substring(0, 200) },
      createdAt: Date.now(),
    })

    return { success: true, remainingCredits: currentCredits - creditsRequired }
  },
})

// Check if user has sufficient credits for a skill call
export const checkSufficientCredits = query({
  args: { 
    skillId: v.string(),
    creditsRequired: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) return { sufficient: false, balance: 0 }

    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first()

    const currentCredits = balance?.credits || 0
    
    return {
      sufficient: currentCredits >= args.creditsRequired,
      balance: currentCredits,
      required: args.creditsRequired,
    }
  },
})