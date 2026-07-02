"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";

type Sample = {
  promptId: string;
  promptText: string;
  model: string;
  grounded: boolean;
  run: number;
  answer: string;
  brandMentioned: boolean;
  competitorsMentioned: string[];
  citedUrls: string[];
  createdAt: number;
};

type PageResult = {
  page: Sample[];
  isDone: boolean;
  continueCursor: string;
};

/**
 * Transcript appendix — paginated via api.reports.samplesByToken.
 * Pages accumulate: each loaded cursor renders its own block, so earlier
 * samples never unmount when "Load more" is clicked.
 */
export function Transcripts({ token, brandName }: { token: string; brandName: string }) {
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);

  return (
    <div className="space-y-3">
      {cursors.map((cursor, i) => (
        <TranscriptPage
          key={cursor ?? "first"}
          token={token}
          cursor={cursor}
          brandName={brandName}
          isLast={i === cursors.length - 1}
          onLoadMore={(next) => setCursors((prev) => [...prev, next])}
        />
      ))}
    </div>
  );
}

function TranscriptPage({
  token,
  cursor,
  brandName,
  isLast,
  onLoadMore,
}: {
  token: string;
  cursor: string | undefined;
  brandName: string;
  isLast: boolean;
  onLoadMore: (next: string) => void;
}) {
  const result = useQuery(
    api.reports.samplesByToken,
    cursor !== undefined ? { token, cursor } : { token }
  ) as PageResult | undefined;

  if (result === undefined) {
    return (
      <div className="space-y-3" aria-label="Loading transcripts">
        {[0, 1, 2].map((i) => (
          <div key={i} className="shimmer-line h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <>
      {result.page.map((s) => (
        <SampleRow key={`${s.promptId}-${s.model}-${s.run}`} sample={s} brandName={brandName} />
      ))}
      {isLast && !result.isDone && (
        <div className="pt-2 print:hidden">
          <Button
            variant="secondary"
            onClick={() => onLoadMore(result.continueCursor)}
          >
            Load more transcripts
          </Button>
        </div>
      )}
      {isLast && result.isDone && result.page.length === 0 && cursor === undefined && (
        <p className="text-[13px] text-muted-foreground">
          No transcripts recorded for this report.
        </p>
      )}
    </>
  );
}

function SampleRow({ sample, brandName }: { sample: Sample; brandName: string }) {
  return (
    <details className="group rounded-xl border border-border bg-card/40 open:bg-card/60">
      <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1.5 p-4 [&::-webkit-details-marker]:hidden">
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.08em] ${
            sample.brandMentioned
              ? "border-kelp/40 bg-kelp/10 text-kelp"
              : "border-border bg-background/40 text-muted-foreground"
          }`}
        >
          {sample.brandMentioned ? `mentions ${brandName}` : "no mention"}
        </span>
        <span className="font-mono text-[11.5px] text-muted-foreground">
          {sample.model} · run {sample.run} ·{" "}
          {sample.grounded ? "search-grounded" : "model knowledge, no live browsing"}
        </span>
        <span className="min-w-0 flex-1 basis-full pt-1 text-[13.5px] text-foreground/90">
          “{sample.promptText}”
        </span>
      </summary>
      <div className="border-t border-border/60 p-4">
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">
          {sample.answer}
        </p>
        {sample.competitorsMentioned.length > 0 && (
          <p className="mt-3 font-mono text-[11.5px] text-muted-foreground">
            competitors named: {sample.competitorsMentioned.join(", ")}
          </p>
        )}
        {sample.citedUrls.length > 0 && (
          <div className="mt-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              cited
            </p>
            <ul className="mt-1 space-y-0.5">
              {sample.citedUrls.map((u) => (
                <li key={u}>
                  <a
                    href={u}
                    target="_blank"
                    rel="nofollow noopener noreferrer"
                    className="break-all font-mono text-[11.5px] text-tide underline-offset-2 hover:underline"
                  >
                    {u}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-3 font-mono text-[11px] text-muted-foreground/70">
          {new Date(sample.createdAt).toISOString()}
        </p>
      </div>
    </details>
  );
}
