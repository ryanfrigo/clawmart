/**
 * Scheduled jobs.
 *
 * - Reconcile (every 15 min): pending_payment rows whose webhook may have been
 *   lost are checked directly against Stripe (fulfilled or retired). No-op
 *   unless STRIPE_SECRET_KEY is set in the Convex env — the webhook is primary.
 *
 * No watchdog: a purchase is delivered instantly on markPaid (there is no
 * generation pipeline that could stall).
 */

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "reconcile: recover pending_payment via Stripe",
  { minutes: 15 },
  internal.purchases.reconcilePending,
  {}
);

// Studio watchdog: a crashed build pipeline leaves a company stuck in
// "building" (which blocks rebuild). Fail builds with no activity for 10 min.
crons.interval(
  "studio: fail stalled builds",
  { minutes: 10 },
  internal.companies.failStaleBuilds,
  {}
);

// Daily CEO check-in: one honest note per live company into its feed, plus a
// morning digest email per owner (env-gated on RESEND_API_KEY).
// 14:00 UTC ≈ 7am PT — a morning email for US founders.
crons.daily(
  "studio: CEO daily check-in",
  { hourUTC: 14, minuteUTC: 0 },
  internal.checkins.dailyCheckins,
  {}
);

export default crons;
