import { NextRequest, NextResponse } from "next/server";
import { ConvexError } from "convex/values";
import type Stripe from "stripe";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { isBundle, priceForSlug, titleForSlug } from "@/lib/packs";
import { ipFromHeaders, ipHash } from "@/lib/request-ip";
import { getConvexClient } from "@/lib/convex-server";
import { getStripe } from "@/lib/stripe";

/**
 * POST /api/checkout — start a pack (or All-Access bundle) purchase.
 *
 * Body: { slug: string }
 * 200 { url }                       — Stripe Checkout URL to redirect to
 * 400 { error: "invalid_slug" }     — slug isn't a known pack or the bundle
 * 429 { error: "rate_limited" }     — per-IP rate limit tripped in Convex
 * 502 { error: "checkout_unavailable" } — Stripe error (safe message only)
 *
 * Order (per docs/PACKS-BUILD-CONTRACT.md): the purchase row (pending_payment)
 * is created BEFORE the Stripe session so the webhook can always resolve
 * metadata.purchaseId; the session id is attached right after creation.
 *
 * Price + title come from src/lib/packs.ts (the source of truth) — the client
 * only sends `slug`, so the charged amount can't be tampered with. Convex
 * re-validates amountUsd against the allowed set as a second guard.
 */
export async function POST(request: NextRequest) {
  let slug = "";
  try {
    const body = await request.json();
    slug = typeof body?.slug === "string" ? body.slug.trim() : "";
  } catch {
    // fall through to invalid_slug
  }

  const amountUsd = priceForSlug(slug);
  const title = titleForSlug(slug);
  if (amountUsd === null || title === null) {
    return NextResponse.json({ error: "invalid_slug" }, { status: 400 });
  }

  const secret = process.env.SERVER_SHARED_SECRET;
  if (!secret) {
    console.error("/api/checkout: SERVER_SHARED_SECRET is not set");
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin
  ).replace(/\/+$/, "");

  const convex = getConvexClient();

  // 1. Pre-create the purchase (status pending_payment) and get its token.
  let purchaseId: Id<"purchases">;
  let token: string;
  try {
    const pending = await convex.mutation(api.purchases.createPending, {
      slug,
      amountUsd,
      title,
      ipHash: ipHash(ipFromHeaders(request.headers), secret),
      secret,
    });
    purchaseId = pending.purchaseId;
    token = pending.token;
  } catch (err) {
    if (err instanceof ConvexError && err.data === "rate_limited") {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    console.error("/api/checkout: createPending failed", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  // 2. Create the Stripe Checkout Session (exact shape per build contract).
  // A canceled bundle checkout returns to the pricing section; a canceled pack
  // checkout returns to that pack's detail page.
  const cancelUrl = isBundle(slug)
    ? `${appUrl}/#pricing`
    : `${appUrl}/packs/${slug}?canceled=1`;

  let session: Stripe.Checkout.Session;
  try {
    session = await getStripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_creation: "always",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: title },
            unit_amount: amountUsd * 100,
          },
          quantity: 1,
        },
      ],
      metadata: { purchaseId, token },
      // Statement descriptor is set account-wide in the Stripe dashboard (see
      // docs/FLIP-TO-LIVE.md) — the per-PaymentIntent field is rejected for
      // card charges on modern API versions, so we don't set it here.
      success_url: `${appUrl}/purchase/${token}?paid=1`,
      cancel_url: cancelUrl,
    });
  } catch (err) {
    // Never surface raw Stripe errors to the client.
    console.error("/api/checkout: stripe session create failed", err);
    return NextResponse.json(
      { error: "checkout_unavailable" },
      { status: 502 }
    );
  }

  if (!session.url) {
    console.error("/api/checkout: stripe session has no url", session.id);
    return NextResponse.json(
      { error: "checkout_unavailable" },
      { status: 502 }
    );
  }

  // 3. Attach the session id for webhook idempotency. If this fails we still
  // return the URL — fulfillment resolves the purchase via metadata.purchaseId.
  try {
    await convex.mutation(api.purchases.attachStripeSession, {
      purchaseId,
      stripeSessionId: session.id,
      secret,
    });
  } catch (err) {
    console.error("/api/checkout: attachStripeSession failed", err);
  }

  return NextResponse.json({ url: session.url });
}
