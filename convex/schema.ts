// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  skills: defineTable({
    id: v.string(), // name@version
    name: v.string(),
    version: v.string(),
    author: v.string(),
    description: v.string(),
    tags: v.array(v.string()),
    tools: v.array(v.string()),
    runtime: v.string(),
    source: v.string(),
    sourceOrigin: v.string(),
    verified: v.boolean(),
    rating: v.number(),
    usage: v.number(),
    level: v.number(),
    xp: v.number(),
    price: v.optional(v.string()),
    priceAmount: v.optional(v.number()),
    lastUpdated: v.string(),
    scrapedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_author", ["author"])
    .index("by_verified", ["verified"]),

  reviews: defineTable({
    skillId: v.string(),
    reviewerId: v.string(),
    rating: v.number(),
    comment: v.string(),
    paymentProof: v.string(),
    verified: v.boolean(),
    timestamp: v.number(),
  })
    .index("by_skill", ["skillId"])
    .index("by_reviewer", ["reviewerId"]),

  payments: defineTable({
    nonce: v.string(),
    skillId: v.string(),
    payer: v.string(),
    amount: v.number(),
    token: v.string(),
    txHash: v.string(),
    status: v.string(), // pending, confirmed, failed
    timestamp: v.number(),
  })
    .index("by_nonce", ["nonce"])
    .index("by_skill", ["skillId"]),

  agents: defineTable({
    address: v.string(),
    name: v.optional(v.string()),
    reputation: v.number(),
    skillsListed: v.array(v.string()),
    totalEarned: v.number(),
    totalSpent: v.number(),
    createdAt: v.number(),
  })
    .index("by_address", ["address"]),

  activity: defineTable({
    type: v.string(), // skill_purchased, review_submitted, skill_listed
    actor: v.string(),
    skillId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_actor", ["actor"]),
});
