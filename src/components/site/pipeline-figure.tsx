import {
  COL_PITCH,
  NODE_H,
  NODE_W,
  PAD_X,
  PAD_Y,
  edgePath,
  layout,
} from "@/lib/graph-geometry";
import { AGENTS, PIPELINE } from "../../../convex/lib/agents";
import {
  DIVISIONS,
  MAX_COMPANIES_PER_USER,
  MAX_COMPANY_MEMORY,
  MAX_CONCURRENT_TASKS,
  MAX_TASKS,
  MIN_TASKS,
  ROSTER,
} from "../../../convex/lib/roster";
import { cn } from "@/lib/utils";

/**
 * The founding-team pipeline, drawn cold.
 *
 * Same geometry module as the live mission DAG (lib/graph-geometry.ts), so the
 * marketing figure and the real instrument are the same object in two states:
 * this one has every LED dark because nothing is running. Every string in it is
 * a fact read out of convex/lib/agents.ts — the agent titles and the model ids
 * that actually get called — so the figure can never drift from the product.
 *
 * Deliberately non-interactive: no buttons, no hover, no links. The SVG behind
 * it is aria-hidden and the node text carries the meaning.
 */

/** Strictly sequential: each founding agent reads the one before it. */
const CHAIN = PIPELINE.map((key, i) => ({
  key,
  index: i,
  dependsOn: i === 0 ? [] : [i - 1],
  title: AGENTS[key].title,
  model: AGENTS[key].model,
}));

export function PipelineFigure({ className }: { className?: string }) {
  // Vertical: five waves of one. At 264px wide it fits any column on any
  // viewport we support, so the figure never needs to scale or scroll.
  const g = layout(CHAIN, { transpose: true });

  return (
    // w-fit: the well hugs the stage instead of leaving half a screen of empty
    // graph paper beside it. An instrument is the size of its readout.
    <figure className={cn("well grid-paper relative mx-auto w-fit overflow-hidden", className)}>
      <figcaption className="stamp border-b border-[color:var(--border)] px-4 py-2.5">
        Founding team · pipeline
      </figcaption>

      <div
        className="relative mx-auto"
        style={{ width: g.width, height: g.height }}
      >
        <svg
          aria-hidden="true"
          className="absolute inset-0"
          width={g.width}
          height={g.height}
          fill="none"
        >
          {CHAIN.map((t) =>
            t.dependsOn.map((dep) => {
              const from = g.byIndex.get(dep);
              const to = g.byIndex.get(t.index);
              if (!from || !to) return null;
              const { d, tipX, tipY } = edgePath(from, to, true);
              return (
                <g key={`${dep}-${t.index}`}>
                  <path
                    d={d}
                    stroke="var(--rule)"
                    strokeWidth={1}
                    strokeDasharray="2 3"
                  />
                  <path
                    d={`M ${tipX - 4} ${tipY - 5} L ${tipX} ${tipY} L ${tipX + 4} ${tipY - 5}`}
                    stroke="var(--rule)"
                    strokeWidth={1}
                  />
                </g>
              );
            })
          )}
        </svg>

        {g.nodes.map((n) => (
          <div
            key={n.task.key}
            className="plate absolute flex flex-col justify-between px-3 py-2"
            style={{ left: n.x, top: n.y, width: NODE_W, height: NODE_H }}
          >
            <div className="flex items-center justify-between">
              <span className="stamp text-tide">T{n.index + 1}</span>
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-[color:var(--rule)]"
              />
            </div>
            <p className="text-[12.5px] font-medium leading-tight text-foreground">
              {n.task.title}
            </p>
            <p className="truncate font-mono text-[11px] text-[color:var(--label)]">
              {n.task.model}
            </p>
          </div>
        ))}
      </div>

      <p className="stamp border-t border-[color:var(--border)] px-4 py-2.5">
        System idle · no build running
      </p>
    </figure>
  );
}

/**
 * The only numbers allowed on a marketing surface: counts of our own system,
 * each read from the constant that governs it. Not usage, not customers, not
 * social proof — the shape of the machine.
 */
const SPECS: Array<{ value: string; label: string }> = [
  { value: String(ROSTER.length), label: "Specialists" },
  { value: String(DIVISIONS.length), label: "Divisions" },
  { value: String(PIPELINE.length), label: "Founding agents" },
  { value: `${MIN_TASKS}–${MAX_TASKS}`, label: "Tasks / mission" },
  { value: String(MAX_CONCURRENT_TASKS), label: "Run in parallel" },
  { value: String(MAX_COMPANIES_PER_USER), label: "Companies / account" },
  { value: String(MAX_COMPANY_MEMORY), label: "Stored learnings" },
];

export function SystemSpecs({ className }: { className?: string }) {
  return (
    <dl className={cn("divide-y divide-[color:var(--border)]", className)}>
      {SPECS.map((s) => (
        <div key={s.label} className="flex items-baseline justify-between gap-4 py-2">
          <dt className="stamp">{s.label}</dt>
          <dd className="tnum font-mono text-[12.5px] text-tide">{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * How a mission is staffed — the scheduler, drawn. Divisions stand in for the
 * specialists the orchestrator picks; the point is the wave structure, not an
 * invented example of anyone's output.
 */
export function StaffingFigure({ className }: { className?: string }) {
  const waves: Array<{ label: string; cells: string[] }> = [
    { label: "Wave 1", cells: ["Strategy", "Product"] },
    { label: "Wave 2", cells: ["Engineering", "Design", "Growth"] },
    { label: "Wave 3", cells: ["Operations"] },
  ];

  return (
    <figure className={cn("well grid-paper overflow-hidden", className)}>
      <figcaption className="stamp border-b border-[color:var(--border)] px-4 py-2.5">
        Fig. 1 — how a mission is staffed
      </figcaption>
      <div className="space-y-3 p-4">
        {waves.map((w, i) => (
          <div key={w.label} className="flex items-center gap-3">
            <span className="stamp w-14 shrink-0">{w.label}</span>
            <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
              {w.cells.map((c) => (
                <span
                  key={c}
                  className="plate px-2.5 py-1 font-mono text-[11px] text-muted-foreground"
                >
                  {c}
                </span>
              ))}
            </div>
            {i < waves.length - 1 && (
              <span aria-hidden="true" className="stamp shrink-0">
                ↓
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="border-t border-[color:var(--border)] px-4 py-3 text-[12.5px] leading-relaxed text-muted-foreground">
        An orchestrator turns one goal into {MIN_TASKS}–{MAX_TASKS} tasks with
        real dependencies, then runs up to {MAX_CONCURRENT_TASKS} specialists at
        a time. Each finished task hands the next a short brief, never its whole
        output.
      </p>
    </figure>
  );
}

/** Exported so callers can size a column to the figure without measuring it. */
export const PIPELINE_FIGURE_WIDTH = PAD_X * 2 + COL_PITCH - (COL_PITCH - NODE_W);
export const PIPELINE_FIGURE_MIN_H = PAD_Y * 2 + NODE_H;
