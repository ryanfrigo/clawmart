import Stripe from "stripe";

let stripe: Stripe | null = null;

/**
 * Server-side Stripe client (lazy singleton so builds don't require the key).
 * Used only by the checkout route; the webhook lives in Convex (convex/http.ts).
 */
export function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    stripe = new Stripe(key, {
      apiVersion: "2026-01-28.clover",
    });
  }
  return stripe;
}
