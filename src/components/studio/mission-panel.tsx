"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { Trash2, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { STRATEGIES, STRATEGY_LABELS, type Strategy } from "../../../convex/lib/router";
import { MAX_COMPANY_MEMORY } from "../../../convex/lib/roster";
import { CopyButton } from "@/components/studio/copy-button";
import { DictationControl } from "@/components/voice/dictation-control";
import { MissionGraph, MissionStatusBar } from "@/components/studio/mission-graph";
import { TaskLedger } from "@/components/studio/task-ledger";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { depthOf } from "@/lib/graph-geometry";
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
  { label: string; dot: string; text: string; border: string; heat?: boolean }
> = {
  planning: {
    label: "Planning",
    dot: "bg-lobster",
    text: "text-lobster",
    border: "border-lobster/45",
    heat: true,
  },
  running: {
    label: "Running",
    dot: "bg-lobster",
    text: "text-lobster",
    border: "border-lobster/45",
    heat: true,
  },
  done: { label: "Done", dot: "bg-kelp", text: "text-kelp", border: "border-kelp/45" },
  failed: {
    label: "Failed",
    dot: "bg-destructive",
    text: "text-destructive",
    border: "border-destructive/45",
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-sand",
    text: "text-sand",
    border: "border-sand/45",
  },
};

/** Mission-status stamp — same vocabulary as StatusBadge, different statuses. */
function MissionStatus({ status }: { status: string }) {
  const s = MISSION_STATUS[status] ?? MISSION_STATUS.cancelled;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-[3px] border px-2 py-0.5 font-mono text-[10px] uppercase leading-[1.4] tracking-[0.16em]",
        s.border,
        s.text
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full", s.dot, s.heat && "anim-heat")}
      />
      {s.label}
    </span>
  );
}

/** A region label. Mono here is legitimate: every one of these sits over data. */
function Stamp({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("stamp", className)}>{children}</p>;
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

/**
 * Mono is a truth claim, not a texture. An artifact is set in mono only when it
 * is actually code-shaped; a positioning statement or a campaign brief is prose
 * an agent wrote, and setting it in 12px mono made it both unreadable and a lie
 * about what it is.
 */
function isCodeShaped(content: string): boolean {
  if (content.includes("```")) return true;
  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 3) return false;
  // Markdown list markers (- * #) are deliberately NOT signals: a bulleted
  // checklist is prose an agent wrote, and setting it in 12px mono was the
  // exact defect this heuristic exists to fix. Only real code punctuation and
  // leading indentation count.
  const marked = lines.filter((l) => /^(\s{2,}|\t|[{}[\]<>;=|])/.test(l)).length;
  return marked / lines.length > 0.3;
}

type BoardTask = {
  _id: Id<"missionTasks">;
  index: number;
  agentName: string;
  division: string;
  title: string;
  brief: string;
  dependsOn: number[];
  status: string;
  model?: string;
  outputJson?: string;
  error?: string;
  startedAt?: number;
  finishedAt?: number;
};

/**
 * The deliverable, opened below the ledger. Headed by a sand AI-DRAFT stamp and
 * footed by the model that produced it — that label is never removed to tidy up
 * a screen.
 */
function TaskDetail({ task }: { task: BoardTask }) {
  const output = parseOutput(task.outputJson);

  return (
    <div className="plate mt-px overflow-hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[color:var(--rule)] bg-muted px-4 py-2">
        <Stamp className="text-sand">AI draft · T-{String(task.index + 1).padStart(2, "0")}</Stamp>
        <p className="font-mono text-[11px] text-muted-foreground">
          {task.agentName}
          {task.model ? ` · ${task.model.split("/").pop()}` : ""}
        </p>
      </div>

      <div className="space-y-5 p-4">
        <div>
          <Stamp>Brief</Stamp>
          <p className="mt-1.5 max-w-[68ch] text-[13.5px] leading-[1.55] text-muted-foreground">
            {task.brief}
          </p>
        </div>

        {task.status === "skipped" && (
          <p className="border-l-2 border-sand bg-muted px-3 py-2 text-[12.5px] leading-relaxed text-foreground/90">
            Skipped — a task this one depends on did not finish.
          </p>
        )}

        {task.error && (
          <p className="flex gap-2 border-l-2 border-destructive bg-muted px-3 py-2 text-[12.5px] leading-relaxed text-foreground/90">
            <span className="stamp shrink-0 pt-0.5 text-destructive">Err</span>
            <span>{task.error}</span>
          </p>
        )}

        {output ? (
          <>
            {output.summary && (
              <p className="max-w-[68ch] text-[14px] leading-[1.6] text-foreground">
                {output.summary}
              </p>
            )}
            {output.body && (
              <div>
                <Stamp>Deliverable</Stamp>
                {/* An agent wrote prose. Prose is set in sans. */}
                <div className="well mt-1.5 max-h-96 overflow-y-auto p-3">
                  <p className="whitespace-pre-wrap text-[13.5px] leading-[1.65] text-foreground/90">
                    {output.body}
                  </p>
                </div>
              </div>
            )}
            {output.artifacts.map((artifact, i) => {
              const code = isCodeShaped(artifact.content);
              return (
                <div key={i}>
                  <div className="flex items-center justify-between gap-3">
                    <Stamp>{artifact.title}</Stamp>
                    <CopyButton text={artifact.content} what="Artifact" />
                  </div>
                  <div className="well mt-1.5 max-h-96 overflow-auto p-3">
                    <pre
                      className={cn(
                        "whitespace-pre-wrap text-foreground/90",
                        code
                          ? "font-mono text-[12.5px] leading-[1.5]"
                          : "font-sans text-[13.5px] leading-[1.65]"
                      )}
                    >
                      {artifact.content}
                    </pre>
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          !task.error && (
            <p className="stamp">
              {task.status === "done" ? "No readable output" : "Awaiting output — —"}
            </p>
          )
        )}
      </div>
    </div>
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
    <section className="plate overflow-hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[color:var(--rule)] bg-muted px-4 py-2">
        <Stamp>Company memory</Stamp>
        <p className="tnum font-mono text-[11px] text-muted-foreground">
          {memory === undefined ? "— —" : `${memory.length}/${MAX_COMPANY_MEMORY}`}
        </p>
      </div>

      {memory === undefined ? (
        <p className="stamp px-4 py-6 text-center">Reading memory — —</p>
      ) : memory.length === 0 ? (
        <p className="px-4 py-6 text-center text-[13px] leading-relaxed text-muted-foreground">
          Nothing yet. Each time a mission finishes, the team distills what it learned
          about this company and carries it into the next one.
        </p>
      ) : (
        <>
          <ol>
            {memory.map((m, i) => (
              <li
                key={m._id}
                className="flex items-start gap-3 border-b border-[color:var(--border)] px-4 py-2.5 last:border-b-0"
              >
                <span className="stamp shrink-0 pt-1 text-tide">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 text-[13.5px] leading-[1.55] text-foreground/90">
                  {m.text}
                </span>
                <button
                  type="button"
                  onClick={() => onForget(m._id)}
                  disabled={removing === m._id}
                  aria-label="Remove this learning"
                  title="Remove this learning"
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-[3px] text-muted-foreground outline-none transition-colors duration-[120ms] hover:bg-accent hover:text-destructive disabled:opacity-45"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ol>
          <p className="border-t border-[color:var(--border)] px-4 py-3 text-[12px] leading-relaxed text-muted-foreground">
            AI-distilled from finished missions, then put in front of every new one.
            Remove anything that reads wrong before it shapes the next brief.
          </p>
        </>
      )}
    </section>
  );
}

/* ---------------- root ---------------- */

/**
 * Mission control for one live company: dispatch the roster at a goal, then
 * watch the staffed specialists deliver. Owner-only — every query behind it
 * returns nothing for anyone else.
 *
 * The board is a real dependency graph paired with a telemetry ledger. Columns
 * are waves, which is literally how `claimReadyTasks` schedules, so the picture
 * is the scheduler rather than an illustration of it.
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
  const tasks = (board?.tasks ?? []) as BoardTask[];
  const openedTask = tasks.find((t) => t._id === openTask) ?? null;

  // Wave readout, derived from the same depth pass the graph uses.
  const depths = depthOf(tasks);
  const waveCount = tasks.length === 0 ? 0 : Math.max(...tasks.map((t) => depths.get(t.index) ?? 0)) + 1;
  const started = tasks.filter((t) => t.status !== "queued");
  const currentWave =
    started.length === 0 ? 0 : Math.max(...started.map((t) => (depths.get(t.index) ?? 0) + 1));

  return (
    <section className="border-t border-[color:var(--rule)] pt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[color:var(--rule)] pb-3">
        <h2 className="stamp-lg text-foreground">Put the agency on it</h2>
        <Link
          href="/agency"
          className="rounded-[3px] font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground outline-none transition-colors duration-[120ms] hover:text-foreground"
        >
          Meet the roster →
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        {/* ---- dispatch slot ---- */}
        <form onSubmit={onDispatch} className="plate p-4">
          <div className="flex items-baseline justify-between gap-4">
            <label htmlFor="mission-goal" className="stamp">
              Mission goal
            </label>
            <span className="tnum font-mono text-[11px] text-[color:var(--label)]">
              {len}/{GOAL_MAX}
            </span>
          </div>
          <Textarea
            id="mission-goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            maxLength={GOAL_MAX}
            rows={3}
            disabled={busy}
            aria-invalid={tooShort}
            placeholder="Get this ready to charge: pricing tiers, the onboarding flow, and the first paid campaign…"
            className="mt-2 text-[14.5px]"
          />
          {/* Voice is strictly additive: dictation appends to whatever is typed,
              and the textarea above stays fully usable while the mic is open. */}
          <DictationControl
            value={goal}
            onChange={setGoal}
            maxLength={GOAL_MAX}
            disabled={busy}
            fieldLabel="the mission goal"
            className="mt-2.5"
          />
          {tooShort ? (
            <p
              role="alert"
              className="mt-2 flex gap-2 border-l-2 border-destructive bg-muted px-3 py-2 text-[12.5px] leading-relaxed text-foreground/90"
            >
              <span className="stamp shrink-0 pt-0.5 text-destructive">Err</span>
              <span>{GOAL_MIN - len} more characters before this can be staffed.</span>
            </p>
          ) : (
            <p className="mt-2 text-[12.5px] text-muted-foreground">
              One goal per mission. The sharper it is, the better it gets staffed.
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="stamp">Model strategy</p>
              <div
                role="group"
                aria-label="Model strategy"
                className="mt-1.5 inline-flex rounded-[3px] border border-[color:var(--rule)] bg-muted p-px"
              >
                {STRATEGIES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStrategy(s)}
                    aria-pressed={strategy === s}
                    title={STRATEGY_LABELS[s]}
                    className={cn(
                      "rounded-[2px] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] outline-none transition-colors duration-[120ms]",
                      strategy === s
                        ? "bg-card text-foreground shadow-[inset_0_-2px_0_var(--lobster)]"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="mt-2 max-w-[52ch] text-[12px] leading-relaxed text-muted-foreground">
                {STRATEGY_LABELS[strategy]}
              </p>
            </div>
            <Button type="submit" disabled={!canSubmit}>
              {busy ? "Dispatching…" : "Dispatch"}
            </Button>
          </div>
        </form>

        {/* ---- mission list ---- */}
        <div className="plate overflow-hidden">
          <div className="border-b border-[color:var(--rule)] bg-muted px-4 py-2">
            <Stamp>Missions</Stamp>
          </div>
          {missions === undefined ? (
            <p className="stamp px-4 py-6 text-center">Reading missions — —</p>
          ) : missions.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
              No missions yet. Describe a goal and the agency staffs itself.
            </p>
          ) : (
            <ul className="max-h-72 overflow-y-auto">
              {missions.map((m) => {
                const selected = m._id === selectedId;
                return (
                  <li key={m._id}>
                    <button
                      type="button"
                      onClick={() => {
                        setPicked(m._id);
                        setOpenTask(null);
                      }}
                      aria-current={selected}
                      className={cn(
                        "flex w-full items-center gap-3 border-b border-[color:var(--border)] px-4 py-2.5 text-left outline-none transition-colors duration-[120ms] hover:bg-accent",
                        selected && "bg-accent"
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-foreground/90">
                          {m.goal}
                        </span>
                        <span className="tnum mt-0.5 block font-mono text-[11px] text-[color:var(--label)]">
                          {new Date(m.createdAt).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {" · "}
                          {m.strategy}
                          {" · "}
                          {m.taskCount > 0 ? `${m.doneCount}/${m.taskCount}` : "staffing"}
                        </span>
                      </span>
                      <MissionStatus status={m.status} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ---- the plan ---- */}
      {selectedId !== null && board === undefined && (
        <div className="well mt-6 flex h-40 items-center justify-center">
          <p className="stamp">Loading plan — —</p>
        </div>
      )}

      {board && mission && (
        <div className="mt-8">
          <div className="flex flex-col gap-3 border-b border-[color:var(--rule)] pb-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Stamp>The plan</Stamp>
              {/* The goal is the human's own words — the one register reserved
                  for what the operator said, not what a machine wrote. */}
              <p className="mt-1.5 max-w-[62ch] font-display text-[19px] italic leading-snug text-lobster">
                {mission.goal}
              </p>
              {mission.approach && (
                <p className="mt-1.5 max-w-[68ch] text-[13px] leading-[1.55] text-muted-foreground">
                  {mission.approach}
                </p>
              )}
              {mission.error && (
                <p className="mt-2 flex max-w-[68ch] gap-2 border-l-2 border-destructive bg-muted px-3 py-2 text-[12.5px] leading-relaxed text-foreground/90">
                  <span className="stamp shrink-0 pt-0.5 text-destructive">Err</span>
                  <span>{mission.error}</span>
                </p>
              )}
            </div>
            {inFlight && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onCancel(mission._id)}
                disabled={cancelling}
                className="shrink-0 hover:border-destructive/60 hover:text-destructive"
              >
                <X className="size-3.5" />
                Cancel mission
              </Button>
            )}
          </div>

          <div className="mt-4">
            <MissionGraph
              tasks={tasks}
              missionStatus={mission.status}
              selectedId={openTask}
              onSelect={(id) => setOpenTask(openTask === id ? null : id)}
            />
            <MissionStatusBar
              strategy={mission.strategy}
              wave={currentWave}
              waveCount={waveCount}
              running={tasks.filter((t) => t.status === "running").length}
              done={tasks.filter((t) => t.status === "done").length}
              skipped={tasks.filter((t) => t.status === "skipped").length}
              tokens={tokens}
            />
            <div className="plate mt-px overflow-hidden">
              <TaskLedger tasks={tasks} selectedId={openTask} onSelect={(id) => setOpenTask(id)} />
            </div>
            {openedTask && <TaskDetail task={openedTask} />}
          </div>

          <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
            Every deliverable here is an AI draft — read it before you act on it.
          </p>
        </div>
      )}

      <div className="mt-8">
        <TeamMemory companyId={companyId} />
      </div>
    </section>
  );
}
