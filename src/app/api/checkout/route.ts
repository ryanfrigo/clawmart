import { NextRequest, NextResponse } from "next/server";
import { ConvexError } from "convex/values";
import type Stripe from "stripe";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { normalizeDomain } from "../../../../convex/lib/pure";
import { getConvexClient } from "@/lib/convex-server";
import { getStripe } from "@/lib/stripe";

/**
 * POST /api/checkout — start a $49 Fix Kit purchase (guest checkout).
 *
 * Body: { domain: string, checkId?: Id<"checks"> }
 * 200 { url }  — Stripe Checkout URL to redirect to
 * 400 { error: "invalid_domain" }
 * 502 { error: "checkout_unavailable" }  — Stripe error (safe message only)
 *
 * Order matters (per docs/BUILD-CONTRACT.md): the report doc is pre-created
 * BEFORE the Stripe session so the webhook can always resolve
 * metadata.reportId; the session id is attached right after creation.
 */
export async function POST(request: NextRequest) {
  let rawDomain = "";
  let checkId: string | undefined;
  try {
    const body = await request.json();
    rawDomain = typeof body?.domain === "string" ? body.domain : "";
    checkId = typeof body?.checkId === "string" ? body.checkId : undefined;
  } catch {
    // fall through to invalid_domain
  }

  const domain = normalizeDomain(rawDomain);
  if (!domain) {
    return NextResponse.json({ error: "invalid_domain" }, { status: 400 });
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

  // 1. Pre-create the report (status pending_payment) and get its token.
  let reportId: Id<"reports">;
  let token: string;
  try {
    const pending = await convex.mutation(api.reports.createPending, {
      domain,
      ...(checkId ? { checkId: checkId as Id<"checks"> } : {}),
      secret,
    });
    reportId = pending.reportId;
    token = pending.token;
  } catch (err) {
    if (err instanceof ConvexError && err.data === "invalid_domain") {
      return NextResponse.json({ error: "invalid_domain" }, { status: 400 });
    }
    console.error("/api/checkout: createPending failed", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  // 2. Create the Stripe Checkout Session (exact shape per build contract).
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
            product_data: { name: `AI Visibility Fix Kit — ${domain}` },
            unit_amount: 4900,
          },
          quantity: 1,
        },
      ],
      metadata: { reportId, token },
      payment_intent_data: { statement_descriptor: "CLAWMART.CO" },
      success_url: `${appUrl}/report/${token}?paid=1`,
      cancel_url: `${appUrl}/?canceled=1`,
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
  // return the URL — fulfillment resolves the report via metadata.reportId.
  try {
    await convex.mutation(api.reports.attachStripeSession, {
      reportId,
      stripeSessionId: session.id,
      secret,
    });
  } catch (err) {
    console.error("/api/checkout: attachStripeSession failed", err);
  }

  return NextResponse.json({ url: session.url });
}
