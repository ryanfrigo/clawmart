/**
 * Pure, dependency-free helpers shared by the Convex functions.
 *
 * Slimmed to exactly what the pack-purchase flow needs: a token generator, an
 * email validator, and the Stripe webhook decision table (unit-tested by
 * Track C). Everything else from the prior AI-visibility build is gone.
 */

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

/** 128-bit random token as 32 hex chars, via crypto.getRandomValues. */
export function checksumToken(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

export function isValidEmail(email: string): boolean {
  if (typeof email !== "string") return false;
  const e = email.trim();
  if (e.length < 5 || e.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

// ---------------------------------------------------------------------------
// Stripe webhook decision table (pure — unit-tested by Track C)
// ---------------------------------------------------------------------------

export type WebhookDecision = "fulfill" | "fail" | "ignore";

/**
 * Idempotency lives here: any purchase status other than "pending_payment"
 * makes every event a no-op.
 */
export function webhookDecision(
  eventType: string,
  paymentStatus: string | null | undefined,
  purchaseStatus: string | null | undefined
): WebhookDecision {
  if (purchaseStatus !== "pending_payment") return "ignore";
  switch (eventType) {
    case "checkout.session.completed":
      return paymentStatus === "paid" ? "fulfill" : "ignore";
    case "checkout.session.async_payment_succeeded":
      return "fulfill";
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired":
      return "fail";
    default:
      return "ignore";
  }
}
