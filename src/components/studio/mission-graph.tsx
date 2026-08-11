"use client";

import { useEffect, useState } from "react";
import {
  MIN_STAGE_H,
  NODE_H,
  NODE_W,
  PAD_X,
  PAD_Y,
  COL_PITCH,
  edgePath,
  layout,
  type GraphTask,
} from "@/lib/graph-geometry";
import { cn } from "@/lib/utils";

/**
 * THE PLAN, DRAWING ITSELF.
 *
 * `missionBoard` already returns everything this needs — index, dependsOn,
 * status, agentName, division, model — and `validatePlan` guarantees the graph
 * is small (2–8 tasks) and strictly acyclic. Rendering it as a flat list threw
 * away the one fact that defines the product: which specialists are waiting on
 * which, and which are executing right now.
 *
 * Two rules this component exists to honour:
 *
 * 1. NODES ARE REAL BUTTONS. They are absolutely positioned <button> elements
 *    and the SVG sits BEHIND them drawing edges only, aria-hidden. Focus, tab
 *    order, hover and screen readers stay real instead of being reconstructed
 *    inside an SVG.
 * 2. THE FLOW ANIMATION IS TRUE. A dashed lobster edge means a handoff is
 *    travelling that dependency into a task that is running at this instant.
 *    The engine caps it at MAX_CONCURRENT_TASKS, so it can never become
 *    decoration.
 */

export interface GraphNodeTask extends GraphTask {
  _id: string;
  agentName: string;
  division: string;
  title: string;
  status: string;
  model?: string;
}

const SPINE: Record<string, string> = {
  running: "bg-lobster",
  done: "bg-kelp",
  failed: "bg-destructive",
  skipped: "bg-sand/50",
  queued: "bg-[color:var(--rule)]",
};

const WORD: Record<string, string> = {
  running: "text-lobster",
  done: "text-kelp",
  failed: "text-destructive",
  skipped: "text-sand",
  queued: "text-sand",
};

const BORDER: Record<string, string> = {
  running: "border-lobster shadow-[0_0_26px_-8px_var(--lobster)]",
  done: "border-kelp/55",
  failed: "border-destructive/60",
  skipped: "border-dashed border-[color:var(--border)] opacity-[0.42]",
  queued: "border-[color:var(--input)]",
};

/** Corner ticks — a second, colour-blind-safe channel for the live states. */
function Ticks({ status }: { status: string }) {
  if (status !== "running" && status !== "done" && status !== "failed") return null;
  const all = status === "running";
  const tone =
    status === "running" ? "border-lobster" : status === "done" ? "border-kelp" : "border-destructive";
  const corner = "absolute size-[9px] pointer-events-none";
  return (
    <span aria-hidden="true">
      <span className={cn(corner, tone, "left-[-1px] top-[-1px] border-l border-t")} />
      <span className={cn(corner, tone, "bottom-[-1px] right-[-1px] border-b border-r")} />
      {all && (
        <>
          <span className={cn(corner, tone, "right-[-1px] top-[-1px] border-r border-t")} />
          <span className={cn(corner, tone, "bottom-[-1px] left-[-1px] border-b border-l")} />
        </>
      )}
    </span>
  );
}

/** Transpose below 720px: a horizontally scrolling DAG on a phone is unusable. */
function useTransposed(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 719px)");
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return narrow;
}

export function MissionGraph({
  tasks,
  missionStatus,
  selectedId,
  onSelect,
}: {
  tasks: GraphNodeTask[];
  missionStatus: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const transposed = useTransposed();
  const g = layout(tasks, { transpose: transposed });
  const statusOf = new Map(tasks.map((t) => [t.index, t.status]));

  /* ---- planning: an empty stage with one line sweeping wave 1 ---- */
  if (tasks.length === 0) {
    const planning = missionStatus === "planning";
    return (
      <div className="well grid-paper relative flex items-center justify-center overflow-hidden"
        style={{ height: MIN_STAGE_H }}
      >
        {planning && (
          <span
            aria-hidden="true"
            className="anim-scan absolute inset-y-0 left-6 w-px bg-lobster"
            style={{ ["--scan-distance" as string]: `${COL_PITCH}px` }}
          />
        )}
        <p className="stamp relative text-center">
          {planning ? "Orchestrator · drafting plan" : "No plan · this mission was never staffed"}
        </p>
      </div>
    );
  }

  return (
    <div className="well grid-paper overflow-hidden">
      {/* Wave 0 has no task row of its own — the orchestrator produced the plan
          rather than appearing in it — so it gets a named strip instead of a
          phantom column. */}
      <p className="stamp border-b border-[color:var(--border)] px-3 py-2">
        Wave 0 · orchestrator drafted this plan
      </p>

      <div className="overflow-x-auto">
        {/* The ruler lives INSIDE the scroll box and shares the stage's exact
            width, so a label can never drift off the column it names. */}
        <div className="mx-auto" style={{ width: g.width, minWidth: g.width }}>
          {!transposed && (
            <div
              className="flex border-b border-[color:var(--border)]"
              style={{ paddingLeft: PAD_X }}
            >
              {g.waves.map((_, d) => (
                <p key={d} className="stamp truncate py-2" style={{ width: COL_PITCH }}>
                  Wave {d + 1}
                </p>
              ))}
            </div>
          )}
        </div>
        <div
          className="relative mx-auto"
          style={{ width: g.width, height: g.height, minWidth: g.width }}
        >
          {/* drop rules: without them the ruler labels float free */}
          {!transposed &&
            g.waves.map((_, d) =>
              d === 0 ? null : (
                <span
                  key={`rule-${d}`}
                  aria-hidden="true"
                  className="absolute inset-y-0 w-px bg-[color:var(--grid)]"
                  style={{ left: PAD_X + d * COL_PITCH - 36 }}
                />
              )
            )}

          <svg
            aria-hidden="true"
            className="absolute inset-0"
            width={g.width}
            height={g.height}
            fill="none"
          >
            {tasks.flatMap((t) =>
              t.dependsOn.map((dep) => {
                const from = g.byIndex.get(dep);
                const to = g.byIndex.get(t.index);
                if (!from || !to) return null;
                const { d, tipX, tipY } = edgePath(from, to, transposed);
                const src = statusOf.get(dep) ?? "queued";
                const dst = t.status;

                const broken = src === "failed" || src === "skipped";
                const live = src === "done" && dst === "running";
                const satisfied = src === "done";

                const stroke = broken
                  ? "var(--sand)"
                  : live
                    ? "var(--lobster)"
                    : satisfied
                      ? "var(--kelp)"
                      : "var(--rule)";
                const width = live ? 2 : satisfied ? 1.5 : 1;

                return (
                  <g key={`${dep}-${t.index}`} opacity={broken ? 0.55 : satisfied ? 0.9 : 1}>
                    <path
                      d={d}
                      stroke={stroke}
                      strokeWidth={width}
                      strokeDasharray={
                        live ? undefined : broken ? "3 4" : satisfied ? undefined : "2 3"
                      }
                      className={live ? "flow" : undefined}
                    />
                    {broken ? (
                      <g stroke={stroke} strokeWidth={1}>
                        <path
                          d={`M ${tipX - 4} ${tipY - 4} L ${tipX + 4} ${tipY + 4}`}
                        />
                        <path
                          d={`M ${tipX - 4} ${tipY + 4} L ${tipX + 4} ${tipY - 4}`}
                        />
                      </g>
                    ) : (
                      <path
                        d={
                          transposed
                            ? `M ${tipX - 4} ${tipY - 5} L ${tipX} ${tipY} L ${tipX + 4} ${tipY - 5}`
                            : `M ${tipX - 5} ${tipY - 4} L ${tipX} ${tipY} L ${tipX - 5} ${tipY + 4}`
                        }
                        stroke={stroke}
                        strokeWidth={width}
                      />
                    )}
                  </g>
                );
              })
            )}
          </svg>

          {g.nodes.map((n) => {
            const t = n.task;
            const selected = selectedId === t._id;
            // Stamp in wave by wave: 140ms between waves, 60ms within one.
            const delay = n.depth * 140 + n.row * 60;
            return (
              <button
                key={t._id}
                type="button"
                onClick={() => onSelect(t._id)}
                aria-pressed={selected}
                aria-label={`Task ${t.index + 1}, ${t.agentName}, ${t.status}${
                  t.dependsOn.length
                    ? `, depends on task ${t.dependsOn.map((d) => d + 1).join(" and ")}`
                    : ", no dependencies"
                }`}
                data-graph-node={t.index}
                className={cn(
                  "plate anim-stamp absolute overflow-hidden text-left transition-colors duration-[120ms]",
                  BORDER[t.status] ?? BORDER.queued,
                  t.status === "queued" && "bg-[color:var(--well)]",
                  t.status === "failed" && "bg-[color-mix(in_oklch,var(--card),var(--destructive)_6%)]",
                  selected && "ring-1 ring-lobster"
                )}
                style={{
                  left: n.x,
                  top: n.y,
                  width: NODE_W,
                  height: NODE_H,
                  borderRadius: 3,
                  animationDelay: `${delay}ms`,
                }}
              >
                <Ticks status={t.status} />
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-y-0 left-0 w-[3px]",
                    SPINE[t.status] ?? SPINE.queued,
                    t.status === "running" && "anim-heat"
                  )}
                />
                <span className="flex h-full flex-col justify-between py-1.5 pl-3.5 pr-2.5">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="stamp text-tide">T-{String(t.index + 1).padStart(2, "0")}</span>
                    <span className={cn("stamp", WORD[t.status] ?? WORD.queued)}>
                      {t.status}
                    </span>
                  </span>
                  <span className="line-clamp-2 text-[12.5px] font-medium leading-[1.25] text-foreground">
                    {t.title}
                  </span>
                  <span className="truncate border-t border-[color:var(--border)] pt-1 font-mono text-[10.5px] text-[color:var(--label)]">
                    {t.agentName}
                    {t.model ? ` · ${t.model.split("/").pop()}` : ""}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Linear reading order for assistive tech — the visible ledger below the
          graph is the full source of truth, this keeps the DOM order sane. */}
      <ol className="sr-only">
        {tasks.map((t) => (
          <li key={t._id}>
            Task {t.index + 1}: {t.title} — {t.agentName}, {t.division}, {t.status}.
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Static readout under the graph. All mono, so the stage itself stays clean. */
export function MissionStatusBar({
  strategy,
  wave,
  waveCount,
  running,
  done,
  skipped,
  tokens,
}: {
  strategy: string;
  wave: number;
  waveCount: number;
  running: number;
  done: number;
  skipped: number;
  tokens: number;
}) {
  const cells: Array<[string, string]> = [
    ["Strategy", strategy],
    ["Wave", waveCount > 0 ? `${wave}/${waveCount}` : "— —"],
    ["Running", String(running)],
    ["Done", String(done)],
    ["Skipped", String(skipped)],
    ["Tokens", tokens > 0 ? tokens.toLocaleString() : "— —"],
  ];
  return (
    <div className="mt-px flex flex-wrap divide-x divide-[color:var(--border)] border-x border-b border-[color:var(--border)] bg-muted">
      {cells.map(([k, v]) => (
        <div key={k} className="flex min-w-0 flex-1 items-baseline gap-2 px-3 py-2">
          <span className="font-mono text-[10px] uppercase leading-[1.4] tracking-[0.16em] text-muted-foreground">
            {k}
          </span>
          <span className="tnum truncate font-mono text-[12px] text-foreground">{v}</span>
        </div>
      ))}
    </div>
  );
}

export { PAD_X, PAD_Y };
