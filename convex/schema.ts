import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Clawmart relaunch schema — AI Visibility Fix Kit.
 * Guest-first: no user accounts in v1. Reports are keyed by an unguessable token.
 */
export default defineSchema({
  // One paid Fix Kit report per purchase.
  reports: defineTable({
    token: v.string(), // 128-bit hex — the report URL key. Never expose _id.
    domain: v.string(), // normalized apex domain, e.g. "example.com"
    brandName: v.string(),
    category: v.string(),
    competitors: v.array(v.string()),
    email: v.optional(v.string()), // from Stripe session, for delivery
    status: v.union(
      v.literal("pending_payment"),
      v.literal("paid"),
      v.literal("generating"),
      v.literal("complete"),
      v.literal("failed"),
      v.literal("refund_flagged")
    ),
    stripeSessionId: v.optional(v.string()), // idempotency key for fulfillment
    stripePaymentIntentId: v.optional(v.string()),
    promptSetVersion: v.string(), // e.g. "v1"
    prompts: v.array(
      v.object({
        id: v.string(),
        text: v.string(),
        intent: v.string(), // e.g. "best-tool", "comparison", "recommendation"
      })
    ),
    crawl: v.optional(v.any()), // CrawlResult (see lib/pure.ts types)
    chunksTotal: v.number(),
    chunksDone: v.number(),
    lastProgressAt: v.optional(v.number()), // updated on paid + every chunk; watchdog uses this
    attempts: v.number(), // retry counter for the current chunk
    result: v.optional(v.any()), // ReportResult — scores, share-of-voice, fix kit artifacts
    error: v.optional(v.string()),
    createdAt: v.number(),
    paidAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index("by_token", ["token"])
    .index("by_stripe_session", ["stripeSessionId"])
    .index("by_status", ["status"]),

  // One row per prompt x model x run — the verifiable transcript appendix.
  samples: defineTable({
    reportId: v.id("reports"),
    promptId: v.string(),
    promptText: v.string(),
    model: v.string(), // exact model id, e.g. "perplexity/sonar"
    grounded: v.boolean(), // search-grounded vs model-knowledge-only
    run: v.number(), // 1..3
    answer: v.string(),
    brandMentioned: v.boolean(),
    competitorsMentioned: v.array(v.string()),
    citedUrls: v.array(v.string()),
    createdAt: v.number(),
  }).index("by_report", ["reportId"]),

  // Free-check results, cached 24h per normalized domain.
  checks: defineTable({
    domain: v.string(), // normalized
    status: v.union(
      v.literal("running"),
      v.literal("complete"),
      v.literal("failed")
    ),
    tier: v.optional(
      v.union(
        v.literal("invisible"),
        v.literal("faint"),
        v.literal("mixed"),
        v.literal("visible")
      )
    ),
    brandName: v.optional(v.string()),
    category: v.optional(v.string()),
    competitors: v.optional(v.array(v.string())),
    findings: v.optional(v.array(v.string())), // 2-3 teaser findings
    sampleCount: v.optional(v.number()),
    mentionCount: v.optional(v.number()),
    modelsUsed: v.optional(v.array(v.string())),
    error: v.optional(v.string()),
    createdAt: v.number(),
    expiresAt: v.number(), // createdAt + 24h
  }).index("by_domain", ["domain"]),

  // Sliding-window rate limiting (keyed by hashed IP or domain).
  rateLimits: defineTable({
    key: v.string(),
    windowStart: v.number(),
    count: v.number(),
  }).index("by_key", ["key"]),

  // Daily LLM spend circuit breaker.
  spend: defineTable({
    day: v.string(), // "YYYY-MM-DD" UTC
    usdSpent: v.number(),
    callCount: v.number(),
  }).index("by_day", ["day"]),

  // "Monthly fix drops" waitlist — validates the recurring SKU before building it.
  waitlist: defineTable({
    email: v.string(),
    source: v.string(), // "report" | "check" | "home"
    domain: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_email", ["email"]),
});
