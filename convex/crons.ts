/**
 * Scheduled jobs.
 *
 * - Watchdog (every 15 min): reports that made no progress for >20 min are
 *   marked refund_flagged (spec: auto-refund policy — a stalled generation
 *   gets flagged for an immediate refund).
 * - Reconcile (every 15 min): pending_payment rows whose webhook may have
 *   been lost are checked directly against Stripe (fulfilled or retired).
 * - Spend cleanup (daily): prune spend rows older than 30 days.
 */

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "watchdog: flag stalled reports for refund",
  { minutes: 15 },
  internal.reports.watchdog,
  {}
);

crons.interval(
  "reconcile: recover pending_payment via Stripe",
  { minutes: 15 },
  internal.reports.reconcilePending,
  {}
);

crons.daily(
  "spend: prune rows older than 30 days",
  { hourUTC: 3, minuteUTC: 17 },
  internal.spend.cleanup,
  {}
);

export default crons;
