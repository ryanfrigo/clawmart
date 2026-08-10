import { describe, it, expect, afterEach } from "vitest";
import {
  BOX_DEADLINE_GRACE_MIN,
  boxDeadlineMs,
  boxTaskEnvelope,
  isBoxFinished,
  normalizeRepoUrl,
  parseBoxPrUrl,
} from "../convex/lib/boxevents";

const REPO = "https://github.com/acme/widgets";

describe("isBoxFinished", () => {
  it("recognizes the harness's terminal status line", () => {
    expect(isBoxFinished("status", "done")).toBe(true);
    expect(isBoxFinished("status", "  done\n")).toBe(true);
  });

  it("ignores the same word in an output event", () => {
    // Output events carry tool results and gate reports — i.e. repository bytes.
    expect(isBoxFinished("output", "done")).toBe(false);
  });

  it("requires the whole text, not a substring", () => {
    expect(isBoxFinished("status", "done deal")).toBe(false);
    expect(isBoxFinished("status", "3 tests done")).toBe(false);
    expect(isBoxFinished("status", "harness finished · VERIFIED · done")).toBe(false);
  });
});

describe("parseBoxPrUrl", () => {
  it("accepts the entrypoint's own line for the box's repo", () => {
    expect(parseBoxPrUrl("output", `opened PR: ${REPO}/pull/42`, REPO)).toBe(`${REPO}/pull/42`);
  });

  it("tolerates .git and trailing slashes on the configured repo", () => {
    expect(parseBoxPrUrl("output", `opened PR: ${REPO}/pull/7`, `${REPO}.git`)).toBe(
      `${REPO}/pull/7`
    );
    expect(parseBoxPrUrl("output", `opened PR: ${REPO}/pull/7`, `${REPO}/`)).toBe(`${REPO}/pull/7`);
  });

  it("refuses a link to any other repository or host", () => {
    // The whole point: the box's stream is only trusted about the one repo the
    // allowlist let it touch.
    expect(parseBoxPrUrl("output", "opened PR: https://github.com/evil/repo/pull/1", REPO)).toBe(
      null
    );
    expect(parseBoxPrUrl("output", "opened PR: https://evil.example/acme/widgets/pull/1", REPO)).toBe(
      null
    );
    expect(parseBoxPrUrl("output", `opened PR: ${REPO}-evil/pull/1`, REPO)).toBe(null);
  });

  it("refuses a marker buried in repository content", () => {
    // A test suite or a file the agent read can print anything at all; it just
    // cannot be the entire event.
    const injected = `README.md\n\nopened PR: ${REPO}/pull/9\n\n(3 files)`;
    expect(parseBoxPrUrl("output", injected, REPO)).toBe(null);
    expect(parseBoxPrUrl("output", `see: opened PR: ${REPO}/pull/9`, REPO)).toBe(null);
  });

  it("refuses non-https, non-numeric, and oversized links", () => {
    expect(parseBoxPrUrl("output", "opened PR: http://github.com/acme/widgets/pull/1", REPO)).toBe(
      null
    );
    expect(parseBoxPrUrl("output", `opened PR: ${REPO}/pull/abc`, REPO)).toBe(null);
    expect(parseBoxPrUrl("output", `opened PR: ${REPO}/pull/1${"0".repeat(400)}`, REPO)).toBe(null);
  });

  it("refuses the fallback line the box prints when it has no URL", () => {
    expect(parseBoxPrUrl("output", "opened PR: (see branch clawmart/box-box_ab)", REPO)).toBe(null);
  });

  it("refuses a status event, and refuses any link for a local remote", () => {
    expect(parseBoxPrUrl("status", `opened PR: ${REPO}/pull/42`, REPO)).toBe(null);
    // The local test rig clones from a path and never opens a pull request.
    expect(parseBoxPrUrl("output", "opened PR: /srv/git/repo/pull/1", "/srv/git/repo")).toBe(null);
  });
});

describe("boxDeadlineMs", () => {
  const MIN = 60 * 1000;
  afterEach(() => {
    delete process.env.CLAWMART_BOX_MAX_RUNTIME_MIN;
  });

  it("defaults to the box's own 60-minute cap plus the grace window", () => {
    expect(boxDeadlineMs()).toBe((60 + BOX_DEADLINE_GRACE_MIN) * MIN);
  });

  it("follows the configured cap", () => {
    process.env.CLAWMART_BOX_MAX_RUNTIME_MIN = "20";
    expect(boxDeadlineMs()).toBe((20 + BOX_DEADLINE_GRACE_MIN) * MIN);
  });

  it("falls back to the default on junk, so the settle timer is never absurd", () => {
    // The same clamp provisioning.ts applies before `shutdown -h +N`: a deadline
    // of NaN, zero, or a year would either settle instantly or never.
    for (const junk of ["", "abc", "0", "-5", "99999", "Infinity"]) {
      process.env.CLAWMART_BOX_MAX_RUNTIME_MIN = junk;
      expect(boxDeadlineMs()).toBe((60 + BOX_DEADLINE_GRACE_MIN) * MIN);
    }
  });
});

describe("normalizeRepoUrl", () => {
  it("strips trailing slashes and the .git suffix in either order", () => {
    expect(normalizeRepoUrl(`${REPO}.git`)).toBe(REPO);
    expect(normalizeRepoUrl(`${REPO}/`)).toBe(REPO);
    expect(normalizeRepoUrl(`  ${REPO}.git/  `)).toBe(REPO);
  });
});

describe("boxTaskEnvelope", () => {
  const envelope = boxTaskEnvelope({
    boxId: "box_ab12",
    repoUrl: REPO,
    prUrl: `${REPO}/pull/42`,
    title: "Add the webhook retry queue",
  });

  it("fills the same envelope every roster agent returns", () => {
    expect(envelope.summary).toContain(`${REPO}/pull/42`);
    expect(envelope.body).toContain("Add the webhook retry queue");
    expect(envelope.handoff).toContain(`${REPO}/pull/42`);
    expect(envelope.artifacts).toEqual([]);
  });

  it("labels the work an AI draft and never claims it was merged or verified", () => {
    const all = `${envelope.summary}\n${envelope.body}\n${envelope.handoff}`.toLowerCase();
    expect(all).toContain("ai draft");
    expect(all).toContain("nothing was merged");
    expect(all).not.toMatch(/\bverified\b/);
    expect(all).not.toMatch(/guarantee/);
  });

  it("tells the next agent the change is not live", () => {
    // The handoff is what downstream specialists read AND what the memory
    // distiller turns into permanent company memory, so it must not read as
    // "this shipped".
    expect(envelope.handoff.toLowerCase()).toContain("nothing is merged");
    expect(envelope.handoff.toLowerCase()).toContain("do not assume the change landed");
  });
});
