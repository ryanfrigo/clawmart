import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Clawmart v2 schema — premium OpenClaw skill-pack storefront.
 *
 * Guest-first: no user accounts. A purchase is keyed by an unguessable token
 * (the delivery URL). Money mutations are internal; the only public surface is
 * createPending / attachStripeSession (secret-guarded) and getByToken.
 */
export default defineSchema({
  // One row per checkout attempt. Stripe drives it pending_payment -> paid|failed.
  purchases: defineTable({
    token: v.string(), // 128-bit hex — the download URL key. Never expose _id.
    slug: v.string(), // pack slug or "all-access"
    title: v.optional(v.string()), // human label passed from checkout (record only)
    email: v.optional(v.string()), // from Stripe session, for delivery
    status: v.union(
      v.literal("pending_payment"),
      v.literal("paid"),
      v.literal("failed")
    ),
    stripeSessionId: v.optional(v.string()), // idempotency key for fulfillment
    stripePaymentIntentId: v.optional(v.string()),
    amountUsd: v.number(), // whole dollars, validated against allowed prices
    // Crypto (USDC on Base) rail — optional; card purchases leave these unset.
    paymentMethod: v.optional(v.union(v.literal("card"), v.literal("crypto"))),
    expectedUsdcMicro: v.optional(v.number()), // exact USDC (6dp micro units) to match on-chain
    cryptoFromBlock: v.optional(v.number()), // Base block at order creation — scan from here
    cryptoTxHash: v.optional(v.string()), // the matched on-chain payment
    createdAt: v.number(),
    paidAt: v.optional(v.number()),
  })
    .index("by_token", ["token"])
    .index("by_stripe_session", ["stripeSessionId"]),

  // Sliding-window rate limiting (keyed by hashed IP or a global key).
  rateLimits: defineTable({
    key: v.string(),
    windowStart: v.number(),
    count: v.number(),
  }).index("by_key", ["key"]),

  // "New packs" waitlist — validates demand for future packs before we build them.
  waitlist: defineTable({
    email: v.string(),
    source: v.string(), // e.g. "home" | "packs" | "purchase"
    domain: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  // ---- Company Studio (docs/COMPANY-STUDIO.md) ----------------------------

  // One row per user company idea. Owned by a Clerk user; public via slug.
  companies: defineTable({
    ownerId: v.string(), // Clerk subject
    slug: v.string(), // public URL key — re-slugged from brand name mid-build
    slugLocked: v.optional(v.boolean()), // once branded, the slug never changes (shared links)
    idea: v.string(), // the user's raw description
    name: v.string(), // provisional until the brand agent lands
    tagline: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("building"),
      v.literal("live"),
      v.literal("failed")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_owner", ["ownerId"]),

  // One row per pipeline step per build.
  agentRuns: defineTable({
    companyId: v.id("companies"),
    agentKey: v.string(), // "strategist" | "brand" | "product" | "landing" | "marketing"
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("done"),
      v.literal("failed")
    ),
    model: v.string(),
    attempt: v.number(), // 1-based; one retry max
    error: v.optional(v.string()),
    tokensIn: v.optional(v.number()),
    tokensOut: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_company", ["companyId"]),

  // Append-only live feed shown in /studio/[id].
  agentEvents: defineTable({
    companyId: v.id("companies"),
    agentKey: v.string(),
    kind: v.union(v.literal("status"), v.literal("output")),
    text: v.string(),
    ts: v.number(),
  }).index("by_company", ["companyId"]),

  // Final artifacts, one per kind per company (upserted on re-runs).
  // json is a stringified blob — agent output schemas evolve too fast for validators.
  companyAssets: defineTable({
    companyId: v.id("companies"),
    kind: v.string(), // "plan" | "brand" | "product" | "landing" | "marketing"
    json: v.string(),
    updatedAt: v.number(),
  }).index("by_company_kind", ["companyId", "kind"]),
});
