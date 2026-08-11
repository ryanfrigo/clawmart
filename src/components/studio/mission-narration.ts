/**
 * What a mission sounds like.
 *
 * The graph is the product's whole point — 35 specialists, waves lighting up,
 * handoffs travelling edges — and none of it exists for a screen reader. Node
 * `aria-label`s do update as tasks advance, but a label change on an element
 * that does not have focus is announced by nothing. So a mission that runs for
 * minutes was, non-visually, silence.
 *
 * The Studio's five-agent build already got this right (build-view.tsx wraps
 * its event feed in aria-live="polite"); the Agency never did. This is the
 * missing half.
 *
 * WHY A PURE FUNCTION: Convex live queries re-render this tree constantly. A
 * live region announces when its TEXT changes, not when React re-renders, so
 * the whole design is "derive one stable sentence". Identical input produces
 * an identical string, React mutates no text node, and the screen reader stays
 * quiet. The sentence changes only on things worth interrupting someone for:
 * a new wave, a different set of specialists working, another task finished,
 * or the mission ending.
 */

export interface NarratableTask {
  status: string;
  agentName: string;
  depth?: number;
}

/** Oxford-comma list, capped — eight names read aloud is a filibuster. */
function names(list: string[], max = 3): string {
  const shown = list.slice(0, max);
  const rest = list.length - shown.length;
  const joined =
    shown.length <= 1
      ? (shown[0] ?? "")
      : `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
  return rest > 0 ? `${joined}, and ${rest} more` : joined;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/**
 * One sentence describing the mission right now, or "" when there is nothing
 * worth saying (an empty region announces nothing, which is what we want).
 */
export function missionNarration(
  tasks: NarratableTask[],
  missionStatus: string,
  waveCount: number
): string {
  if (missionStatus === "planning") {
    return "Orchestrator is drafting the mission plan.";
  }
  if (tasks.length === 0) return "";

  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const failed = tasks.filter((t) => t.status === "failed").length;
  const skipped = tasks.filter((t) => t.status === "skipped").length;
  const running = tasks.filter((t) => t.status === "running");

  // Terminal states report the outcome, not the progress — someone who just
  // heard "6 of 8 done" needs to know whether the other two failed or skipped.
  if (missionStatus === "done" || missionStatus === "complete") {
    const tail = [
      failed > 0 ? plural(failed, "failed") : "",
      skipped > 0 ? plural(skipped, "skipped") : "",
    ].filter(Boolean);
    return tail.length
      ? `Mission complete. ${plural(done, "task")} done, ${tail.join(", ")}.`
      : `Mission complete. All ${plural(total, "task")} done.`;
  }
  if (missionStatus === "failed") {
    return `Mission failed after ${plural(done, "task")}. ${plural(failed, "task")} failed.`;
  }
  if (missionStatus === "cancelled") {
    return `Mission cancelled. ${plural(done, "task")} finished before it stopped.`;
  }

  if (running.length === 0) {
    return `${done} of ${total} tasks done. Waiting for the next wave.`;
  }

  // Wave number comes from the shallowest running task: with several waves in
  // flight the one still feeding the others is the honest "where we are".
  const depths = running.map((t) => t.depth).filter((d): d is number => typeof d === "number");
  const wave = depths.length ? Math.min(...depths) + 1 : 0;
  const where = wave > 0 && waveCount > 0 ? `Wave ${wave} of ${waveCount}. ` : "";

  return `${where}${names(running.map((t) => t.agentName))} working. ${done} of ${total} tasks done.`;
}
