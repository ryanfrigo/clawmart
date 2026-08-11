import { describe, it, expect } from "vitest";
import {
  missionNarration,
  type NarratableTask,
} from "../src/components/studio/mission-narration";

const t = (
  status: string,
  agentName = "Backend Architect",
  depth = 0
): NarratableTask => ({ status, agentName, depth });

describe("missionNarration", () => {
  it("speaks while the orchestrator is still planning", () => {
    expect(missionNarration([], "planning", 0)).toBe(
      "Orchestrator is drafting the mission plan."
    );
  });

  it("says nothing when there is nothing to say", () => {
    // An empty live region announces nothing, which is the correct behaviour
    // for a mission that was never staffed.
    expect(missionNarration([], "cancelled", 0)).toBe("");
  });

  it("names who is working and where the mission is", () => {
    const out = missionNarration(
      [
        t("done", "Strategist", 0),
        t("running", "Security Engineer", 1),
        t("queued", "Frontend Developer", 2),
      ],
      "running",
      3
    );
    expect(out).toBe("Wave 2 of 3. Security Engineer working. 1 of 3 tasks done.");
  });

  it("joins two names with 'and', not a comma", () => {
    const out = missionNarration(
      [t("running", "Alpha", 0), t("running", "Beta", 0)],
      "running",
      1
    );
    expect(out).toContain("Alpha and Beta working");
  });

  it("caps the roll call — eight names read aloud is a filibuster", () => {
    const many = Array.from({ length: 8 }, (_, i) => t("running", `Agent${i}`, 0));
    const out = missionNarration(many, "running", 1);
    expect(out).toContain("and 5 more");
    expect(out).not.toContain("Agent7");
  });

  it("reports the shallowest running wave when several are in flight", () => {
    // Wave 2 is still feeding wave 3, so "where we are" is 2, not 3.
    const out = missionNarration(
      [t("running", "A", 1), t("running", "B", 2)],
      "running",
      4
    );
    expect(out.startsWith("Wave 2 of 4.")).toBe(true);
  });

  it("covers the gap between waves instead of going quiet", () => {
    const out = missionNarration([t("done", "A", 0), t("queued", "B", 1)], "running", 2);
    expect(out).toBe("1 of 2 tasks done. Waiting for the next wave.");
  });

  it("reports the outcome, not the progress, when the mission ends", () => {
    const clean = missionNarration([t("done"), t("done")], "done", 1);
    expect(clean).toBe("Mission complete. All 2 tasks done.");

    // Someone who just heard "2 of 4 done" needs to know what happened to the
    // other two — a bare completion count would hide the failures.
    const messy = missionNarration(
      [t("done"), t("done"), t("failed"), t("skipped")],
      "done",
      2
    );
    expect(messy).toBe("Mission complete. 2 tasks done, 1 failed, 1 skipped.");
  });

  it("does not announce a failure as a success", () => {
    const out = missionNarration([t("done"), t("failed")], "failed", 2);
    expect(out).toMatch(/failed/i);
    expect(out).not.toMatch(/complete/i);
  });

  it("singularises so it never says '1 tasks'", () => {
    const out = missionNarration([t("done")], "done", 1);
    expect(out).toContain("1 task done");
    expect(out).not.toContain("1 tasks");
  });

  /**
   * The one that keeps this from becoming spam. Convex re-renders this tree on
   * every server tick; the live region only stays quiet because identical
   * state yields a byte-identical string, so React mutates no text node.
   */
  it("is stable across re-renders — identical state, identical sentence", () => {
    const state: NarratableTask[] = [
      t("done", "Strategist", 0),
      t("running", "Security Engineer", 1),
    ];
    const a = missionNarration(state, "running", 2);
    const b = missionNarration([...state], "running", 2);
    expect(a).toBe(b);
  });

  it("changes when — and only when — something worth hearing changed", () => {
    const before = missionNarration(
      [t("done", "Strategist", 0), t("running", "Security Engineer", 1)],
      "running",
      2
    );
    const sameProgress = missionNarration(
      [t("done", "Strategist", 0), t("running", "Security Engineer", 1)],
      "running",
      2
    );
    const taskFinished = missionNarration(
      [t("done", "Strategist", 0), t("done", "Security Engineer", 1)],
      "running",
      2
    );
    expect(sameProgress).toBe(before);
    expect(taskFinished).not.toBe(before);
  });
});
