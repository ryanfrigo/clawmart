"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Printer } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { ReportResult } from "../../../convex/lib/pure";
import { Button } from "@/components/ui/button";
import { IntervalBand } from "@/components/report/interval-band";
import { ShareOfVoice } from "@/components/report/share-of-voice";
import { AeoAudit } from "@/components/report/aeo-audit";
import { FixKit } from "@/components/report/fix-kit";
import { Transcripts } from "@/components/report/transcripts";
import { WaitlistForm } from "@/components/home/waitlist-form";
import {
  buildDisclaimer,
  formatPct,
  NON_AFFILIATION,
  REFUND_LINE,
  SUPPORT_EMAIL,
} from "@/components/site/constants";

/** Shape of api.reports.getByToken per docs/BUILD-CONTRACT.md. */
type ReportDoc = {
  status:
    | "pending_payment"
    | "paid"
    | "generating"
    | "complete"
    | "failed"
    | "refund_flagged";
  domain: string;
  brandName: string;
  category: string;
  competitors: string[];
  promptSetVersion: string;
  chunksTotal: number;
  chunksDone: number;
  result?: ReportResult;
  createdAt: number;
  paidAt?: number;
  completedAt?: number;
};

export function ReportView({ token }: { token: string }) {
  const report = useQuery(api.reports.getByToken, { token }) as
    | ReportDoc
    | null
    | undefined;

  if (report === undefined) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-24 sm:px-6" aria-busy="true">
        <div className="shimmer-line h-8 w-2/3 rounded-lg" />
        <div className="shimmer-line mt-4 h-5 w-1/2 rounded-lg" />
        <div className="shimmer-line mt-10 h-40 rounded-2xl" />
        <div className="shimmer-line mt-4 h-40 rounded-2xl" />
      </div>
    );
  }

  if (report === null) {
    return (
      <StatusShell
        eyebrow="Not found"
        title="No report lives at this address."
        tone="neutral"
      >
        <p>
          Check that you pasted the full link from your receipt or success
          page. If you bought a kit and the link doesn&apos;t work, email{" "}
          <SupportLink subject="Report link not working" /> and we&apos;ll sort
          it out.
        </p>
      </StatusShell>
    );
  }

  switch (report.status) {
    case "pending_payment":
      return (
        <StatusShell
          eyebrow={report.domain}
          title="Confirming your payment…"
          tone="working"
        >
          <p>
            Stripe is processing your payment. This usually takes a few
            seconds, and this page updates by itself — no refresh needed.
          </p>
          <p className="mt-3">
            <strong className="font-medium text-foreground">
              Bookmark this URL.
            </strong>{" "}
            It&apos;s the permanent home of your report, whether or not the
            email arrives.
          </p>
          <p className="mt-3">
            Stuck for more than a few minutes? Email{" "}
            <SupportLink subject={`Payment pending — ${report.domain}`} />.
          </p>
        </StatusShell>
      );

    case "paid":
      return (
        <StatusShell
          eyebrow={report.domain}
          title="Payment received. Your audit is queued."
          tone="working"
        >
          <p>
            We&apos;re starting the pipeline: crawl, prompt generation, then
            40 prompts × 3 model families × 3 runs. This page live-updates as
            it runs.
          </p>
          <p className="mt-3">{REFUND_LINE}</p>
        </StatusShell>
      );

    case "generating": {
      const pct =
        report.chunksTotal > 0
          ? Math.round((report.chunksDone / report.chunksTotal) * 100)
          : 0;
      return (
        <StatusShell
          eyebrow={report.domain}
          title="Sampling the models…"
          tone="working"
        >
          <div
            className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={report.chunksDone}
            aria-valuemin={0}
            aria-valuemax={report.chunksTotal}
          >
            <div
              className="h-full rounded-full bg-lobster transition-[width] duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2.5 font-mono text-[12.5px] text-muted-foreground">
            {report.chunksDone}/{report.chunksTotal} prompts sampled · {pct}%
          </p>
          <p className="mt-4">
            Each prompt runs against 3 model families, 3 times each — real
            model calls take a little while. Keep this tab open or come back;
            the URL is permanent, and we&apos;ll email your receipt address
            when it&apos;s done.
          </p>
        </StatusShell>
      );
    }

    case "refund_flagged":
      // The customer paid and we couldn't deliver — a refund is owed.
      return (
        <StatusShell
          eyebrow={report.domain}
          title="We couldn't finish your report. We're sorry."
          tone="error"
        >
          <p>
            Generation failed on our side, and{" "}
            <strong className="font-medium text-foreground">
              we&apos;ve flagged your purchase for an automatic refund
            </strong>{" "}
            — you don&apos;t need to ask for it.
          </p>
          <p className="mt-3">
            If you&apos;d rather we retry, or the refund doesn&apos;t show
            within a few business days, email{" "}
            <SupportLink
              subject={`Refund — ${report.domain} (${token.slice(0, 8)})`}
            />
            .
          </p>
        </StatusShell>
      );

    case "failed":
      // No successful charge (payment failed, expired, or never completed).
      // Do NOT promise a refund — there is nothing to refund.
      return (
        <StatusShell
          eyebrow={report.domain}
          title="This order didn't go through."
          tone="error"
        >
          <p>
            We never received a completed payment for this report, so nothing
            was charged. If you still want your AI Visibility Fix Kit, start a
            fresh check from the{" "}
            <Link href="/" className="text-lobster underline-offset-2 hover:underline">
              homepage
            </Link>
            .
          </p>
          <p className="mt-3">
            If you believe you <em>were</em> charged, email{" "}
            <SupportLink
              subject={`Charged but no report — ${report.domain} (${token.slice(0, 8)})`}
            />{" "}
            and we&apos;ll sort it out.
          </p>
        </StatusShell>
      );

    case "complete":
      return <CompleteReport report={report} token={token} />;
  }
}

/* ---------------- status shell ---------------- */

function StatusShell({
  eyebrow,
  title,
  tone,
  children,
}: {
  eyebrow: string;
  title: string;
  tone: "working" | "error" | "neutral";
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-24 sm:px-6">
      <div
        className={`anim-rise rounded-2xl border p-8 sm:p-10 ${
          tone === "error"
            ? "border-destructive/35 bg-destructive/[0.06]"
            : "border-border bg-card/50"
        }`}
      >
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
          {eyebrow}
        </p>
        <h1 className="mt-3 font-display text-3xl tracking-tight sm:text-4xl">
          {title}
        </h1>
        <div className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
          {children}
        </div>
      </div>
    </div>
  );
}

function SupportLink({ subject }: { subject: string }) {
  return (
    <a
      href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`}
      className="text-lobster underline underline-offset-4"
    >
      {SUPPORT_EMAIL}
    </a>
  );
}

/* ---------------- complete report ---------------- */

function SectionHeading({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-lobster">
        {index}
      </p>
      <h2 className="mt-1.5 font-display text-3xl tracking-tight">{title}</h2>
      {children && (
        <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
          {children}
        </p>
      )}
    </div>
  );
}

function CompleteReport({ report, token }: { report: ReportDoc; token: string }) {
  const result = report.result;

  if (!result) {
    return (
      <StatusShell
        eyebrow={report.domain}
        title="Report data is missing."
        tone="error"
      >
        <p>
          This report is marked complete but its results didn&apos;t load.
          Email <SupportLink subject={`Missing results — ${report.domain}`} />{" "}
          and we&apos;ll fix or refund it.
        </p>
      </StatusShell>
    );
  }

  const disclaimer =
    result.methodologyNote ||
    buildDisclaimer({
      measuredAt: result.measuredAt,
      modelIds: result.models.map((m) => m.id),
      runsPerPrompt: 3,
    });

  const measuredDate = new Date(result.measuredAt).toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-4xl px-5 py-16 sm:px-6">
      {/* header */}
      <header className="border-b border-border pb-10">
        <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-lobster">
          AI Visibility Fix Kit · prompt set {result.promptSetVersion}
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
            {report.domain}
          </h1>
          <Button
            variant="secondary"
            onClick={() => window.print()}
            className="print:hidden"
          >
            <Printer className="size-4" />
            Print / save PDF
          </Button>
        </div>
        <p className="mt-4 font-mono text-[12.5px] leading-relaxed text-muted-foreground">
          brand: {report.brandName} · category: {report.category}{" "}
          <span className="text-muted-foreground/60">(inferred)</span> ·
          measured: {measuredDate}
        </p>
      </header>

      {/* 01 — scores */}
      <section className="border-b border-border py-12">
        <SectionHeading index="01 — Mention scores" title="How often do the models mention you?">
          The band is a 95% Wilson confidence interval — with this many
          samples, trust the band, not the point.
        </SectionHeading>

        <div className="grid gap-4 sm:grid-cols-2">
          <ScoreCard
            title="Search-grounded models"
            note="answers backed by live web search"
            tone="tide"
            block={result.overall.grounded}
            brandName={report.brandName}
          />
          <ScoreCard
            title="Model knowledge"
            note="no live browsing — what the model 'remembers'"
            tone="sand"
            block={result.overall.ungrounded}
            brandName={report.brandName}
          />
        </div>

        {/* per-model breakdown */}
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card/40">
          <table className="w-full min-w-[34rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="p-4 font-mono text-[11px] font-normal uppercase tracking-[0.14em] text-muted-foreground">
                  Model
                </th>
                <th className="p-4 font-mono text-[11px] font-normal uppercase tracking-[0.14em] text-muted-foreground">
                  Mode
                </th>
                <th className="p-4 font-mono text-[11px] font-normal uppercase tracking-[0.14em] text-muted-foreground">
                  Mentions
                </th>
                <th className="w-2/5 p-4 font-mono text-[11px] font-normal uppercase tracking-[0.14em] text-muted-foreground">
                  Rate (95% interval)
                </th>
              </tr>
            </thead>
            <tbody>
              {result.models.map((m) => (
                <tr key={m.id} className="border-b border-border/60 last:border-0">
                  <td className="p-4 font-mono text-[12.5px]">{m.id}</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.08em] ${
                        m.grounded
                          ? "border-tide/40 bg-tide/10 text-tide"
                          : "border-sand/40 bg-sand/10 text-sand"
                      }`}
                    >
                      {m.grounded ? "search-grounded" : "model knowledge"}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-[12.5px]">
                    {m.mentions}/{m.samples}
                  </td>
                  <td className="p-4">
                    <IntervalBand interval={m.interval} tone={m.grounded ? "tide" : "sand"} compact />
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                      {formatPct(m.interval.low)}–{formatPct(m.interval.high)} ·
                      point {formatPct(m.interval.point)}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* mandatory score-adjacent disclaimer */}
        <p className="mt-5 border-l-2 border-lobster/40 pl-4 text-[12.5px] leading-relaxed text-muted-foreground">
          {disclaimer}
        </p>
      </section>

      {/* 02 — findings */}
      {result.topFindings.length > 0 && (
        <section className="border-b border-border py-12">
          <SectionHeading index="02 — Findings" title="What stands out" />
          <ul className="space-y-3.5">
            {result.topFindings.map((f, i) => (
              <li key={i} className="flex gap-3.5 text-[14.5px] leading-relaxed">
                <span className="mt-[8px] size-1.5 shrink-0 rounded-full bg-lobster" aria-hidden="true" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 03 — share of voice */}
      <section className="border-b border-border py-12">
        <SectionHeading index="03 — Share of voice" title="Who gets named instead?" />
        <ShareOfVoice rows={result.shareOfVoice} />
      </section>

      {/* 04 — the fix kit */}
      <section className="border-b border-border py-12">
        <SectionHeading index="04 — The Fix Kit" title="Paste these, in this order.">
          Ordered by expected impact for your situation. Copy buttons copy the
          full artifact.
        </SectionHeading>
        <FixKit fixes={result.fixes} />
      </section>

      {/* 05 — AEO audit */}
      <section className="border-b border-border py-12">
        <SectionHeading index="05 — AEO audit" title="Is your site readable by answer engines?">
          Checked against your live homepage at generation time.
        </SectionHeading>
        <AeoAudit items={result.aeoAudit} />
      </section>

      {/* 06 — transcripts */}
      <section className="border-b border-border py-12">
        <SectionHeading index="06 — Transcript appendix" title="Every sampled answer, verbatim.">
          The raw evidence behind every number above — exact model IDs,
          timestamps, and citations included. Click any row to read the full
          answer.
        </SectionHeading>
        <Transcripts token={token} brandName={report.brandName} />
      </section>

      {/* footer: methodology, waitlist, refund */}
      <footer className="space-y-8 py-12">
        <p className="text-[13.5px] leading-relaxed text-muted-foreground">
          How the sampling, scoring, and tiers work — including limitations —
          is public:{" "}
          <Link
            href="/methodology"
            className="text-foreground underline underline-offset-4 hover:text-lobster"
          >
            clawmart.co/methodology
          </Link>
          .
        </p>

        <div className="rounded-2xl border border-border bg-card/50 p-6 sm:p-7 print:hidden">
          <h2 className="font-display text-2xl tracking-tight">
            Want a fresh audit of {report.domain} every month?
          </h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
            We&apos;re weighing monthly fix drops — re-run the prompts, diff
            the scores, ship new fixes. Join the waitlist and we&apos;ll build
            it if enough buyers want it.
          </p>
          <div className="mt-4">
            <WaitlistForm source="report" domain={report.domain} />
          </div>
        </div>

        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          {REFUND_LINE} Questions? Email{" "}
          <SupportLink subject={`Fix Kit — ${report.domain}`} />.{" "}
          {NON_AFFILIATION}
        </p>
      </footer>
    </div>
  );
}

function ScoreCard({
  title,
  note,
  tone,
  block,
  brandName,
}: {
  title: string;
  note: string;
  tone: "tide" | "sand";
  block: { samples: number; mentions: number; interval: { low: number; high: number; point: number } };
  brandName: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/50 p-6 sm:p-7">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.08em] ${
            tone === "tide"
              ? "border-tide/40 bg-tide/10 text-tide"
              : "border-sand/40 bg-sand/10 text-sand"
          }`}
        >
          {title}
        </span>
      </div>
      <p className="mt-1.5 text-[12px] text-muted-foreground">{note}</p>
      <p className="mt-4 font-display text-5xl tracking-tight">
        {formatPct(block.interval.point)}
      </p>
      <p className="mt-1 font-mono text-[12px] text-muted-foreground">
        {block.mentions}/{block.samples} answers mentioned {brandName}
      </p>
      <div className="mt-4">
        <IntervalBand interval={block.interval} tone={tone} />
      </div>
    </div>
  );
}
