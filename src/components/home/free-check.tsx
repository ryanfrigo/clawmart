"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { Lock, ArrowRight } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buildDisclaimer,
  ONE_LINE_DISCLAIMER,
  REFUND_LINE,
} from "@/components/site/constants";
import { KIT_ITEMS } from "@/components/home/kit-items";
import { BuyKitButton } from "@/components/home/checkout";

/** Shape of api.checks.get per docs/BUILD-CONTRACT.md. */
type CheckDoc = {
  status: "running" | "complete" | "failed";
  tier?: "invisible" | "faint" | "mixed" | "visible";
  brandName?: string;
  category?: string;
  competitors?: string[];
  findings?: string[];
  sampleCount?: number;
  mentionCount?: number;
  modelsUsed?: string[];
  error?: string;
  createdAt: number;
};

const TIERS = [
  {
    key: "invisible",
    label: "Invisible",
    colorClass: "text-destructive",
    barClass: "bg-destructive",
    desc: "did not appear in any sampled answer",
  },
  {
    key: "faint",
    label: "Faint",
    colorClass: "text-lobster",
    barClass: "bg-lobster",
    desc: "appeared in under 20% of sampled answers",
  },
  {
    key: "mixed",
    label: "Mixed",
    colorClass: "text-sand",
    barClass: "bg-sand",
    desc: "appeared in 20–60% of sampled answers",
  },
  {
    key: "visible",
    label: "Visible",
    colorClass: "text-kelp",
    barClass: "bg-kelp",
    desc: "appeared in over 60% of sampled answers",
  },
] as const;

const ERROR_COPY: Record<string, string> = {
  invalid_domain:
    "That doesn't look like a public domain we can check. Try something like acme.com.",
  rate_limited:
    "You've hit the free-check limit for now. Try again in a little while.",
  at_capacity:
    "We're at daily model-call capacity — the breaker tripped so costs stay honest. Try again tomorrow.",
};

export function FreeCheck() {
  const [domain, setDomain] = useState("");
  const [activeDomain, setActiveDomain] = useState("");
  const [checkId, setCheckId] = useState<Id<"checks"> | null>(null);
  const [submittedAt, setSubmittedAt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const check = useQuery(
    api.checks.get,
    checkId ? { checkId } : "skip"
  ) as CheckDoc | null | undefined;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const d = domain.trim();
    if (!d) return;
    setError(null);
    setCheckId(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: d }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        checkId?: string;
        error?: string;
      };
      if (res.ok && body.checkId) {
        setActiveDomain(d);
        setSubmittedAt(Date.now());
        setCheckId(body.checkId as Id<"checks">);
      } else {
        setError(
          ERROR_COPY[body.error ?? ""] ??
            "Something went wrong starting the check. Please try again."
        );
      }
    } catch {
      setError("Network hiccup — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const running =
    submitting || (checkId !== null && (check === undefined || check?.status === "running"));

  return (
    <div id="check" className="mx-auto w-full max-w-xl scroll-mt-24">
      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="yourdomain.com"
          aria-label="Domain to check"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          className="h-12 bg-card/60 font-mono text-[14px]"
        />
        <Button
          type="submit"
          size="lg"
          disabled={running || !domain.trim()}
          className="h-12 shrink-0 px-6 text-[14px]"
        >
          {running ? "Checking…" : "Run the free check"}
          {!running && <ArrowRight className="size-4" />}
        </Button>
      </form>
      <p className="mt-2.5 text-center text-[12px] text-muted-foreground sm:text-left">
        Free · no signup · 10 buyer-intent prompts across 2 models · cached 24h per domain
      </p>

      {error && (
        <div
          role="alert"
          className="anim-rise mt-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-[13px] leading-relaxed text-foreground"
        >
          {error}
        </div>
      )}

      {running && checkId && <RunningPanel check={check ?? undefined} />}

      {check?.status === "failed" && (
        <div
          role="alert"
          className="anim-rise mt-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-[13px] leading-relaxed"
        >
          {check.error ??
            "The check failed on our side — nothing was charged. Please try again."}
        </div>
      )}

      {check?.status === "complete" && checkId && (
        <CheckResult
          check={check}
          checkId={checkId}
          domain={activeDomain}
          submittedAt={submittedAt}
        />
      )}
    </div>
  );
}

function RunningPanel({ check }: { check?: CheckDoc }) {
  return (
    <div className="anim-rise mt-8 rounded-2xl border border-border bg-card/60 p-8">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
        {/* sonar */}
        <div className="relative size-24 shrink-0" aria-hidden="true">
          <div className="absolute inset-0 rounded-full border border-tide/30" />
          <div className="absolute inset-3 rounded-full border border-tide/20" />
          <div className="absolute inset-6 rounded-full border border-tide/10" />
          <div className="sonar-ring absolute inset-0 rounded-full border border-tide/50" />
          <div
            className="sonar-sweep absolute inset-0 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, transparent 300deg, oklch(0.72 0.1 200 / 35%) 360deg)",
            }}
          />
          <div className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-tide" />
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-tide">
            Sounding the depths
          </p>
          <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
            Crawling your homepage, then asking the models buyer-intent
            questions and counting who they mention.
          </p>
          <p className="mt-3 font-mono text-[12px] text-muted-foreground">
            {typeof check?.sampleCount === "number" && check.sampleCount > 0
              ? `${check.sampleCount} answers sampled so far…`
              : "usually 30–90 seconds"}
          </p>
        </div>
      </div>
    </div>
  );
}

function TierGauge({ tier }: { tier: NonNullable<CheckDoc["tier"]> }) {
  return (
    <div className="flex w-full gap-1.5" role="img" aria-label={`Visibility tier: ${tier}`}>
      {TIERS.map((t) => {
        const active = t.key === tier;
        return (
          <div key={t.key} className="flex-1">
            <div
              className={`h-1.5 rounded-full transition-colors ${
                active ? t.barClass : "bg-muted"
              }`}
            />
            <p
              className={`mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] ${
                active ? t.colorClass : "text-muted-foreground/50"
              }`}
            >
              {t.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function CheckResult({
  check,
  checkId,
  domain,
  submittedAt,
}: {
  check: CheckDoc;
  checkId: Id<"checks">;
  domain: string;
  submittedAt: number;
}) {
  const tierMeta = TIERS.find((t) => t.key === check.tier) ?? TIERS[0];
  const brand = check.brandName || "your brand";
  // A check created well before the user hit submit came from the 24h cache.
  const isCached = submittedAt - check.createdAt > 90_000;
  const disclaimer = buildDisclaimer({
    measuredAt: check.createdAt,
    modelIds: check.modelsUsed ?? [],
    runsPerPrompt: 1,
  });

  return (
    <div className="anim-rise mt-8 overflow-hidden rounded-2xl border border-border bg-card/60 text-left">
      {/* Tier readout */}
      <div className="border-b border-border p-6 sm:p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          AI visibility tier — {check.brandName ? `${check.brandName} · ` : ""}
          {check.category ? `${check.category}` : "inferred category"}
          <span className="text-muted-foreground/60"> (inferred)</span>
        </p>
        <p className={`mt-3 font-display text-5xl tracking-tight sm:text-6xl ${tierMeta.colorClass}`}>
          {tierMeta.label}
        </p>
        <p className="mt-2 text-[14px] text-muted-foreground">
          {brand} {tierMeta.desc}.
        </p>
        <div className="mt-6">
          <TierGauge tier={check.tier ?? "invisible"} />
        </div>
        {typeof check.mentionCount === "number" &&
          typeof check.sampleCount === "number" && (
            <p className="mt-5 font-mono text-[13px] text-foreground/85">
              {check.mentionCount}/{check.sampleCount} sampled answers mentioned{" "}
              {brand}
            </p>
          )}
        {Array.isArray(check.competitors) && check.competitors.length > 0 && (
          <p className="mt-2 font-mono text-[12px] text-muted-foreground">
            named instead: {check.competitors.join(", ")}{" "}
            <span className="text-muted-foreground/60">
              (inferred — editable in the paid kit)
            </span>
          </p>
        )}
        {/* mandatory score-adjacent disclaimer */}
        <p className="mt-5 border-l-2 border-border pl-3 text-[12px] leading-relaxed text-muted-foreground">
          {disclaimer}
          {isCached && (
            <>
              {" "}
              Cached result — free checks are cached for 24 hours per domain.
            </>
          )}
        </p>
      </div>

      {/* Teaser findings */}
      {Array.isArray(check.findings) && check.findings.length > 0 && (
        <div className="border-b border-border p-6 sm:p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            What we noticed
          </p>
          <ul className="mt-4 space-y-3">
            {check.findings.map((f, i) => (
              <li key={i} className="flex gap-3 text-[14px] leading-relaxed">
                <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-lobster" aria-hidden="true" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Locked fix-kit preview */}
      <div className="bg-abyss/40 p-6 sm:p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          In the Fix Kit for this domain
        </p>
        <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {KIT_ITEMS.map((item) => (
            <li
              key={item.title}
              className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-background/40 px-3 py-2.5"
            >
              <Lock className="size-3.5 shrink-0 text-muted-foreground/70" aria-hidden="true" />
              <span className="text-[13px] text-foreground/85">{item.title}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <BuyKitButton
            domain={domain}
            checkId={checkId}
            label={`Unlock the Fix Kit for ${domain} — $49`}
            className="h-11"
          />
          <Link
            href="/methodology"
            className="text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            How we measure →
          </Link>
        </div>
        <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
          {ONE_LINE_DISCLAIMER}
        </p>
        <p className="mt-1.5 text-[12px] text-muted-foreground">{REFUND_LINE}</p>
      </div>
    </div>
  );
}
