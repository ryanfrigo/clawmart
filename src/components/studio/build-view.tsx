"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import {
  ArrowLeft,
  Boxes,
  Check,
  Clock,
  Compass,
  ExternalLink,
  LayoutTemplate,
  Link2,
  Loader2,
  Megaphone,
  Palette,
  RefreshCw,
  X,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { StatusBadge } from "@/components/studio/status-badge";
import {
  BrandView,
  LandingView,
  MarketingView,
  PlanView,
  ProductView,
} from "@/components/studio/asset-views";
import { cn } from "@/lib/utils";

const AGENTS = [
  { key: "strategist", title: "Strategist", icon: Compass, blurb: "Positioning · ICP · model" },
  { key: "brand", title: "Brand Designer", icon: Palette, blurb: "Name · voice · palette" },
  { key: "product", title: "Product Lead", icon: Boxes, blurb: "Features · MVP · pricing" },
  { key: "landing", title: "Landing Page Engineer", icon: LayoutTemplate, blurb: "The public page" },
  { key: "marketing", title: "Marketing Lead", icon: Megaphone, blurb: "Launch kit" },
] as const;

const AGENT_TITLE: Record<string, string> = Object.fromEntries(
  AGENTS.map((a) => [a.key, a.title])
);

const TABS = [
  { id: "plan", label: "Plan", kind: "strategist" },
  { id: "brand", label: "Brand", kind: "brand" },
  { id: "product", label: "Product", kind: "product" },
  { id: "landing", label: "Landing", kind: "landing" },
  { id: "marketing", label: "Marketing", kind: "marketing" },
] as const;

const REBUILD_ERRORS: Record<string, string> = {
  build_in_progress: "A build is already running for this company.",
  rate_limited: "We've hit today's build limit across the studio. Try again later.",
  not_found: "This company could not be found.",
};

type RunLike = {
  agentKey: string;
  status: "queued" | "running" | "done" | "failed";
  model: string;
  error?: string;
} | null;

type EventLike = { agentKey: string; kind: "status" | "output"; text: string; ts: number };

/* ---------------- pipeline ---------------- */

function RunIcon({ status }: { status: string }) {
  if (status === "done") return <Check className="size-4 text-kelp" aria-hidden="true" />;
  if (status === "running")
    return <Loader2 className="size-4 animate-spin text-lobster" aria-hidden="true" />;
  if (status === "failed") return <X className="size-4 text-destructive" aria-hidden="true" />;
  return <Clock className="size-4 text-muted-foreground/40" aria-hidden="true" />;
}

function AgentPipeline({ runs }: { runs: RunLike[] }) {
  return (
    <ol className="space-y-2">
      {AGENTS.map((agent, i) => {
        const run = runs[i] ?? null;
        const status = run?.status ?? "queued";
        const running = status === "running";
        const Icon = agent.icon;
        return (
          <li
            key={agent.key}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3 transition-colors",
              running ? "border-lobster/40 bg-lobster/[0.04]" : "border-border bg-card/40",
              status === "queued" && "opacity-70"
            )}
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg border",
                running ? "border-lobster/40 text-lobster" : "border-border text-muted-foreground"
              )}
            >
              <Icon className="size-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-medium leading-tight text-foreground">
                {agent.title}
              </p>
              <p className="truncate font-mono text-[11px] text-muted-foreground">
                {run?.model ? run.model.split("/").pop() : agent.blurb}
              </p>
              {status === "failed" && run?.error && (
                <p className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-destructive/90">
                  {run.error}
                </p>
              )}
            </div>
            <RunIcon status={status} />
          </li>
        );
      })}
    </ol>
  );
}

/* ---------------- live feed ---------------- */

function AgentFeed({ events }: { events: EventLike[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events.length]);

  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        Live feed
      </p>
      <div
        ref={ref}
        className="mt-3 max-h-[420px] space-y-2 overflow-y-auto rounded-xl border border-border bg-background/40 p-3"
        aria-live="polite"
        aria-label="Agent build activity"
      >
        {events.length === 0 ? (
          <p className="p-2 text-[13px] text-muted-foreground">Waiting for the team to start…</p>
        ) : (
          events.map((ev, i) => (
            <div key={i} className="flex gap-3 text-[13px] leading-relaxed">
              <time className="shrink-0 pt-0.5 font-mono text-[11px] text-muted-foreground/70">
                {new Date(ev.ts).toLocaleTimeString([], { hour12: false })}
              </time>
              <div
                className={cn(
                  "min-w-0 flex-1",
                  ev.kind === "output" && "border-l-2 border-lobster/40 pl-3"
                )}
              >
                <span className="mr-1.5 font-mono text-[10.5px] uppercase tracking-wide text-lobster/80">
                  {AGENT_TITLE[ev.agentKey] ?? ev.agentKey}
                </span>
                <span
                  className={ev.kind === "output" ? "text-foreground/90" : "text-muted-foreground"}
                >
                  {ev.text}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ---------------- output tabs ---------------- */

function OutputTabs({
  assets,
  slug,
  isLive,
}: {
  assets: Record<string, string | undefined>;
  slug: string;
  isLive: boolean;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("plan");
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];
  const json = assets[active.kind];

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-5 sm:p-6">
      <div
        role="tablist"
        aria-label="Company outputs"
        className="flex flex-wrap gap-1.5 border-b border-border pb-3"
      >
        {TABS.map((t) => {
          const ready = !!assets[t.kind];
          const selected = t.id === tab;
          return (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              role="tab"
              aria-selected={selected}
              aria-controls={`panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                selected
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {t.label}
              {ready && !selected && (
                <span aria-hidden="true" className="size-1.5 rounded-full bg-kelp" />
              )}
            </button>
          );
        })}
      </div>

      <div
        id={`panel-${active.id}`}
        role="tabpanel"
        aria-labelledby={`tab-${active.id}`}
        tabIndex={0}
        className="pt-5 outline-none"
      >
        {json === undefined ? (
          <p className="text-[13.5px] leading-relaxed text-muted-foreground">
            The {active.label.toLowerCase()} output hasn&apos;t been produced yet. It appears here the
            moment the {AGENT_TITLE[active.kind] ?? "agent"} finishes.
          </p>
        ) : active.id === "plan" ? (
          <PlanView json={json} />
        ) : active.id === "brand" ? (
          <BrandView json={json} />
        ) : active.id === "product" ? (
          <ProductView json={json} />
        ) : active.id === "landing" ? (
          <LandingView json={json} slug={slug} isLive={isLive} />
        ) : (
          <MarketingView json={json} />
        )}
      </div>
    </div>
  );
}

/* ---------------- root ---------------- */

export function BuildView({ companyId }: { companyId: Id<"companies"> }) {
  const state = useQuery(api.companies.buildState, { companyId });
  const rebuild = useMutation(api.companies.rebuild);
  const [rebuilding, setRebuilding] = useState(false);

  async function onRebuild() {
    if (!window.confirm("Rebuild this company? The current outputs will be replaced.")) return;
    setRebuilding(true);
    try {
      await rebuild({ companyId });
      toast.success("Rebuild started.");
    } catch (err) {
      const code = err instanceof ConvexError ? String(err.data) : "";
      toast.error(REBUILD_ERRORS[code] ?? "Couldn't start the rebuild. Please try again.");
    } finally {
      setRebuilding(false);
    }
  }

  function onCopyLink(slug: string) {
    const url =
      typeof window !== "undefined" ? `${window.location.origin}/c/${slug}` : `/c/${slug}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success("Public link copied"),
      () => toast.error("Copy failed")
    );
  }

  if (state === undefined) {
    return (
      <div className="space-y-4">
        <div className="shimmer-line h-9 w-64 rounded" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="shimmer-line h-80 rounded-2xl" />
          <div className="shimmer-line h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (state === null) {
    return (
      <div className="rounded-2xl border border-border bg-card/40 p-8 text-center">
        <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
          Not found
        </p>
        <h1 className="mt-3 font-display text-3xl tracking-tight">
          We couldn&apos;t open this company.
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
          It may have been removed, or it belongs to another account.
        </p>
        <Link
          href="/studio"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <ArrowLeft className="size-4" />
          Back to Studio
        </Link>
      </div>
    );
  }

  const { company, runs, events, assets } = state;
  const isLive = company.status === "live";
  const canRebuild = company.status === "live" || company.status === "failed";

  return (
    <div>
      {/* header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/studio"
            className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Studio
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-[clamp(2rem,4vw,2.75rem)] leading-tight tracking-tight">
              {company.name}
            </h1>
            <StatusBadge status={company.status} />
          </div>
          {company.tagline && (
            <p className="mt-1 text-[14.5px] italic text-muted-foreground">{company.tagline}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {isLive ? (
            <Link
              href={`/c/${company.slug}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-lobster/40 px-3.5 text-[13px] font-medium text-lobster transition-colors hover:bg-lobster/10"
            >
              <ExternalLink className="size-3.5" />
              Public page
            </Link>
          ) : (
            <span className="inline-flex h-9 cursor-not-allowed items-center gap-1.5 rounded-lg border border-border px-3.5 text-[13px] text-muted-foreground/60">
              <ExternalLink className="size-3.5" />
              Public page
            </span>
          )}
          <button
            type="button"
            onClick={() => onCopyLink(company.slug)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <Link2 className="size-3.5" />
            Copy link
          </button>
          {canRebuild && (
            <button
              type="button"
              onClick={onRebuild}
              disabled={rebuilding}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={cn("size-3.5", rebuilding && "animate-spin")} />
              Rebuild
            </button>
          )}
        </div>
      </div>

      {/* body */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <AgentPipeline runs={runs as RunLike[]} />
          <AgentFeed events={events as EventLike[]} />
        </div>
        <OutputTabs
          assets={assets as Record<string, string | undefined>}
          slug={company.slug}
          isLive={isLive}
        />
      </div>
    </div>
  );
}
