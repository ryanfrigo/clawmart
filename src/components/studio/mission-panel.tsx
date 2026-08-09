"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { Check, ChevronDown, Clock, Loader2, Minus, Send, Trash2, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { STRATEGIES, STRATEGY_LABELS, type Strategy } from "../../../convex/lib/router";
import { CopyButton } from "@/components/studio/copy-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Mirrors the server-side bounds in convex/missions.ts so the form can say what
// is wrong before a round trip; the mutation stays the authority.
const GOAL_MIN = 12;
const GOAL_MAX = 1000;

const ERRORS: Record<string, string> = {
  unauthenticated: "Please sign in to dispatch a mission.",
  invalid_goal: `Describe the goal in ${GOAL_MIN}–${GOAL_MAX} characters.`,
  company_not_live: "Finish the build first — missions run on live companies.",
  too_many_active_missions:
    "Two missions are already in flight for this company. Wait for one to finish.",
  rate_limited: "You've hit today's mission limit. Try again tomorrow.",
  not_found: "This mission could not be found.",
};

const MISSION_STATUS: Record<
  string,
  { label: string; dot: string; text: string; border: string; pulse?: boolean }
> = {
  planning: {
    label: "Planning",
    dot: "bg-lobster",
    text: "text-lobster",
    border: "border-lobster/40",
    pulse: true,
  },
  running: {
    label: "Running",
    dot: "bg-lobster",
    text: "text-lobster",
    border: "border-lobster/40",
    pulse: true,
  },
  done: { label: "Done", dot: "bg-kelp", text: "text-kelp", border: "border-kelp/40" },
  failed: {
    label: "Failed",
    dot: "bg-destructive",
    text: "text-destructive",
    border: "border-destructive/40",
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-muted-foreground",
    text: "text-muted-foreground",
    border: "border-border",
  },
};

/** Mission-status pill — same vocabulary as StatusBadge, different statuses. */
function MissionStatus({ status }: { status: string }) {
  const s = MISSION_STATUS[status] ?? MISSION_STATUS.cancelled;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.14em]",
        s.border,
        s.text
      )}
    >
      <span className={cn("size-1.5 rounded-full", s.dot, s.pulse && "animate-pulse")} />
      {s.label}
    </span>
  );
}

function TaskIcon({ status }: { status: string }) {
  if (status === "done") return <Check className="size-4 text-kelp" aria-hidden="true" />;
  if (status === "running")
    return <Loader2 className="size-4 animate-spin text-lobster" aria-hidden="true" />;
  if (status === "failed") return <X className="size-4 text-destructive" aria-hidden="true" />;
  if (status === "skipped")
    return <Minus className="size-4 text-muted-foreground/40" aria-hidden="true" />;
  return <Clock className="size-4 text-muted-foreground/40" aria-hidden="true" />;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </p>
  );
}

/* ---------------- task output ---------------- */

type TaskOutputView = {
  summary: string;
  body: string;
  artifacts: { title: string; content: string }[];
};

/**
 * Read the stored TaskOutput envelope (convex/lib/roster.ts). Defensive like
 * asset-views: a malformed row renders as "no output" instead of blanking the
 * whole board.
 */
function parseOutput(json: string | undefined): TaskOutputView | null {
  if (!json) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const d = raw as Record<string, unknown>;

  const str = (v: unknown): string => (typeof v === "string" ? v : "");
  const artifacts = (Array.isArray(d.artifacts) ? d.artifacts : [])
    .map((a) => (a && typeof a === "object" ? (a as Record<string, unknown>) : null))
    .filter((a): a is Record<string, unknown> => !!a)
    .map((a) => ({ title: str(a.title).trim() || "Artifact", content: str(a.content) }))
    .filter((a) => !!a.content);

  const out = { summary: str(d.summary), body: str(d.body), artifacts };
  return out.summary || out.body || out.artifacts.length > 0 ? out : null;
}

type BoardTask = {
  _id: Id<"missionTasks">;
  agentName: string;
  division: string;
  title: string;
  brief: string;
  status: string;
  model?: string;
  outputJson?: string;
  error?: string;
};

function TaskRow({
  task,
  open,
  onToggle,
}: {
  task: BoardTask;
  open: boolean;
  onToggle: () => void;
}) {
  const output = parseOutput(task.outputJson);
  const running = task.status === "running";

  return (
    <li
      className={cn(
        "rounded-xl border transition-colors",
        running ? "border-lobster/40 bg-lobster/[0.04]" : "border-border bg-card/40"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-3 text-left"
      >
        <span className="mt-0.5 shrink-0">
          <TaskIcon status={task.status} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-medium leading-tight text-foreground">
            {task.title}
          </span>
          <span className="mt-1 block truncate font-mono text-[11px] text-muted-foreground">
            {task.agentName}
            {task.model ? ` · ${task.model.split("/").pop()}` : ""}
            {task.status === "skipped" ? " · skipped, a dependency failed" : ""}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="space-y-4 border-t border-border px-3 py-4">
          <div>
            <Eyebrow>Brief</Eyebrow>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              {task.brief}
            </p>
          </div>

          {task.error && (
            <p className="text-[12.5px] leading-relaxed text-destructive/90">{task.error}</p>
          )}

          {output ? (
            <>
              {output.summary && (
                <p className="text-[13.5px] leading-relaxed text-foreground/90">
                  {output.summary}
                </p>
              )}
              {output.body && (
                <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-background/40 p-3 font-sans text-[13px] leading-relaxed text-foreground/85">
                  {output.body}
                </pre>
              )}
              {output.artifacts.map((artifact, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between gap-3">
                    <Eyebrow>{artifact.title}</Eyebrow>
                    <CopyButton text={artifact.content} what="Artifact" />
                  </div>
                  <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-background/40 p-3 font-mono text-[12px] leading-relaxed text-foreground/85">
                    {artifact.content}
                  </pre>
                </div>
              ))}
            </>
          ) : (
            !task.error && (
              <p className="text-[13px] text-muted-foreground">
                {task.status === "done"
                  ? "This specialist returned nothing readable."
                  : "No output yet."}
              </p>
            )
          )}
        </div>
      )}
    </li>
  );
}

/* ---------------- company memory ---------------- */

const MEMORY_ERRORS: Record<string, string> = {
  unauthenticated: "Please sign in to edit what the team remembers.",
  not_found: "That learning is already gone.",
};

/**
 * What finished missions taught the agency about this company. Every later plan
 * and every brief is written with these lines in front of it, so a wrong one
 * compounds across every future mission — hence the per-row remove.
 */
function TeamMemory({ companyId }: { companyId: Id<"companies"> }) {
  const memory = useQuery(api.missions.listMemory, { companyId });
  const forgetMemory = useMutation(api.missions.forgetMemory);
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState<Id<"companyMemory"> | null>(null);

  async function onForget(memoryId: Id<"companyMemory">) {
    if (!window.confirm("Remove this learning? Future missions will stop seeing it.")) return;
    setRemoving(memoryId);
    try {
      await forgetMemory({ memoryId });
      toast.success("Learning removed.");
    } catch (err) {
      const code = err instanceof ConvexError ? String(err.data) : "";
      toast.error(MEMORY_ERRORS[code] ?? "Couldn't remove that learning. Please try again.");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        {/* Eyebrow's classes inline — a <p> is not valid inside a <button>. */}
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          What the team has learned
          {memory && memory.length > 0 ? ` · ${memory.length}` : ""}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="mt-3">
          {memory === undefined ? (
            <div className="shimmer-line h-14 rounded-xl" />
          ) : memory.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card/30 p-5 text-center text-[13px] leading-relaxed text-muted-foreground">
              Nothing yet. Each time a mission finishes, the team distills what it learned
              about this company and carries it into the next one.
            </p>
          ) : (
            <>
              <ul className="space-y-2">
                {memory.map((m) => (
                  <li
                    key={m._id}
                    className="flex items-start gap-3 rounded-xl border border-border bg-card/40 p-3"
                  >
                    <span className="min-w-0 flex-1 text-[13px] leading-relaxed text-foreground/90">
                      {m.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => onForget(m._id)}
                      disabled={removing === m._id}
                      aria-label="Remove this learning"
                      title="Remove this learning"
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive disabled:opacity-50"
                    >
                      {removing === m._id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11.5px] leading-relaxed text-muted-foreground/70">
                AI-distilled from finished missions, then put in front of every new one.
                Remove anything that reads wrong before it shapes the next brief.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- root ---------------- */

/**
 * Mission control for one live company: dispatch the roster at a goal, then
 * watch the staffed specialists deliver. Owner-only — every query behind it
 * returns nothing for anyone else.
 */
export function MissionPanel({ companyId }: { companyId: Id<"companies"> }) {
  const missions = useQuery(api.missions.listForCompany, { companyId });
  const startMission = useMutation(api.missions.startMission);
  const cancelMission = useMutation(api.missions.cancel);

  const [goal, setGoal] = useState("");
  const [strategy, setStrategy] = useState<Strategy>("balanced");
  const [busy, setBusy] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [picked, setPicked] = useState<Id<"missions"> | null>(null);
  const [openTask, setOpenTask] = useState<string | null>(null);

  // Newest mission by default; an explicit pick wins until the user changes it.
  const selectedId = picked ?? missions?.[0]?._id ?? null;
  const board = useQuery(
    api.missions.missionBoard,
    selectedId ? { missionId: selectedId } : "skip"
  );

  const len = goal.trim().length;
  const tooShort = len > 0 && len < GOAL_MIN;
  const canSubmit = len >= GOAL_MIN && len <= GOAL_MAX && !busy;

  async function onDispatch(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    try {
      const { missionId } = await startMission({ companyId, goal: goal.trim(), strategy });
      setGoal("");
      setPicked(missionId);
      setOpenTask(null);
      toast.success("Mission dispatched — the orchestrator is staffing it.");
    } catch (err) {
      const code = err instanceof ConvexError ? String(err.data) : "";
      toast.error(ERRORS[code] ?? "Couldn't dispatch the mission. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onCancel(missionId: Id<"missions">) {
    setCancelling(true);
    try {
      await cancelMission({ missionId });
      toast.success("Mission cancelled.");
    } catch (err) {
      const code = err instanceof ConvexError ? String(err.data) : "";
      toast.error(ERRORS[code] ?? "Couldn't cancel the mission. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  const mission = board?.mission;
  const inFlight = mission?.status === "planning" || mission?.status === "running";
  const tokens = mission ? mission.tokensIn + mission.tokensOut : 0;

  return (
    <section className="rounded-2xl border border-border bg-card/40 p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-3xl tracking-tight">Put the agency on it</h2>
        <Link
          href="/agency"
          className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-lobster"
        >
          Meet the roster
        </Link>
      </div>
      <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
        Give the roster a goal. An orchestrator picks the specialists, runs them in
        parallel, and hands you each deliverable as an AI draft to review.
      </p>

      <form onSubmit={onDispatch} className="mt-5">
        <label htmlFor="mission-goal" className="sr-only">
          Mission goal
        </label>
        <textarea
          id="mission-goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          maxLength={GOAL_MAX}
          rows={3}
          disabled={busy}
          placeholder="Get this ready to charge: pricing tiers, the onboarding flow, and the first paid campaign…"
          className="w-full resize-y rounded-xl border border-input bg-transparent px-4 py-3 text-[14.5px] leading-relaxed text-foreground outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <p
            className={
              tooShort ? "text-[12px] text-destructive" : "text-[12px] text-muted-foreground"
            }
          >
            {tooShort
              ? `${GOAL_MIN - len} more characters to go`
              : "One goal per mission. The sharper it is, the better it gets staffed."}
          </p>
          <p className="font-mono text-[11px] text-muted-foreground">
            {len}/{GOAL_MAX}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div
              role="group"
              aria-label="Model strategy"
              className="inline-flex rounded-lg border border-border p-0.5"
            >
              {STRATEGIES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStrategy(s)}
                  aria-pressed={strategy === s}
                  title={STRATEGY_LABELS[s]}
                  className={cn(
                    "rounded-md px-3 py-1 text-[12.5px] font-medium capitalize transition-colors",
                    strategy === s
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
              {STRATEGY_LABELS[strategy]}
            </p>
          </div>
          <Button type="submit" disabled={!canSubmit} className="font-medium">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Dispatch
          </Button>
        </div>
      </form>

      <TeamMemory companyId={companyId} />

      {/* mission history */}
      <div className="mt-6">
        <Eyebrow>Missions</Eyebrow>
        <div className="mt-3 space-y-2">
          {missions === undefined ? (
            <div className="shimmer-line h-14 rounded-xl" />
          ) : missions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card/30 p-5 text-center text-[13px] text-muted-foreground">
              No missions yet. Describe a goal above and the agency staffs itself.
            </p>
          ) : (
            missions.map((m) => {
              const selected = m._id === selectedId;
              return (
                <button
                  key={m._id}
                  type="button"
                  onClick={() => {
                    setPicked(m._id);
                    setOpenTask(null);
                  }}
                  aria-current={selected}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                    selected
                      ? "border-lobster/40 bg-lobster/[0.04]"
                      : "border-border bg-card/40 hover:border-lobster/30"
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] text-foreground/90">
                      {m.goal}
                    </span>
                    <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                      {new Date(m.createdAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" · "}
                      {m.strategy}
                      {" · "}
                      {m.taskCount > 0 ? `${m.doneCount}/${m.taskCount} tasks` : "staffing"}
                    </span>
                  </span>
                  <MissionStatus status={m.status} />
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* task board for the selected mission */}
      {selectedId !== null && board === undefined && (
        <div className="mt-6 border-t border-border pt-6">
          <div className="shimmer-line h-40 rounded-xl" />
        </div>
      )}

      {board && mission && (
        <div className="mt-6 border-t border-border pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Eyebrow>Task board</Eyebrow>
              <p className="mt-1.5 text-[14px] leading-relaxed text-foreground/90">
                {mission.goal}
              </p>
              {mission.approach && (
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  {mission.approach}
                </p>
              )}
              {mission.error && (
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-destructive/90">
                  {mission.error}
                </p>
              )}
            </div>
            {inFlight && (
              <button
                type="button"
                onClick={() => onCancel(mission._id)}
                disabled={cancelling}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border px-3.5 text-[13px] text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive disabled:opacity-50"
              >
                <X className="size-3.5" />
                Cancel mission
              </button>
            )}
          </div>

          {board.tasks.length === 0 ? (
            <p className="mt-4 text-[13px] text-muted-foreground">
              {mission.status === "planning"
                ? "The orchestrator is staffing this mission…"
                : "This mission never got staffed."}
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {board.tasks.map((task) => (
                <TaskRow
                  key={task._id}
                  task={task}
                  open={openTask === task._id}
                  onToggle={() => setOpenTask(openTask === task._id ? null : task._id)}
                />
              ))}
            </ul>
          )}

          <p className="mt-4 text-[11.5px] leading-relaxed text-muted-foreground/70">
            Every deliverable here is an AI draft — read it before you act on it.
            {tokens > 0 && ` ${tokens.toLocaleString()} tokens used.`}
          </p>
        </div>
      )}
    </section>
  );
}
