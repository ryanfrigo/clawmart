/**
 * Paid fulfillment pipeline. All internal; kicked off by the Stripe webhook
 * via internal.reports.markPaid.
 *
 * start          crawl + infer brand + build 40 prompts, persist, chain
 * processPrompt  1 prompt x 3 models x 3 runs (9 calls, allSettled);
 *                bounded retries (3 x 30s) then failed
 * finalize       Wilson scores, share-of-voice, fix-kit artifacts,
 *                ReportResult (exact contract shape), optional Resend email
 *
 * Chunk advancement + next-step scheduling live inside
 * internal.reports.recordChunk / setGenerating (atomic), so partial results
 * always survive and duplicated actions can't fork the chain.
 */

import { v } from "convex/values";
import { internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
  buildPaidPromptSet,
  buildDeterministicFixes,
  buildReportResult,
  classifyIntent,
  detectCompetitors,
  detectMention,
  PROMPT_SET_VERSION,
  type CrawlResult,
  type FixArtifact,
  type PromptSpec,
  type ReportResult,
  type SampleLite,
} from "./lib/pure";
import {
  COST_PER_CALL_USD,
  inferBrandContext,
  isMockMode,
  llmComplete,
  modelConfig,
  paidModels,
  stripJsonFences,
} from "./llm";

const RUNS_PER_PROMPT = 3;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 30_000;
const PAID_PROMPT_COUNT = 40;

// ---------------------------------------------------------------------------
// start
// ---------------------------------------------------------------------------

export const start = internalAction({
  args: { reportId: v.id("reports") },
  handler: async (ctx, args) => {
    const report = await ctx.runQuery(internal.reports.getById, {
      reportId: args.reportId,
    });
    if (!report || report.status !== "paid") return null;

    try {
      const crawl: CrawlResult = await ctx.runAction(internal.crawler.crawl, {
        domain: report.domain,
      });

      let { brandName, category, competitors } = report;
      if (!brandName || !category || competitors.length === 0) {
        const inferred = await inferBrandContext(ctx, {
          domain: report.domain,
          crawl,
        });
        brandName = brandName || inferred.brandName;
        category = category || inferred.category;
        competitors = competitors.length ? competitors : inferred.competitors;
      }

      const prompts = await generatePaidPrompts(ctx, {
        brandName,
        category,
        competitors,
      });

      await ctx.runMutation(internal.reports.setGenerating, {
        reportId: args.reportId,
        brandName,
        category,
        competitors,
        prompts,
        crawl,
        chunksTotal: prompts.length,
      });
    } catch (e) {
      await retryOrFail(ctx, args.reportId, e, (delay) =>
        ctx.scheduler.runAfter(delay, internal.pipeline.start, {
          reportId: args.reportId,
        })
      );
    }
    return null;
  },
});

/** 40 buyer-intent prompts: LLM in live mode, deterministic fixtures in mock. */
async function generatePaidPrompts(
  ctx: ActionCtx,
  args: { brandName: string; category: string; competitors: string[] }
): Promise<PromptSpec[]> {
  const deterministic = buildPaidPromptSet(args.category, args.competitors);
  if (isMockMode()) return deterministic;
  try {
    const budget = await ctx.runQuery(internal.spend.check, {
      projectedUsd: COST_PER_CALL_USD,
    });
    if (!budget.ok) return deterministic;
    const { ungrounded1 } = modelConfig();
    const { text } = await llmComplete(ctx, {
      model: ungrounded1,
      maxTokens: 2500,
      prompt: [
        `Generate exactly ${PAID_PROMPT_COUNT} short, realistic buyer-intent questions someone`,
        `might ask an AI assistant while researching ${args.category}.`,
        `Rules:`,
        `- Do NOT mention "${args.brandName}" in any question.`,
        `- Cover a spread: best-of, recommendations, comparisons, alternatives to`,
        `  ${args.competitors.slice(0, 3).join(", ") || "the market leaders"}, pricing,`,
        `  trust/reviews, integrations, and specific use cases (startup, agency, e-commerce, non-technical team).`,
        `- Each question under 25 words, phrased like a real user.`,
        `Reply with ONLY a JSON array of ${PAID_PROMPT_COUNT} strings, no markdown fences.`,
      ].join("\n"),
    });
    const parsed: unknown = JSON.parse(stripJsonFences(text));
    if (!Array.isArray(parsed)) return deterministic;
    const texts = parsed
      .filter((p): p is string => typeof p === "string" && p.trim().length > 5)
      .map((p) => p.trim().slice(0, 300));
    if (texts.length < 20) return deterministic;
    // Pad with deterministic templates if the model under-delivered.
    const merged = [...texts];
    for (const d of deterministic) {
      if (merged.length >= PAID_PROMPT_COUNT) break;
      if (!merged.includes(d.text)) merged.push(d.text);
    }
    return merged.slice(0, PAID_PROMPT_COUNT).map((t, i) => ({
      id: `${PROMPT_SET_VERSION}-paid-${String(i + 1).padStart(2, "0")}`,
      text: t,
      intent: classifyIntent(t),
    }));
  } catch {
    return deterministic;
  }
}

// ---------------------------------------------------------------------------
// processPrompt — one chunk
// ---------------------------------------------------------------------------

export const processPrompt = internalAction({
  args: { reportId: v.id("reports"), promptIndex: v.number() },
  handler: async (ctx, args) => {
    const report = await ctx.runQuery(internal.reports.getById, {
      reportId: args.reportId,
    });
    if (!report || report.status !== "generating") return null;
    // Stale/duplicate invocation — the chain lives at chunksDone.
    if (args.promptIndex !== report.chunksDone) return null;
    if (args.promptIndex >= report.chunksTotal) {
      await ctx.scheduler.runAfter(0, internal.pipeline.finalize, {
        reportId: args.reportId,
      });
      return null;
    }

    const prompt = report.prompts[args.promptIndex];
    const models = paidModels();

    try {
      const budget = await ctx.runQuery(internal.spend.check, {
        projectedUsd: models.length * RUNS_PER_PROMPT * COST_PER_CALL_USD,
      });
      if (!budget.ok) throw new Error("at_capacity");

      const jobs = models.flatMap((model) =>
        Array.from({ length: RUNS_PER_PROMPT }, (_, r) => ({
          model,
          run: r + 1,
        }))
      );
      // Each of the 9 calls retries itself once on a transient error, so a
      // single flaky call doesn't discard and re-bill the whole chunk.
      const settled = await Promise.allSettled(
        jobs.map((job) =>
          callWithRetry(() =>
            llmComplete(ctx, {
              model: job.model,
              prompt: prompt.text,
              maxTokens: 600,
              mock: isMockMode()
                ? {
                    brandName: report.brandName,
                    domain: report.domain,
                    category: report.category,
                    competitors: report.competitors,
                    seed: `${report.domain}|${prompt.id}|${job.run}`,
                  }
                : undefined,
            })
          )
        )
      );
      const firstFailure = settled.find(
        (s): s is PromiseRejectedResult => s.status === "rejected"
      );
      if (firstFailure) {
        throw firstFailure.reason instanceof Error
          ? firstFailure.reason
          : new Error("llm_call_failed");
      }

      const samples = jobs.map((job, i) => {
        const value = (settled[i] as PromiseFulfilledResult<{
          text: string;
          citedUrls: string[];
        }>).value;
        return {
          promptId: prompt.id,
          promptText: prompt.text,
          model: job.model.id,
          grounded: job.model.grounded,
          run: job.run,
          answer: value.text,
          brandMentioned: detectMention(
            value.text,
            report.brandName,
            report.domain
          ),
          competitorsMentioned: detectCompetitors(
            value.text,
            report.competitors
          ),
          citedUrls: value.citedUrls,
        };
      });

      // Persists the chunk AND schedules the next step atomically.
      await ctx.runMutation(internal.reports.recordChunk, {
        reportId: args.reportId,
        promptIndex: args.promptIndex,
        samples,
      });
    } catch (e) {
      await retryOrFail(ctx, args.reportId, e, (delay) =>
        ctx.scheduler.runAfter(delay, internal.pipeline.processPrompt, {
          reportId: args.reportId,
          promptIndex: args.promptIndex,
        })
      );
    }
    return null;
  },
});

// ---------------------------------------------------------------------------
// finalize
// ---------------------------------------------------------------------------

export const finalize = internalAction({
  args: { reportId: v.id("reports") },
  handler: async (ctx, args) => {
    const report = await ctx.runQuery(internal.reports.getById, {
      reportId: args.reportId,
    });
    if (!report || report.status !== "generating") return null;

    try {
      const sampleDocs = await ctx.runQuery(internal.reports.samplesForReport, {
        reportId: args.reportId,
      });
      const samples: SampleLite[] = sampleDocs.map((s) => ({
        promptId: s.promptId,
        model: s.model,
        grounded: s.grounded,
        answer: s.answer,
        brandMentioned: s.brandMentioned,
        competitorsMentioned: s.competitorsMentioned,
        citedUrls: s.citedUrls,
      }));
      if (samples.length === 0) throw new Error("no_samples");

      const crawl = (report.crawl ?? null) as CrawlResult | null;
      const fixes = await generateFixKit(ctx, { report, crawl });

      const result: ReportResult = buildReportResult({
        samples,
        models: paidModels().map((m) => ({ id: m.id, grounded: m.grounded })),
        brandName: report.brandName,
        domain: report.domain,
        competitors: report.competitors,
        crawl,
        fixes,
        prompts: report.prompts,
        promptSetVersion: report.promptSetVersion,
        measuredAt: Date.now(),
        runsPerPrompt: RUNS_PER_PROMPT,
      });

      const { transitioned } = await ctx.runMutation(
        internal.reports.complete,
        { reportId: args.reportId, result }
      );
      if (transitioned) {
        await sendReportEmail(report);
      }
    } catch (e) {
      await retryOrFail(ctx, args.reportId, e, (delay) =>
        ctx.scheduler.runAfter(delay, internal.pipeline.finalize, {
          reportId: args.reportId,
        })
      );
    }
    return null;
  },
});

// ---------------------------------------------------------------------------
// Fix kit generation
// ---------------------------------------------------------------------------

/**
 * Deterministic artifacts built from crawl data (JSON-LD, robots.txt,
 * outlines) in both modes; in live mode the copy-heavy artifacts
 * (answer capsule, FAQ) are rewritten by the LLM from crawl text, falling
 * back to the deterministic version per artifact.
 */
async function generateFixKit(
  ctx: ActionCtx,
  args: { report: Doc<"reports">; crawl: CrawlResult | null }
): Promise<FixArtifact[]> {
  const { report, crawl } = args;
  const fixes = buildDeterministicFixes({
    brandName: report.brandName,
    category: report.category,
    competitors: report.competitors,
    domain: report.domain,
    crawl,
  });
  if (isMockMode() || !crawl?.ok || !crawl.textExcerpt) return fixes;

  const budget = await ctx.runQuery(internal.spend.check, {
    projectedUsd: 2 * COST_PER_CALL_USD,
  });
  if (!budget.ok) return fixes;

  const { ungrounded1 } = modelConfig();
  const excerpt = crawl.textExcerpt.slice(0, 4000);

  const capsule = fixes.find((f) => f.id === "answer-capsule");
  if (capsule) {
    try {
      const { text } = await llmComplete(ctx, {
        model: ungrounded1,
        maxTokens: 250,
        prompt: [
          `Using ONLY facts present in this homepage text, write a 40-60 word "answer capsule":`,
          `a direct, factual answer to "What is ${report.brandName} and who is it for?".`,
          `No hype, no superlatives, no claims not supported by the text. If pricing or the`,
          `target customer isn't in the text, leave a [bracketed placeholder] for it.`,
          `Reply with the capsule text only.`,
          ``,
          `Homepage text:\n${excerpt}`,
        ].join("\n"),
      });
      if (text.trim().length > 40) {
        capsule.body =
          text.trim() +
          `\n\n— Place this as the first visible paragraph of your homepage. Answer engines ` +
          `quote pages that answer "what is ${report.brandName}?" directly.`;
      }
    } catch {
      // keep deterministic capsule
    }
  }

  const faq = fixes.find((f) => f.id === "faq-page");
  if (faq) {
    try {
      const { text } = await llmComplete(ctx, {
        model: ungrounded1,
        maxTokens: 1200,
        prompt: [
          `Using ONLY facts present in this homepage text, draft 5 FAQ entries for ${report.brandName}`,
          `(${report.category}). Questions buyers actually ask: what it is, who it's for, pricing,`,
          `how it compares to ${report.competitors[0] ?? "alternatives"}, how to start.`,
          `Where the text lacks a fact, write a [bracketed placeholder] instead of inventing one.`,
          `Reply with ONLY a JSON array of {"q": string, "a": string}, no markdown fences.`,
          ``,
          `Homepage text:\n${excerpt}`,
        ].join("\n"),
      });
      const parsed: unknown = JSON.parse(stripJsonFences(text));
      if (Array.isArray(parsed)) {
        const faqs = parsed
          .filter(
            (f): f is { q: string; a: string } =>
              typeof f === "object" &&
              f !== null &&
              typeof (f as { q?: unknown }).q === "string" &&
              typeof (f as { a?: unknown }).a === "string"
          )
          .slice(0, 6);
        if (faqs.length >= 3) {
          const jsonLd = {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          };
          faq.body =
            faqs.map((f) => `## ${f.q}\n\n${f.a}`).join("\n\n") +
            "\n\n---\n\n" +
            `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`;
        }
      }
    } catch {
      // keep deterministic FAQ
    }
  }

  return fixes;
}

// ---------------------------------------------------------------------------
// Retry helper + email
// ---------------------------------------------------------------------------

/** Retry a single LLM call once on a transient failure (mock never fails). */
async function callWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    return await fn();
  }
}

async function retryOrFail(
  ctx: ActionCtx,
  reportId: Doc<"reports">["_id"],
  error: unknown,
  reschedule: (delayMs: number) => Promise<unknown>
): Promise<void> {
  const attempts: number = await ctx.runMutation(
    internal.reports.bumpAttempts,
    { reportId }
  );
  if (attempts >= MAX_ATTEMPTS) {
    const msg = error instanceof Error ? error.message : "generation_failed";
    const safe = [
      "at_capacity",
      "llm_timeout",
      "llm_no_api_key",
      "no_samples",
    ].includes(msg)
      ? msg
      : msg.startsWith("llm_http_")
        ? msg
        : "generation_failed";
    await ctx.runMutation(internal.reports.markFailed, {
      reportId,
      error: safe,
    });
  } else {
    await reschedule(RETRY_DELAY_MS);
  }
}

/** Delivery email via Resend, env-gated. Failure never fails the report. */
async function sendReportEmail(report: Doc<"reports">): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !report.email) return;
  const appUrl = (process.env.APP_URL ?? "https://clawmart.co").replace(/\/$/, "");
  const reportUrl = `${appUrl}/report/${report.token}`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: "Clawmart Reports <reports@clawmart.co>",
        to: [report.email],
        subject: `Your AI Visibility Fix Kit for ${report.domain} is ready`,
        html: [
          `<p>Your AI Visibility Fix Kit for <strong>${report.domain}</strong> is ready:</p>`,
          `<p><a href="${reportUrl}">${reportUrl}</a></p>`,
          `<p>Bookmark that link — it's your permanent copy of the report, including every`,
          ` sampled answer and the ready-to-paste fixes.</p>`,
          `<p>Not what you expected? Reply to this email within 14 days for a no-questions refund.</p>`,
        ].join(""),
      }),
    });
    if (!res.ok) {
      console.log(`resend_email_failed status=${res.status}`);
    }
  } catch {
    console.log("resend_email_failed network");
  }
}
