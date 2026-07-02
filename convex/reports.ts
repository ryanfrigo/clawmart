/**
 * Paid Fix Kit reports.
 *
 * Public surface (exactly per BUILD-CONTRACT.md):
 * - api.reports.createPending      (secret-guarded; BEFORE Stripe session)
 * - api.reports.attachStripeSession (secret-guarded)
 * - api.reports.getByToken          (never returns email / stripe ids)
 * - api.reports.samplesByToken      (paginated transcript appendix)
 *
 * Everything else is internal pipeline state. Status machine:
 * pending_payment -> paid -> generating -> complete | failed | refund_flagged.
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
import {
  normalizeDomain,
  checksumToken,
  brandNameFromDomain,
  PROMPT_SET_VERSION,
} from "./lib/pure";

const SAMPLES_PAGE_SIZE = 25;
// Watchdog flags a report only when it has made NO progress for this long —
// measured from the last chunk (or payment), not total elapsed, so a slow but
// actively-advancing generation is never killed mid-run.
const STALE_PROGRESS_MS = 20 * 60 * 1000;
// A charged report stuck in pending_payment this long (webhook never landed)
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

const CHECKOUT_WINDOW_MS = 60 * 60 * 1000;
const MAX_CHECKOUTS_PER_IP_PER_HOUR = 12;

export const createPending = mutation({
  args: {
    domain: v.string(),
    checkId: v.optional(v.id("checks")),
    ipHash: v.optional(v.string()),
    secret: v.string(),
  },
  handler: async (ctx, args) => {
    requireSharedSecret(args.secret);
    const domain = normalizeDomain(args.domain);
    if (!domain) throw new ConvexError("invalid_domain");

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

    // Placeholders; the pipeline re-infers during generation if these are thin.
    let brandName = brandNameFromDomain(domain);
    let category = "";
    let competitors: string[] = [];
    if (args.checkId) {
      const check = await ctx.db.get(args.checkId);
      if (check && check.domain === domain && check.brandName) {
        brandName = check.brandName;
        category = check.category ?? "";
        competitors = check.competitors ?? [];
      }
    }

    const token = checksumToken();
    const reportId = await ctx.db.insert("reports", {
      token,
      domain,
      brandName,
      category,
      competitors,
      status: "pending_payment",
      promptSetVersion: PROMPT_SET_VERSION,
      prompts: [],
      chunksTotal: 0,
      chunksDone: 0,
      attempts: 0,
      createdAt: Date.now(),
    });
    return { reportId, token };
  },
});

export const attachStripeSession = mutation({
  args: {
    reportId: v.id("reports"),
    stripeSessionId: v.string(),
    secret: v.string(),
  },
  handler: async (ctx, args) => {
    requireSharedSecret(args.secret);
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new ConvexError("not_found");
    await ctx.db.patch(args.reportId, {
      stripeSessionId: args.stripeSessionId,
    });
    return null;
  },
});

// ---------------------------------------------------------------------------
// Public queries (token-keyed; safe fields only)
// ---------------------------------------------------------------------------

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const report = await ctx.db
      .query("reports")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!report) return null;
    // NEVER include stripe ids or email here.
    return {
      status: report.status,
      domain: report.domain,
      brandName: report.brandName,
      category: report.category,
      competitors: report.competitors,
      promptSetVersion: report.promptSetVersion,
      chunksTotal: report.chunksTotal,
      chunksDone: report.chunksDone,
      result: report.result,
      createdAt: report.createdAt,
      paidAt: report.paidAt,
      completedAt: report.completedAt,
    };
  },
});

export const samplesByToken = query({
  args: { token: v.string(), cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const report = await ctx.db
      .query("reports")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!report) {
      return { page: [], isDone: true, continueCursor: "" };
    }
    const result = await ctx.db
      .query("samples")
      .withIndex("by_report", (q) => q.eq("reportId", report._id))
      .paginate({ numItems: SAMPLES_PAGE_SIZE, cursor: args.cursor ?? null });
    return {
      page: result.page.map((s) => ({
        promptId: s.promptId,
        promptText: s.promptText,
        model: s.model,
        grounded: s.grounded,
        run: s.run,
        answer: s.answer,
        brandMentioned: s.brandMentioned,
        competitorsMentioned: s.competitorsMentioned,
        citedUrls: s.citedUrls,
        createdAt: s.createdAt,
      })),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

// ---------------------------------------------------------------------------
// Internal: webhook entry points
// ---------------------------------------------------------------------------

/** Webhook lookup — metadata.reportId arrives as a plain string. */
export const getByIdString = internalQuery({
  args: { reportId: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("reports", args.reportId);
    if (!id) return null;
    return await ctx.db.get(id);
  },
});

/**
 * pending_payment -> paid, atomically; schedules the pipeline inside the
 * same mutation so a webhook replay can never double-start fulfillment.
 */
export const markPaid = internalMutation({
  args: {
    reportId: v.id("reports"),
    stripeSessionId: v.string(),
    email: v.optional(v.string()),
    paymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report || report.status !== "pending_payment") {
      return { transitioned: false };
    }
    // If a session was attached at checkout, it must match this event.
    if (report.stripeSessionId && report.stripeSessionId !== args.stripeSessionId) {
      return { transitioned: false };
    }
    const nowPaid = Date.now();
    await ctx.db.patch(args.reportId, {
      status: "paid",
      paidAt: nowPaid,
      lastProgressAt: nowPaid,
      stripeSessionId: args.stripeSessionId,
      ...(args.email ? { email: args.email } : {}),
      ...(args.paymentIntentId
        ? { stripePaymentIntentId: args.paymentIntentId }
        : {}),
    });
    await ctx.scheduler.runAfter(0, internal.pipeline.start, {
      reportId: args.reportId,
    });
    return { transitioned: true };
  },
});

/** async_payment_failed / expired: only a pending report can fail this way. */
export const markPaymentFailed = internalMutation({
  args: { reportId: v.id("reports") },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report || report.status !== "pending_payment") return null;
    await ctx.db.patch(args.reportId, {
      status: "failed",
      error: "payment_failed_or_expired",
    });
    return null;
  },
});

// ---------------------------------------------------------------------------
// Internal: pipeline state
// ---------------------------------------------------------------------------

export const getById = internalQuery({
  args: { reportId: v.id("reports") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.reportId);
  },
});

export const samplesForReport = internalQuery({
  args: { reportId: v.id("reports") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("samples")
      .withIndex("by_report", (q) => q.eq("reportId", args.reportId))
      .collect();
  },
});

/**
 * paid -> generating with the crawl + prompt set persisted. Schedules the
 * first chunk inside the mutation (atomic with the transition) so two racing
 * pipeline.start actions cannot double-schedule the chain.
 */
export const setGenerating = internalMutation({
  args: {
    reportId: v.id("reports"),
    brandName: v.string(),
    category: v.string(),
    competitors: v.array(v.string()),
    prompts: v.array(
      v.object({ id: v.string(), text: v.string(), intent: v.string() })
    ),
    crawl: v.any(),
    chunksTotal: v.number(),
  },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report || report.status !== "paid") return { transitioned: false };
    await ctx.db.patch(args.reportId, {
      status: "generating",
      brandName: args.brandName,
      category: args.category,
      competitors: args.competitors,
      prompts: args.prompts,
      crawl: args.crawl,
      chunksTotal: args.chunksTotal,
      chunksDone: 0,
      attempts: 0,
      lastProgressAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.pipeline.processPrompt, {
      reportId: args.reportId,
      promptIndex: 0,
    });
    return { transitioned: true };
  },
});

const sampleValidator = v.object({
  promptId: v.string(),
  promptText: v.string(),
  model: v.string(),
  grounded: v.boolean(),
  run: v.number(),
  answer: v.string(),
  brandMentioned: v.boolean(),
  competitorsMentioned: v.array(v.string()),
  citedUrls: v.array(v.string()),
});

/**
 * Persist one chunk (1 prompt x 3 models x 3 runs), advance the cursor, and
 * schedule the next step — all in one transaction so partial progress
 * survives any action crash.
 */
export const recordChunk = internalMutation({
  args: {
    reportId: v.id("reports"),
    promptIndex: v.number(),
    samples: v.array(sampleValidator),
  },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report || report.status !== "generating") return null;
    // Stale or duplicate chunk delivery — ignore.
    if (args.promptIndex !== report.chunksDone) return null;

    const now = Date.now();
    for (const s of args.samples) {
      await ctx.db.insert("samples", {
        reportId: args.reportId,
        ...s,
        createdAt: now,
      });
    }
    const chunksDone = report.chunksDone + 1;
    await ctx.db.patch(args.reportId, {
      chunksDone,
      attempts: 0,
      lastProgressAt: now,
    });
    if (chunksDone >= report.chunksTotal) {
      await ctx.scheduler.runAfter(0, internal.pipeline.finalize, {
        reportId: args.reportId,
      });
    } else {
      await ctx.scheduler.runAfter(0, internal.pipeline.processPrompt, {
        reportId: args.reportId,
        promptIndex: chunksDone,
      });
    }
    return null;
  },
});

/** Bump the retry counter for the current step; returns the new count. */
export const bumpAttempts = internalMutation({
  args: { reportId: v.id("reports") },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) return 99;
    const attempts = report.attempts + 1;
    await ctx.db.patch(args.reportId, { attempts });
    return attempts;
  },
});

/**
 * The pipeline gave up on a PAID report. The customer was charged, so this
 * always lands in refund_flagged (the human refund queue) — never "failed",
 * which is reserved for reports that were never paid.
 */
export const markFailed = internalMutation({
  args: { reportId: v.id("reports"), error: v.string() },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) return null;
    if (report.status === "complete" || report.status === "refund_flagged") {
      return null;
    }
    await ctx.db.patch(args.reportId, {
      status: "refund_flagged",
      error: args.error.slice(0, 500),
    });
    return null;
  },
});

export const complete = internalMutation({
  args: { reportId: v.id("reports"), result: v.any() },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report || report.status !== "generating") return { transitioned: false };
    await ctx.db.patch(args.reportId, {
      status: "complete",
      result: args.result,
      completedAt: Date.now(),
      error: undefined,
    });
    return { transitioned: true };
  },
});

// ---------------------------------------------------------------------------
// Internal: watchdog cron (see crons.ts)
// ---------------------------------------------------------------------------

/**
 * A paid/generating report that has made NO progress for STALE_PROGRESS_MS is
 * genuinely stuck (crashed action, lost schedule) and gets refund-flagged. A
 * slow-but-advancing run keeps bumping lastProgressAt and is left alone.
 */
export const watchdog = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - STALE_PROGRESS_MS;
    for (const status of ["paid", "generating"] as const) {
      const rows = await ctx.db
        .query("reports")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
      for (const report of rows) {
        const lastProgress =
          report.lastProgressAt ?? report.paidAt ?? report.createdAt;
        if (lastProgress < cutoff) {
          await ctx.db.patch(report._id, {
            status: "refund_flagged",
            error:
              "Generation stalled — flagged for an automatic refund. No action needed on your side.",
          });
        }
      }
    }
    return null;
  },
});

/** Old pending_payment rows whose webhook may have been lost — to reconcile. */
export const stalePending = internalQuery({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - PENDING_RECONCILE_MS;
    const rows = await ctx.db
      .query("reports")
      .withIndex("by_status", (q) => q.eq("status", "pending_payment"))
      .collect();
    return rows
      .filter((r) => r.createdAt < cutoff && r.stripeSessionId)
      .map((r) => ({ reportId: r._id, stripeSessionId: r.stripeSessionId! }));
  },
});

/** Terminal state for a pending report Stripe confirms was never paid. */
export const expirePending = internalMutation({
  args: { reportId: v.id("reports") },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report || report.status !== "pending_payment") return null;
    await ctx.db.patch(args.reportId, {
      status: "failed",
      error: "payment_never_completed",
    });
    return null;
  },
});

/**
 * Reconcile pending_payment rows against Stripe — the backstop for a webhook
 * that never arrived. Uses the Stripe REST API directly (raw fetch works in
 * the Convex runtime; STRIPE_SECRET_KEY lives in Convex env for this).
 * A confirmed-paid session is fulfilled via markPaid (idempotent); a confirmed-
 * unpaid/expired session is retired. Anything ambiguous is left for the next
 * pass (Stripe retries its own webhooks for ~3 days).
 */
export const reconcilePending = internalAction({
  args: {},
  handler: async (ctx): Promise<null> => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return null; // reconciliation is opt-in; webhook is primary
    const pending = await ctx.runQuery(internal.reports.stalePending, {});
    for (const { reportId, stripeSessionId } of pending) {
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
        await ctx.runMutation(internal.reports.markPaid, {
          reportId,
          stripeSessionId,
          email: session.customer_details?.email ?? undefined,
          paymentIntentId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : undefined,
        });
      } else if (session.status === "expired") {
        await ctx.runMutation(internal.reports.expirePending, { reportId });
      }
    }
    return null;
  },
});
