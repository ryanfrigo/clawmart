/**
 * Pack purchases.
 *
 * Public surface (per PACKS-BUILD-CONTRACT.md):
 * - api.purchases.createPending       (secret-guarded; BEFORE Stripe session)
 * - api.purchases.attachStripeSession (secret-guarded)
 * - api.purchases.getByToken          (never returns email / stripe ids)
 *
 * Everything else is internal fulfillment state. Status machine:
 * pending_payment -> paid | failed. Money mutations are internal and driven by
 * the Stripe webhook (convex/http.ts) with reconcile as the backstop (crons.ts).
 */

import { v, ConvexError } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
  internalAction,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { checksumToken } from "./lib/pure";

// Prices are the source of truth in src/lib/packs.ts; the checkout route (which
// can import it) passes amountUsd in. We re-validate here against the allowed
// set so a tampered client can't create a $1 session for a $39 pack.
const ALLOWED_AMOUNTS_USD = [39, 99];

const CHECKOUT_WINDOW_MS = 60 * 60 * 1000;
const MAX_CHECKOUTS_PER_IP_PER_HOUR = 12;
// A charged purchase stuck in pending_payment this long (webhook never landed)
// gets reconciled against Stripe rather than lingering forever.
const PENDING_RECONCILE_MS = 15 * 60 * 1000;

function requireSharedSecret(provided: string): void {
  const expected = process.env.SERVER_SHARED_SECRET;
  if (!expected || provided !== expected) {
    throw new ConvexError("unauthorized");
  }
}

// ---------------------------------------------------------------------------
// Public mutations (guarded by SERVER_SHARED_SECRET)
// ---------------------------------------------------------------------------

export const createPending = mutation({
  args: {
    slug: v.string(),
    amountUsd: v.number(),
    title: v.string(),
    ipHash: v.optional(v.string()),
    secret: v.string(),
  },
  handler: async (ctx, args) => {
    requireSharedSecret(args.secret);

    const slug = args.slug.trim();
    if (!slug) throw new ConvexError("invalid_slug");

    // Anti-tampering: the client-facing price can only ever be one of the known
    // pack/bundle prices. Anything else means a manipulated request.
    if (!ALLOWED_AMOUNTS_USD.includes(args.amountUsd)) {
      throw new ConvexError("invalid_amount");
    }

    // Throttle guest checkout so a curl loop can't create unbounded
    // pending_payment rows + live Stripe sessions.
    if (args.ipHash) {
      const key = `checkout-ip:${args.ipHash}`;
      const now = Date.now();
      const existing = await ctx.db
        .query("rateLimits")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();
      if (!existing || now - existing.windowStart > CHECKOUT_WINDOW_MS) {
        if (existing) {
          await ctx.db.patch(existing._id, { windowStart: now, count: 1 });
        } else {
          await ctx.db.insert("rateLimits", { key, windowStart: now, count: 1 });
        }
      } else if (existing.count >= MAX_CHECKOUTS_PER_IP_PER_HOUR) {
        throw new ConvexError("rate_limited");
      } else {
        await ctx.db.patch(existing._id, { count: existing.count + 1 });
      }
    }

    const token = checksumToken();
    const purchaseId = await ctx.db.insert("purchases", {
      token,
      slug,
      title: args.title.slice(0, 200),
      status: "pending_payment",
      amountUsd: args.amountUsd,
      createdAt: Date.now(),
    });
    return { purchaseId, token };
  },
});

export const attachStripeSession = mutation({
  args: {
    purchaseId: v.id("purchases"),
    stripeSessionId: v.string(),
    secret: v.string(),
  },
  handler: async (ctx, args) => {
    requireSharedSecret(args.secret);
    const purchase = await ctx.db.get(args.purchaseId);
    if (!purchase) throw new ConvexError("not_found");
    await ctx.db.patch(args.purchaseId, {
      stripeSessionId: args.stripeSessionId,
    });
    return null;
  },
});

// ---------------------------------------------------------------------------
// Public query (token-keyed; safe fields only — never email / stripe ids)
// ---------------------------------------------------------------------------

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const purchase = await ctx.db
      .query("purchases")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!purchase) return null;
    // NEVER include email or stripe ids here — this is a public URL key.
    return {
      status: purchase.status,
      slug: purchase.slug,
      amountUsd: purchase.amountUsd,
      createdAt: purchase.createdAt,
      paidAt: purchase.paidAt,
    };
  },
});

// ---------------------------------------------------------------------------
// Internal: webhook / reconcile entry points
// ---------------------------------------------------------------------------

/** Webhook lookup — metadata.purchaseId arrives as a plain string. */
export const getByIdString = internalQuery({
  args: { purchaseId: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("purchases", args.purchaseId);
    if (!id) return null;
    return await ctx.db.get(id);
  },
});

/**
 * pending_payment -> paid, atomically and idempotently. A replayed webhook (or
 * a reconcile pass racing the webhook) is a no-op once status has advanced.
 * Schedules the delivery email inside the same mutation so both the webhook and
 * the reconcile path deliver exactly once.
 */
export const markPaid = internalMutation({
  args: {
    purchaseId: v.id("purchases"),
    stripeSessionId: v.string(),
    email: v.optional(v.string()),
    paymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const purchase = await ctx.db.get(args.purchaseId);
    if (!purchase || purchase.status !== "pending_payment") {
      return { transitioned: false };
    }
    // If a session was attached at checkout, it must match this event.
    if (
      purchase.stripeSessionId &&
      purchase.stripeSessionId !== args.stripeSessionId
    ) {
      return { transitioned: false };
    }
    const now = Date.now();
    await ctx.db.patch(args.purchaseId, {
      status: "paid",
      paidAt: now,
      stripeSessionId: args.stripeSessionId,
      ...(args.email ? { email: args.email } : {}),
      ...(args.paymentIntentId
        ? { stripePaymentIntentId: args.paymentIntentId }
        : {}),
    });
    if (args.email) {
      await ctx.scheduler.runAfter(0, internal.purchases.sendDeliveryEmail, {
        token: purchase.token,
        email: args.email,
        slug: purchase.slug,
      });
    }
    return { transitioned: true };
  },
});

/** async_payment_failed / expired: only a pending purchase can fail this way. */
export const markFailed = internalMutation({
  args: { purchaseId: v.id("purchases") },
  handler: async (ctx, args) => {
    const purchase = await ctx.db.get(args.purchaseId);
    if (!purchase || purchase.status !== "pending_payment") return null;
    await ctx.db.patch(args.purchaseId, { status: "failed" });
    return null;
  },
});

/**
 * Delivery email via Resend, env-gated. Scheduled by markPaid so both the
 * webhook and reconcile paths deliver. Failure is logged, never fatal — the
 * permanent /purchase/<token> link is the primary delivery channel.
 */
export const sendDeliveryEmail = internalAction({
  args: { token: v.string(), email: v.string(), slug: v.string() },
  handler: async (_ctx, args): Promise<null> => {
    const key = process.env.RESEND_API_KEY;
    if (!key) return null;
    const appUrl = (process.env.APP_URL ?? "https://clawmart.co").replace(
      /\/$/,
      ""
    );
    const link = `${appUrl}/purchase/${args.token}`;
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${key}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: "Clawmart <orders@clawmart.co>",
          to: [args.email],
          subject: "Your Clawmart pack is ready to download",
          html: [
            `<p>Thanks for your purchase. Your pack download is ready:</p>`,
            `<p><a href="${link}">${link}</a></p>`,
            `<p>Bookmark that link — it's your permanent download for this order.</p>`,
            `<p>Not what you expected? Reply within 14 days for a full refund.</p>`,
          ].join(""),
        }),
      });
      if (!res.ok) {
        console.log(`resend_email_failed status=${res.status}`);
      }
    } catch {
      console.log("resend_email_failed network");
    }
    return null;
  },
});

// ---------------------------------------------------------------------------
// Internal: reconcile cron (see crons.ts) — backstop for a lost webhook
// ---------------------------------------------------------------------------

/** Old pending_payment rows with a session attached — candidates to reconcile. */
export const stalePending = internalQuery({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - PENDING_RECONCILE_MS;
    const rows = await ctx.db
      .query("purchases")
      .filter((q) => q.eq(q.field("status"), "pending_payment"))
      .collect();
    return rows
      .filter((r) => r.createdAt < cutoff && r.stripeSessionId)
      .map((r) => ({ purchaseId: r._id, stripeSessionId: r.stripeSessionId! }));
  },
});

/** Terminal state for a pending purchase Stripe confirms was never paid. */
export const expirePending = internalMutation({
  args: { purchaseId: v.id("purchases") },
  handler: async (ctx, args) => {
    const purchase = await ctx.db.get(args.purchaseId);
    if (!purchase || purchase.status !== "pending_payment") return null;
    await ctx.db.patch(args.purchaseId, { status: "failed" });
    return null;
  },
});

/**
 * The crypto (USDC) rail was removed in the 2026-07-12 pivot, taking with it
 * the only pending->paid verification path for crypto orders. Any crypto row
 * still pending can never clear, so retire it — the delivery page then shows
 * the honest "storefront closed, email support" state instead of spinning on
 * "Confirming your payment…" forever. (No crypto order ever completed.)
 */
export const expireStaleCryptoPending = internalMutation({
  args: {},
  handler: async (ctx): Promise<null> => {
    const cutoff = Date.now() - PENDING_RECONCILE_MS;
    const rows = await ctx.db
      .query("purchases")
      .filter((q) => q.eq(q.field("status"), "pending_payment"))
      .collect();
    for (const row of rows) {
      if (row.paymentMethod === "crypto" && row.createdAt < cutoff) {
        await ctx.db.patch(row._id, { status: "failed" });
      }
    }
    return null;
  },
});

/**
 * Reconcile pending_payment rows against Stripe — the backstop for a webhook
 * that never arrived. Uses the Stripe REST API directly (raw fetch works in the
 * Convex runtime; STRIPE_SECRET_KEY lives in Convex env for this). Opt-in: if
 * the key is unset this is a no-op and the webhook is the only fulfillment path.
 * A confirmed-paid session is fulfilled via markPaid (idempotent); a confirmed-
 * expired session is retired. Anything ambiguous is left for the next pass
 * (Stripe retries its own webhooks for ~3 days).
 */
export const reconcilePending = internalAction({
  args: {},
  handler: async (ctx): Promise<null> => {
    // Crypto retirement runs regardless of Stripe config — it has no
    // dependency on the Stripe key.
    await ctx.runMutation(internal.purchases.expireStaleCryptoPending, {});

    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return null; // reconciliation is opt-in; webhook is primary
    const pending = await ctx.runQuery(internal.purchases.stalePending, {});
    for (const { purchaseId, stripeSessionId } of pending) {
      let session: {
        payment_status?: string;
        status?: string;
        customer_details?: { email?: string };
        payment_intent?: string;
      } | null = null;
      try {
        const res = await fetch(
          `https://api.stripe.com/v1/checkout/sessions/${stripeSessionId}`,
          { headers: { authorization: `Bearer ${key}` } }
        );
        if (res.ok) session = await res.json();
      } catch {
        continue; // transient — retry next pass
      }
      if (!session) continue;
      if (session.payment_status === "paid") {
        await ctx.runMutation(internal.purchases.markPaid, {
          purchaseId,
          stripeSessionId,
          email: session.customer_details?.email ?? undefined,
          paymentIntentId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : undefined,
        });
      } else if (session.status === "expired") {
        await ctx.runMutation(internal.purchases.expirePending, { purchaseId });
      }
    }
    return null;
  },
});
