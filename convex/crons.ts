/**
 * Scheduled jobs.
 *
 * - Watchdog (every 15 min): reports stuck in paid/generating for >45 min
 *   are marked refund_flagged (spec: auto-refund policy — generation
 *   failed/undelivered gets flagged for an immediate refund).
 * - Spend cleanup (daily): prune spend rows older than 30 days.
 */

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "watchdog: flag stuck reports for refund",
  { minutes: 15 },
  internal.reports.watchdog,
  {}
);

crons.daily(
  "spend: prune rows older than 30 days",
  { hourUTC: 3, minuteUTC: 17 },
  internal.spend.cleanup,
  {}
);

export default crons;
