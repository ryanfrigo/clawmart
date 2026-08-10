/**
 * Clawmart dev boxes — the box→control-plane report contract, as pure functions.
 *
 * A box reports through exactly ONE channel: `POST /box/event` with
 * `{kind: "status" | "output", text}` (convex/http.ts). There is no structured
 * completion callback, so the mission bridge has to recognise the harness's
 * terminal lines inside a stream that also carries repository content — tool
 * results and verification-gate output are posted as `output` events, and a
 * repository can contain any bytes it likes, including a line shaped exactly
 * like the box's own.
 *
 * Two rules, both cheap and both load-bearing:
 *
 *  1. A marker must be the WHOLE event text, never a substring. Repository bytes
 *     reach the feed inside multi-line rendered tool results and gate reports;
 *     they are never the entire text of an event.
 *  2. A pull-request link is accepted only when it resolves under the repo the
 *     box was allowlisted to touch, so the worst a spoofed line can achieve is
 *     pointing at a different PR in that same repository.
 *
 * Neither rule makes the stream trustworthy. They bound what a compromised or
 * prompt-injected box run can write into a mission's deliverable, which is the
 * threat the ADR already names ("treat a dev box like an untrusted contributor").
 *
 * Pure by design: no Convex imports, so every rule here is unit-tested
 * (tests/boxevents.test.ts).
 */

/** Slack past the box's own hard shutdown before the control plane gives up. */
export const BOX_DEADLINE_GRACE_MIN = 5;

/**
 * How long the control plane waits for a box before declaring it gone.
 *
 * The box self-terminates at CLAWMART_BOX_MAX_RUNTIME_MIN (`shutdown -h +N`, set
 * before anything else in boot); this is that same value plus a grace window.
 * The clamp is duplicated from provisioning.ts rather than imported because that
 * module is `"use node"` — importing it would drag the Node runtime and the AWS
 * SDK into every mutation that needs one number.
 *
 * Two callers depend on this being ONE number: boxes.ts schedules the settle at
 * it, and missions.ts lets a mission with a live box outlive the stale-mission
 * watchdog until it passes.
 */
export function boxDeadlineMs(): number {
  let minutes = Math.floor(Number(process.env.CLAWMART_BOX_MAX_RUNTIME_MIN ?? 60));
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 1440) minutes = 60;
  return (minutes + BOX_DEADLINE_GRACE_MIN) * 60 * 1000;
}

/** The harness's last line on every non-crash path (infra/agent/entrypoint.sh). */
const DONE_TEXT = "done";
/** The line that carries the PR link, emitted immediately before "done". */
const PR_PREFIX = "opened PR: ";
/** Longest link we will store; a real GitHub PR URL is far shorter. */
const PR_URL_MAX = 300;

/** Compare repo URLs the way git does: no trailing slash, no `.git` suffix. */
export function normalizeRepoUrl(repoUrl: string): string {
  return repoUrl.trim().replace(/\/+$/, "").replace(/\.git$/i, "").replace(/\/+$/, "");
}

/**
 * Did the box just finish? True only for the harness's own terminal status
 * line. A crash skips it — which is why the deadline mutation, not this
 * function, is what guarantees the task settles.
 */
export function isBoxFinished(kind: string, text: string): boolean {
  return kind === "status" && text.trim() === DONE_TEXT;
}

/**
 * Extract the pull request the box says it opened, or null.
 *
 * Requires: an `output` event whose entire text is `opened PR: <url>`, where
 * <url> is `<the box's own repo>/pull/<digits>` over https. Anything else —
 * a substring match, another host, another repository, a non-numeric id — is
 * not a PR link as far as the control plane is concerned.
 */
export function parseBoxPrUrl(kind: string, text: string, repoUrl: string): string | null {
  if (kind !== "output") return null;
  const line = text.trim();
  if (!line.startsWith(PR_PREFIX)) return null;

  const url = line.slice(PR_PREFIX.length).trim();
  if (!url || url.length > PR_URL_MAX) return null;

  const base = normalizeRepoUrl(repoUrl);
  // A local/self-hosted remote (the test rig) never opens a pull request, and
  // "under the allowlisted repo" is meaningless without an https origin.
  if (!base.startsWith("https://")) return null;

  const match = /^(https:\/\/\S+)\/pull\/\d+$/.exec(url);
  if (!match) return null;
  if (normalizeRepoUrl(match[1]) !== base) return null;
  return url;
}

/**
 * The mission-task envelope for a box run, in the same shape every roster agent
 * returns (lib/roster.ts TASK_CONTRACT), so the DAG, the mission board, and the
 * memory distiller all keep working with no special case.
 *
 * The wording is bound by CLAUDE.md's trust rules exactly like generated copy:
 * it reports what the box did, labels it an AI draft, and claims nothing about
 * correctness. The verification verdict lives in the pull request itself (the
 * harness ships a DRAFT-titled PR when its gate was red, missing, or never
 * reached) — restating a verdict here from a stream we do not fully trust would
 * be inventing one.
 */
export function boxTaskEnvelope(input: {
  boxId: string;
  repoUrl: string;
  prUrl: string;
  title: string;
}): { summary: string; body: string; artifacts: never[]; handoff: string } {
  const summary = `Dev box opened a pull request for review: ${input.prUrl}`;
  const body = [
    `## Dev box run — ${input.title}`,
    "",
    `A Clawmart dev box (\`${input.boxId}\`) worked on \`${input.repoUrl}\` for this task`,
    `and opened a pull request:`,
    "",
    input.prUrl,
    "",
    "**This is an AI draft.** Nothing was merged, and no claim is made here that the",
    "change is correct. The pull request carries the box's own verification output —",
    "it is opened as a draft when the repository's gate was red, absent, or never",
    "reached. Review the diff before merging it.",
  ].join("\n");
  const handoff =
    `A dev box drafted this change on ${input.repoUrl} and opened ${input.prUrl} for human ` +
    `review; nothing is merged. Read that pull request for the actual diff and the ` +
    `verification output it carries — do not assume the change landed.`;
  return { summary, body, artifacts: [], handoff };
}
