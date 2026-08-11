"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import {
  ArrowLeft,
  Boxes,
  ExternalLink,
  Link2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AGENTS, PIPELINE } from "../../../convex/lib/agents";
import { StatusBadge } from "@/components/studio/status-badge";
import { MissionPanel } from "@/components/studio/mission-panel";
import {
  BrandView,
  LandingView,
  MarketingView,
  PlanView,
  ProductView,
} from "@/components/studio/asset-views";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const AGENT_TITLE: Record<string, string> = {
  ...Object.fromEntries(PIPELINE.map((k) => [k, AGENTS[k].title])),
  ceo: "CEO", // daily check-ins land in the feed after the build
  agency: "Agency", // mission events share the company feed
};

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

const BOX_ERRORS: Record<string, string> = {
  boxes_disabled: "Dev boxes aren't enabled on this deployment.",
  company_not_live: "Finish the build first — dev boxes are for live companies.",
  box_already_running: "This company already has a dev box running.",
  repo_not_allowed: "That repository isn't on the allowlist.",
  no_repo_configured: "No repository is configured for dev boxes yet.",
  task_too_short: "Describe the task in a bit more detail.",
  rate_limited: "You've hit today's dev-box limit. Try again later.",
  not_found: "This company could not be found.",
};

type RunLike = {
  agentKey: string;
  status: "queued" | "running" | "done" | "failed";
  model: string;
  error?: string;
} | null;

type EventLike = { agentKey: string; kind: "status" | "output"; text: string; ts: number };

const RUN_TONE: Record<string, { led: string; word: string }> = {
  done: { led: "bg-kelp", word: "text-kelp" },
  running: { led: "bg-lobster anim-heat", word: "text-lobster" },
  failed: { led: "bg-destructive", word: "text-destructive" },
  queued: { led: "bg-sand/60", word: "text-sand" },
};

/* ---------------- shared chrome ---------------- */

/** A plate with a 30px rail header. Every panel in the console is one of these. */
function Panel({
  title,
  aside,
  children,
  className,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("plate overflow-hidden", className)}>
      <div className="flex h-[30px] items-center justify-between gap-3 border-b border-[color:var(--rule)] bg-muted px-3">
        <p className="stamp">{title}</p>
        {aside}
      </div>
      {children}
    </section>
  );
}

/**
 * The elapsed clock, isolated in its own component so its 1s tick can never
 * re-render the feed or the pipeline around it.
 */
function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const s = Math.max(0, Math.floor((now - since) / 1000));
  return (
    <>
      {String(Math.floor(s / 60)).padStart(2, "0")}:{String(s % 60).padStart(2, "0")}
    </>
  );
}

/* ---------------- telemetry ---------------- */

function TelemetryStrip({
  slug,
  status,
  doneSteps,
  assetCount,
  waitlistCount,
  building,
  since,
}: {
  slug: string;
  status: string;
  doneSteps: number;
  assetCount: number;
  waitlistCount: number;
  building: boolean;
  since: number;
}) {
  const cells: Array<[string, React.ReactNode]> = [
    ["Company", slug],
    ["Status", status],
    ["Step", `${doneSteps}/${PIPELINE.length}`],
    ["Assets", `${assetCount}/${TABS.length}`],
    ["Waitlist", waitlistCount > 1000 ? "1,000+" : String(waitlistCount)],
    ["Clock", building ? <Elapsed key="c" since={since} /> : "— —"],
  ];
  return (
    <div className="well grid-paper -mx-5 flex flex-wrap rounded-none border-x-0 sm:-mx-6">
      {cells.map(([k, v], i) => (
        <div
          key={k}
          className={cn(
            "flex min-w-0 flex-1 basis-1/3 items-baseline gap-2 px-4 py-2.5 sm:basis-0",
            i > 0 && "border-l border-[color:var(--border)]"
          )}
        >
          <span className="stamp shrink-0">{k}</span>
          <span className="tnum truncate font-mono text-[12px] text-foreground">{v}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------- pipeline rail ---------------- */

function AgentPipeline({ runs }: { runs: RunLike[] }) {
  return (
    <ol>
      {PIPELINE.map((key, i) => {
        const run = runs[i] ?? null;
        const status = run?.status ?? "queued";
        const tone = RUN_TONE[status] ?? RUN_TONE.queued;
        return (
          <li
            key={key}
            className={cn(
              "flex min-h-[44px] items-center gap-3 border-b border-[color:var(--border)] px-3 py-2 last:border-b-0",
              status === "running" && "bg-accent"
            )}
          >
            <span
              aria-hidden="true"
              className={cn("size-1.5 shrink-0 rounded-full", tone.led)}
            />
            <span className="stamp w-6 shrink-0 text-tide">T{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-medium leading-tight text-foreground">
                {AGENTS[key].title}
              </span>
              <span className="block truncate font-mono text-[11px] text-tide">
                {run?.model ?? AGENTS[key].model}
              </span>
              {status === "failed" && run?.error && (
                <span className="mt-1 line-clamp-2 block text-[11.5px] leading-snug text-destructive">
                  {run.error}
                </span>
              )}
            </span>
            <span className={cn("stamp shrink-0", tone.word)}>{status}</span>
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
    <div
      ref={ref}
      className="max-h-[380px] overflow-y-auto bg-[color:var(--well)] shadow-[inset_0_1px_2px_oklch(0_0_0/50%)]"
      aria-live="polite"
      aria-label="Agent build activity"
    >
      {events.length === 0 ? (
        <p className="stamp px-3 py-8 text-center">No signal · awaiting the team</p>
      ) : (
        events.map((ev, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-2 border-b border-[color:var(--border)] px-3 py-1.5 last:border-b-0",
              // Only the newest row animates: Convex live queries re-render the
              // whole list, and a stagger cascade on every refetch reads as jank.
              i === events.length - 1 && "anim-rise"
            )}
          >
            <time className="tnum w-14 shrink-0 pt-px font-mono text-[11px] text-[color:var(--label)]">
              {new Date(ev.ts).toLocaleTimeString([], { hour12: false })}
            </time>
            <div
              className={cn(
                "min-w-0 flex-1 text-[13px] leading-[1.5]",
                ev.kind === "output" && "border-l-2 border-lobster pl-2.5"
              )}
            >
              <span className="stamp mr-1.5 text-tide">
                {AGENT_TITLE[ev.agentKey] ?? ev.agentKey}
              </span>
              <span className={ev.kind === "output" ? "text-foreground/90" : "text-muted-foreground"}>
                {ev.text}
              </span>
            </div>
          </div>
        ))
      )}
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
    <section className="plate overflow-hidden">
      <div
        role="tablist"
        aria-label="Company outputs"
        className="flex flex-wrap border-b border-[color:var(--rule)] bg-muted"
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
                "inline-flex h-[34px] items-center gap-1.5 border-r border-[color:var(--border)] px-4 text-[13px] font-semibold outline-none transition-colors duration-[120ms]",
                selected
                  ? "bg-card text-foreground shadow-[inset_0_-2px_0_var(--lobster)]"
                  : "text-muted-foreground hover:text-foreground"
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
        className="p-4 outline-none sm:p-5"
      >
        {json === undefined ? (
          <div className="well flex min-h-40 flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="stamp">Awaiting {active.label}</p>
            <p className="max-w-sm text-[12.5px] leading-relaxed text-muted-foreground">
              It appears here the moment the {AGENT_TITLE[active.kind] ?? "agent"} finishes.
            </p>
          </div>
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
    </section>
  );
}

/* ---------------- waitlist signups (owner-only) ---------------- */

function SignupsPanel({
  companyId,
  count,
}: {
  companyId: Id<"companies">;
  count: number;
}) {
  const [open, setOpen] = useState(false);
  // Fetched only when opened — the count badge already tells the scale.
  const rows = useQuery(api.companies.signups, open ? { companyId } : "skip");

  function copyAll() {
    if (!rows?.length) return;
    if (!navigator.clipboard) {
      toast.error("Copy isn't available in this browser.");
      return;
    }
    navigator.clipboard.writeText(rows.map((r) => r.email).join("\n")).then(
      () => toast.success(`${rows.length} email${rows.length === 1 ? "" : "s"} copied`),
      () => toast.error("Copy failed")
    );
  }

  if (count === 0) return null;

  return (
    <Panel
      title="Waitlist signups"
      aside={
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="rounded-[3px] font-mono text-[11px] text-muted-foreground outline-none transition-colors duration-[120ms] hover:text-foreground"
        >
          {open ? "Hide" : `View ${count > 1000 ? "1,000+" : count}`}
        </button>
      }
    >
      {open && (
        <>
          {rows === undefined ? (
            <p className="stamp px-3 py-6 text-center">Reading signups — —</p>
          ) : rows === null || rows.length === 0 ? (
            <p className="stamp px-3 py-6 text-center">No signups yet</p>
          ) : (
            <>
              <ul className="max-h-64 overflow-y-auto">
                {rows.map((r, i) => (
                  <li
                    key={i}
                    className="flex items-baseline justify-between gap-3 border-b border-[color:var(--border)] px-3 py-1.5 text-[13px] last:border-b-0"
                  >
                    <span className="truncate text-foreground/90">{r.email}</span>
                    <time className="tnum shrink-0 font-mono text-[11px] text-[color:var(--label)]">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </time>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between gap-3 border-t border-[color:var(--border)] px-3 py-2.5">
                <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                  These people asked to hear from you.
                  {rows.length >= 100 && " Showing the 100 most recent."}
                </p>
                <Button type="button" variant="outline" size="sm" onClick={copyAll}>
                  <Link2 className="size-3.5" />
                  Copy
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </Panel>
  );
}

/* ---------------- root ---------------- */

export function BuildView({ companyId }: { companyId: Id<"companies"> }) {
  const router = useRouter();
  const state = useQuery(api.companies.buildState, { companyId });
  const rebuild = useMutation(api.companies.rebuild);
  const removeCompany = useMutation(api.companies.remove);
  const provisionBox = useMutation(api.boxes.provisionDevBox);
  const killBox = useMutation(api.boxes.killDevBox);
  const boxes = useQuery(api.boxes.boxesForCompany, { companyId });
  const [rebuilding, setRebuilding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [boxBusy, setBoxBusy] = useState(false);
  const boxesEnabled = process.env.NEXT_PUBLIC_CLAWMART_BOXES === "1";

  async function onDelete() {
    if (
      !window.confirm(
        "Delete this company? Its build, outputs, and public page are removed permanently."
      )
    )
      return;
    setDeleting(true);
    try {
      await removeCompany({ companyId });
      toast.success("Company deleted.");
      // Straight to the companies grid on the homepage — /studio is now a
      // redirect stub and would bounce the user to the marketing hero.
      router.push("/#companies");
    } catch {
      toast.error("Couldn't delete the company. Please try again.");
      setDeleting(false);
    }
  }

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

  async function onProvisionBox() {
    const task = window.prompt(
      "Describe the task for the dev box. It runs on a real cloud box and opens a pull request for you to review — nothing is merged automatically."
    );
    if (!task || task.trim().length < 8) return;
    setBoxBusy(true);
    try {
      await provisionBox({ companyId, task: task.trim() });
      toast.success("Dev box starting — watch the feed.");
    } catch (err) {
      const code = err instanceof ConvexError ? String(err.data) : "";
      toast.error(BOX_ERRORS[code] ?? "Couldn't start the dev box. Please try again.");
    } finally {
      setBoxBusy(false);
    }
  }

  async function onKillBox(boxId: string) {
    if (!window.confirm("Terminate this dev box now?")) return;
    setBoxBusy(true);
    try {
      await killBox({ boxId });
      toast.success("Terminating dev box…");
    } catch {
      toast.error("Couldn't terminate the box. Use `clawmart-box kill` as a fallback.");
    } finally {
      setBoxBusy(false);
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
      <div className="well flex min-h-[60vh] items-center justify-center">
        <p className="stamp">Opening console — —</p>
      </div>
    );
  }

  if (state === null) {
    return (
      <div className="plate p-8 text-center">
        <p className="stamp">Not found</p>
        <h1 className="d3 mt-3">We couldn&apos;t open this company.</h1>
        <p className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-muted-foreground">
          It may have been removed, or it belongs to another account.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">
            <ArrowLeft className="size-4" />
            Back to Studio
          </Link>
        </Button>
      </div>
    );
  }

  const { company, runs, events, assets, waitlistCount } = state;
  const isLive = company.status === "live";
  const canRebuild = company.status === "live" || company.status === "failed";
  const activeBox = boxes?.find(
    (b) => b.status === "provisioning" || b.status === "running"
  );
  const typedRuns = runs as RunLike[];
  const doneSteps = typedRuns.filter((r) => r?.status === "done").length;
  const assetCount = TABS.filter((t) => !!(assets as Record<string, string | undefined>)[t.kind])
    .length;

  return (
    <div>
      <TelemetryStrip
        slug={company.slug}
        status={company.status}
        doneSteps={doneSteps}
        assetCount={assetCount}
        waitlistCount={waitlistCount}
        building={company.status === "building"}
        since={company.updatedAt}
      />

      {/* header */}
      <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/"
            className="stamp inline-flex items-center gap-1.5 rounded-[3px] outline-none transition-colors duration-[120ms] hover:text-foreground"
          >
            <ArrowLeft className="size-3" aria-hidden="true" />
            Studio
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="d3">{company.name}</h1>
            <StatusBadge status={company.status} />
            {(isLive || waitlistCount > 0) && (
              <span
                className="tnum stamp"
                title="Emails collected by this company's public page"
              >
                {waitlistCount > 1000 ? "1,000+" : waitlistCount} on the waitlist
              </span>
            )}
          </div>
          {company.tagline && (
            <p className="mt-1.5 max-w-[62ch] text-[14px] leading-relaxed text-muted-foreground">
              {company.tagline}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {isLive ? (
            <Button asChild size="sm">
              <Link href={`/c/${company.slug}`}>
                <ExternalLink className="size-3.5" />
                Public page
              </Link>
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled>
              <ExternalLink className="size-3.5" />
              Public page
            </Button>
          )}
          {/* The slug is provisional until the brand step locks it — copying
              it mid-first-build would hand out a link that 404s forever. */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onCopyLink(company.slug)}
            disabled={!isLive}
          >
            <Link2 className="size-3.5" />
            Copy link
          </Button>
          {canRebuild && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onRebuild}
              disabled={rebuilding}
            >
              <RefreshCw className="size-3.5" />
              {rebuilding ? "Starting…" : "Rebuild"}
            </Button>
          )}
          {boxesEnabled &&
            isLive &&
            (activeBox ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onKillBox(activeBox.boxId)}
                disabled={boxBusy}
                title="Terminate the running dev box"
                className="hover:border-destructive/60 hover:text-destructive"
              >
                <Boxes className="size-3.5" />
                Kill box
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onProvisionBox}
                disabled={boxBusy}
                title="Spin up a real cloud dev box. It opens a pull request for you to review — nothing is auto-merged."
              >
                <Boxes className="size-3.5" />
                Dev box
              </Button>
            ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onDelete}
            disabled={deleting}
            className="hover:border-destructive/60 hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* body — cells in a rule grid, not floating cards */}
      <div className="mt-7 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-0">
        <div className="space-y-4 lg:border-r lg:border-[color:var(--rule)] lg:pr-6">
          <Panel title="Founding team">
            <AgentPipeline runs={typedRuns} />
          </Panel>
          <Panel
            title="Live feed"
            aside={
              <span className="tnum font-mono text-[11px] text-[color:var(--label)]">
                {events.length}
              </span>
            }
          >
            <AgentFeed events={events as EventLike[]} />
          </Panel>
          <SignupsPanel companyId={companyId} count={waitlistCount} />
        </div>
        <div className="min-w-0 lg:pl-6">
          <OutputTabs
            assets={assets as Record<string, string | undefined>}
            slug={company.slug}
            isLive={isLive}
          />
        </div>
      </div>

      {/* The agency staffs itself from the company's plan and brand, so it only
          appears once the founding-team build has landed. */}
      {isLive && (
        <div className="mt-10">
          <MissionPanel companyId={companyId} />
        </div>
      )}
    </div>
  );
}
