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
});
