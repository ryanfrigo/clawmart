"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The telemetry table that pairs with the graph.
 *
 * Schematic plus ledger is the actual mission-control pattern, and the table is
 * the accessibility source of truth: everything the DAG says with position and
 * colour, this says with words in index order. Numerics are right-aligned and
 * tabular so a column of durations reads as a column.
 *
 * There is no token column on purpose — `missionBoard` reports tokens per
 * MISSION, not per task, and a column of "— —" would be an instrument pretending
 * to a reading it does not have.
 */

export interface LedgerTask {
  _id: string;
  index: number;
  agentName: string;
  division: string;
  title: string;
  status: string;
  model?: string;
  startedAt?: number;
  finishedAt?: number;
}

const STATE_TONE: Record<string, string> = {
  running: "text-lobster",
  done: "text-kelp",
  failed: "text-destructive",
  skipped: "text-sand",
  queued: "text-sand",
};

/**
 * Isolated on purpose: a running task's clock ticks once a second, and this is
 * the only thing that re-renders when it does. The graph never sees it.
 */
function Elapsed({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return <>{Math.max(0, Math.round((now - startedAt) / 1000))}</>;
}

function Duration({ task }: { task: LedgerTask }) {
  if (task.startedAt && task.finishedAt) {
    return <>{Math.max(0, Math.round((task.finishedAt - task.startedAt) / 1000))}</>;
  }
  if (task.status === "running" && task.startedAt) return <Elapsed startedAt={task.startedAt} />;
  return <span className="text-[color:var(--label)]">— —</span>;
}

export function TaskLedger({
  tasks,
  selectedId,
  onSelect,
}: {
  tasks: LedgerTask[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (tasks.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left font-mono text-[12px]">
        <caption className="sr-only">
          Task ledger — every specialist staffed on this mission, in plan order.
        </caption>
        <thead>
          <tr className="border-b border-[color:var(--rule)]">
            <th scope="col" className="stamp px-3 py-2 font-normal">
              #
            </th>
            <th scope="col" className="stamp px-3 py-2 font-normal">
              Specialist
            </th>
            <th scope="col" className="stamp px-3 py-2 font-normal">
              Division
            </th>
            <th scope="col" className="stamp px-3 py-2 font-normal">
              Model
            </th>
            <th scope="col" className="stamp px-3 py-2 text-right font-normal">
              Sec
            </th>
            <th scope="col" className="stamp px-3 py-2 text-right font-normal">
              State
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr
              key={t._id}
              onClick={() => onSelect(t._id)}
              aria-selected={selectedId === t._id}
              className={cn(
                "cursor-pointer border-b border-[color:var(--border)] transition-colors duration-[120ms] hover:bg-accent",
                selectedId === t._id && "bg-accent"
              )}
            >
              <td className="tnum px-3 py-2 text-tide">
                T-{String(t.index + 1).padStart(2, "0")}
              </td>
              <th scope="row" className="px-3 py-2 text-left font-normal text-foreground">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(t._id);
                  }}
                  className="rounded-[3px] text-left outline-none hover:text-foreground"
                >
                  {t.agentName}
                </button>
              </th>
              <td className="px-3 py-2 capitalize text-muted-foreground">{t.division}</td>
              <td className="max-w-[18ch] truncate px-3 py-2 text-muted-foreground">
                {t.model ? t.model.split("/").pop() : "— —"}
              </td>
              <td className="tnum px-3 py-2 text-right text-muted-foreground">
                <Duration task={t} />
              </td>
              <td
                className={cn(
                  "px-3 py-2 text-right uppercase tracking-[0.14em]",
                  STATE_TONE[t.status] ?? STATE_TONE.queued
                )}
              >
                {t.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
