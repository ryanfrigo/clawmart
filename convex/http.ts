/**
 * Convex HTTP router — Convex Auth, the Stripe webhook, and the dev-box audit
 * callback. The three are independent; auth routes are ADDED to this router,
 * never in place of anything (a legacy pack delivery must keep working whether
 * or not anyone is signed in).
 *
 * auth.addHttpRoutes adds, under this deployment's .convex.site origin:
 *   GET /.well-known/openid-configuration
 *   GET /.well-known/jwks.json
 * plus /api/auth/signin/* and /api/auth/callback/* once an OAuth provider is
 * configured. None of those collide with the two routes defined below.
 *
 * POST /stripe/webhook
 * - signature verified with constructEventAsync (SubtleCrypto provider —
 *   required in Convex's runtime) against STRIPE_WEBHOOK_SECRET (Convex env)
 * - idempotent by purchase status: any status other than "pending_payment"
 *   makes every event a no-op (see webhookDecision in lib/pure.ts)
 * - 200 for every handled/ignored event; 400 only on a bad signature
 */

import { httpRouter } from "convex/server";
import Stripe from "stripe";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";
import { webhookDecision } from "./lib/pure";

const HANDLED_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
];

const http = httpRouter();

// Sign-in / token refresh / JWKS. Added first so it is obvious these are
// additive: everything below is untouched by auth being on or off.
auth.addHttpRoutes(http);

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Audit callback from a dev box. Authenticated by the box's per-box secret
// (sha-256 compared against devBoxes.callbackSecretHash) — never a user session.
// Writes into the same agentEvents feed the Studio already renders.
http.route({
  path: "/box/event",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = request.headers.get("x-clawmart-box-secret");
    if (!secret) return new Response("missing secret", { status: 401 });

    let payload: { boxId?: string; kind?: string; text?: string };
    try {
      payload = await request.json();
    } catch {
      return new Response("bad json", { status: 400 });
    }
    const boxId = payload.boxId;
    if (!boxId) return new Response("no boxId", { status: 400 });

    const box = await ctx.runQuery(internal.boxes.getByBoxId, { boxId });
    // Only a live box with an active callback credential may write to the feed —
    // a terminated/failed box has its hash cleared, so leaked secrets go dead.
    if (!box || box.status !== "running" || !box.callbackSecretHash) {
      return new Response("unknown box", { status: 404 });
    }
    if (!timingSafeEqual(await sha256Hex(secret), box.callbackSecretHash)) {
      return new Response("bad secret", { status: 401 });
    }

    const kind = payload.kind === "output" ? "output" : "status";
    await ctx.runMutation(internal.boxes.recordBoxEvent, {
      boxId,
      kind,
      text: typeof payload.text === "string" ? payload.text : "",
    });
    return new Response("ok", { status: 200 });
  }),
});

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = request.headers.get("stripe-signature");
    if (!webhookSecret || !signature) {
      return new Response("missing signature", { status: 400 });
    }

    const body = await request.text();
    // The API key is unused for signature verification; webhooks only need the
    // webhook secret. STRIPE_SECRET_KEY in Convex env is optional (reconcile).
    const stripe = new Stripe(
      process.env.STRIPE_SECRET_KEY ?? "sk_unused_webhook_verification_only"
    );

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret,
        undefined,
        Stripe.createSubtleCryptoProvider()
      );
    } catch {
      return new Response("invalid signature", { status: 400 });
    }

    if (!HANDLED_EVENTS.includes(event.type)) {
      return new Response("ignored", { status: 200 });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const purchaseIdRaw = session.metadata?.purchaseId;
    if (!purchaseIdRaw) {
      return new Response("no purchaseId in metadata", { status: 200 });
    }

    const purchase = await ctx.runQuery(internal.purchases.getByIdString, {
      purchaseId: purchaseIdRaw,
    });
    if (!purchase) {
      return new Response("unknown purchase", { status: 200 });
    }

    const decision = webhookDecision(
      event.type,
      session.payment_status ?? null,
      purchase.status
    );

    if (decision === "fulfill") {
      // markPaid re-checks status atomically and schedules the delivery email —
      // a replayed event is a no-op.
      await ctx.runMutation(internal.purchases.markPaid, {
        purchaseId: purchase._id,
        stripeSessionId: session.id,
        email:
          session.customer_details?.email ??
          session.customer_email ??
          undefined,
        paymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : undefined,
      });
    } else if (decision === "fail") {
      await ctx.runMutation(internal.purchases.markFailed, {
        purchaseId: purchase._id,
      });
    }

    return new Response("ok", { status: 200 });
  }),
});

export default http;
