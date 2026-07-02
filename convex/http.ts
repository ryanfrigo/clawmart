/**
 * Convex HTTP router — Stripe webhook.
 *
 * POST /stripe/webhook
 * - signature verified with constructEventAsync (SubtleCrypto provider —
 *   required in Convex's runtime) against STRIPE_WEBHOOK_SECRET (Convex env)
 * - idempotent by report status: any status other than "pending_payment"
 *   makes every event a no-op (see webhookDecision in lib/pure.ts)
 * - 200 for every handled/ignored event; 400 only on a bad signature
 */

import { httpRouter } from "convex/server";
import Stripe from "stripe";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { webhookDecision } from "./lib/pure";

const HANDLED_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
];

const http = httpRouter();

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
    // The API key is unused for signature verification; webhooks only need
    // the webhook secret. Convex env intentionally has no STRIPE_SECRET_KEY.
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
    const reportIdRaw = session.metadata?.reportId;
    if (!reportIdRaw) {
      return new Response("no reportId in metadata", { status: 200 });
    }

    const report = await ctx.runQuery(internal.reports.getByIdString, {
      reportId: reportIdRaw,
    });
    if (!report) {
      return new Response("unknown report", { status: 200 });
    }

    const decision = webhookDecision(
      event.type,
      session.payment_status ?? null,
      report.status
    );

    if (decision === "fulfill") {
      // markPaid re-checks status atomically and schedules
      // internal.pipeline.start — a replayed event is a no-op.
      await ctx.runMutation(internal.reports.markPaid, {
        reportId: report._id,
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
      await ctx.runMutation(internal.reports.markPaymentFailed, {
        reportId: report._id,
      });
    }

    return new Response("ok", { status: 200 });
  }),
});

export default http;
