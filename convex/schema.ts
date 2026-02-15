import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    plan: v.union(
      v.literal("free"),
      v.literal("pro"),
      v.literal("enterprise")
    ),
    createdAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_stripe_customer_id", ["stripeCustomerId"]),

  skills: defineTable({
    name: v.string(),
    description: v.string(),
    longDescription: v.optional(v.string()),
    category: v.string(),
    endpoint: v.string(),
    method: v.union(v.literal("GET"), v.literal("POST")),
    pricePerCall: v.number(), // in USD, e.g. 0.003
    authorId: v.id("users"),
    authorName: v.string(),
    tags: v.array(v.string()),
    exampleInput: v.optional(v.string()),
    exampleOutput: v.optional(v.string()),
    responseTime: v.optional(v.string()),
    totalCalls: v.number(),
    totalReviews: v.number(),
    averageRating: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("pending"),
      v.literal("disabled")
    ),
    createdAt: v.number(),
  })
    .index("by_author", ["authorId"])
    .index("by_category", ["category"])
    .index("by_status", ["status"])
    .searchIndex("search_name", { searchField: "name" }),

  reviews: defineTable({
    skillId: v.id("skills"),
    userId: v.id("users"),
    rating: v.number(), // 1-5
    comment: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_skill", ["skillId"])
    .index("by_user_skill", ["userId", "skillId"]),

  transactions: defineTable({
    skillId: v.id("skills"),
    buyerId: v.id("users"),
    sellerId: v.id("users"),
    amount: v.number(), // USD
    status: v.union(
      v.literal("completed"),
      v.literal("pending"),
      v.literal("failed")
    ),
    txHash: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_buyer", ["buyerId"])
    .index("by_seller", ["sellerId"])
    .index("by_skill", ["skillId"]),

  // Keep old tables for backward compat during migration
  templates: defineTable({
    name: v.string(),
    industry: v.string(),
    description: v.string(),
    icon: v.string(),
    color: v.string(),
    agents: v.array(
      v.object({
        name: v.string(),
        role: v.string(),
        description: v.string(),
        systemPrompt: v.string(),
        tools: v.array(v.string()),
      })
    ),
  }).index("by_industry", ["industry"]),

  workforces: defineTable({
    name: v.string(),
    userId: v.id("users"),
    templateId: v.optional(v.id("templates")),
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("setup")
    ),
    config: v.optional(
      v.object({
        companyName: v.optional(v.string()),
        brandVoice: v.optional(v.string()),
        industry: v.optional(v.string()),
        context: v.optional(v.string()),
      })
    ),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  agents: defineTable({
    workforceId: v.id("workforces"),
    name: v.string(),
    role: v.string(),
    description: v.string(),
    systemPrompt: v.string(),
    tools: v.array(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("idle"),
      v.literal("error"),
      v.literal("paused")
    ),
    messagesProcessed: v.number(),
    lastActive: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_workforce", ["workforceId"]),

  messages: defineTable({
    agentId: v.id("agents"),
    workforceId: v.id("workforces"),
    role: v.union(v.literal("user"), v.literal("agent"), v.literal("system")),
    content: v.string(),
    createdAt: v.number(),
  })
    .index("by_workforce", ["workforceId"])
    .index("by_agent", ["agentId"]),
});
