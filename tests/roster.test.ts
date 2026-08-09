import { describe, expect, it } from "vitest";
import {
  CONTEXT_CHAR_BUDGET,
  DIVISIONS,
  MAX_TASKS,
  MIN_TASKS,
  ROSTER,
  agentsByDivision,
  buildTaskMessages,
  getAgent,
  normalizeTaskOutput,
  planMessages,
  validatePlan,
} from "../convex/lib/roster";

const TIERS = ["worker", "premium"];

describe("roster definitions", () => {
  it("has unique, plan-safe keys", () => {
    const keys = ROSTER.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) {
      // Keys are copied verbatim by the planner and stored on task rows —
      // anything but a slug invites quoting/whitespace bugs.
      expect(key).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("every entry is fully populated and on a real division and tier", () => {
    expect(ROSTER.length).toBeGreaterThan(0);
    for (const agent of ROSTER) {
      expect(DIVISIONS).toContain(agent.division);
      expect(TIERS).toContain(agent.tier);
      for (const field of [agent.name, agent.blurb, agent.role, agent.delivers]) {
        expect(typeof field).toBe("string");
        expect(field.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("only engineering roles are code-capable", () => {
    // codeCapable is what routes work to a dev box (docs/PROVISIONING.md).
    for (const agent of ROSTER.filter((a) => a.codeCapable)) {
      expect(agent.division).toBe("engineering");
    }
  });

  it("agentsByDivision partitions the whole roster", () => {
    const seen = DIVISIONS.flatMap((d) => agentsByDivision(d));
    expect(seen.length).toBe(ROSTER.length);
    for (const division of DIVISIONS) {
      expect(agentsByDivision(division).length).toBeGreaterThan(0);
    }
  });

  it("getAgent resolves every key and rejects anything else", () => {
    for (const agent of ROSTER) {
      expect(getAgent(agent.key)).toBe(agent);
    }
    expect(getAgent("not-an-agent")).toBeUndefined();
    expect(getAgent("")).toBeUndefined();
  });

  // A planner that emits agentKey "constructor", "toString" or "valueOf" must
  // not be staffed: before ROSTER_BY_KEY was given a null prototype, getAgent
  // returned the inherited Object function, the task passed validatePlan, and
  // runTask prompted a real model with "You are Object, undefined."
  it("does not resolve inherited Object.prototype keys", () => {
    for (const key of ["constructor", "toString", "valueOf", "hasOwnProperty", "__proto__"]) {
      expect(getAgent(key)).toBeUndefined();
    }
    expect(() =>
      validatePlan({ tasks: [{ title: "T", agentKey: "constructor", brief: "b", dependsOn: [] }] })
    ).toThrow(/roster agents/);
  });

  it("roster can staff a full-size mission", () => {
    expect(ROSTER.length).toBeGreaterThanOrEqual(MAX_TASKS);
    expect(MIN_TASKS).toBeLessThan(MAX_TASKS);
  });
});

describe("buildTaskMessages", () => {
  const ctx = {
    goal: "Ship a paid beta in six weeks",
    company: "BakeCost — margin calculator for small bakeries",
    brief: "Write the pricing tiers against the value metric",
    upstream: [
      {
        agent: "Chief Strategist",
        title: "Sharpen positioning",
        handoff: "Wedge is per-batch costing for owner-operators.",
      },
      {
        agent: "Market Researcher",
        title: "Size the market",
        handoff: "Bottom-up TAM built from bakery counts; assumptions stated.",
      },
    ],
  };

  it("binds every agent to the trust rules and the JSON contract", () => {
    for (const agent of ROSTER) {
      const system = buildTaskMessages(agent, ctx)[0].content;
      expect(system).toContain("Never invent testimonials");
      expect(system).toContain("Never promise guaranteed results");
      expect(system).toContain("PRE-LAUNCH");
      expect(system).toContain("Return ONLY a single valid JSON object");
      expect(system).toContain('"summary"');
      expect(system).toContain('"body"');
      expect(system).toContain('"artifacts"');
      expect(system).toContain('"handoff"');
      // The identity has to be in there or every agent produces the same work.
      expect(system).toContain(agent.name);
      expect(system).toContain(agent.role);
      expect(system).toContain(agent.delivers);
      // Fixed overhead must stay small — the user half owns the context budget.
      expect(system.length).toBeLessThan(2000);
    }
  });

  it("gives the specialist the goal, the company, the brief and every handoff", () => {
    const user = buildTaskMessages(getAgent("pricing-analyst")!, ctx)[1].content;
    expect(user).toContain(ctx.goal);
    expect(user).toContain(ctx.company);
    expect(user).toContain(ctx.brief);
    for (const up of ctx.upstream) {
      expect(user).toContain(up.agent);
      expect(user).toContain(up.title);
      expect(user).toContain(up.handoff);
    }
  });

  it("omits the teammate section when there is no upstream", () => {
    const user = buildTaskMessages(getAgent("strategist")!, { ...ctx, upstream: [] })[1].content;
    expect(user).not.toContain("WHAT YOUR TEAMMATES ALREADY DELIVERED");
    expect(user).toContain("YOUR TASK");
  });

  it("clamps the user message to CONTEXT_CHAR_BUDGET no matter how big the DAG gets", () => {
    const user = buildTaskMessages(getAgent("chief-of-staff")!, {
      goal: "g".repeat(4000),
      company: "c".repeat(4000),
      brief: "b".repeat(4000),
      upstream: Array.from({ length: 8 }, (_, i) => ({
        agent: `Agent ${i}`,
        title: `Task ${i}`,
        handoff: "h".repeat(2000),
      })),
    })[1].content;
    expect(user.length).toBe(CONTEXT_CHAR_BUDGET);
    // The goal is written first, so it is the one thing truncation cannot eat.
    expect(user.startsWith("MISSION GOAL\n")).toBe(true);
  });
});

describe("planMessages", () => {
  const [system, user] = planMessages("Launch the waitlist", "BakeCost — bakery margins");

  it("lists every roster key so the planner never has to invent one", () => {
    for (const agent of ROSTER) {
      expect(system.content).toContain(agent.key);
      expect(system.content).toContain(agent.name);
    }
    for (const division of DIVISIONS) {
      expect(system.content).toContain(division.toUpperCase());
    }
  });

  it("forbids invented keys, duplicate agents, and forward references", () => {
    expect(system.content).toContain("Never invent a key");
    expect(system.content).toContain("Never assign the same agent twice");
    expect(system.content).toContain("No cycles, no forward references");
    expect(system.content).toContain(String(MIN_TASKS));
    expect(system.content).toContain(String(MAX_TASKS));
    expect(system.content).toContain("Never invent testimonials");
    expect(system.content).toContain('"agentKey"');
    expect(system.content).toContain('"dependsOn"');
  });

  it("passes the goal and company through, clamped to the budget", () => {
    expect(user.content).toContain("Launch the waitlist");
    expect(user.content).toContain("BakeCost — bakery margins");
    const huge = planMessages("g".repeat(9000), "c".repeat(9000))[1].content;
    expect(huge.length).toBe(CONTEXT_CHAR_BUDGET);
  });
});

describe("validatePlan", () => {
  const task = (agentKey: string, dependsOn: unknown[] = []) => ({
    title: `Do ${agentKey}`,
    agentKey,
    brief: `Brief for ${agentKey}`,
    dependsOn,
  });

  it("accepts a well-formed plan unchanged", () => {
    const plan = validatePlan({
      approach: "Position, then price, then synthesize.",
      tasks: [task("strategist"), task("pricing-analyst", [0]), task("chief-of-staff", [0, 1])],
    });
    expect(plan.approach).toBe("Position, then price, then synthesize.");
    expect(plan.tasks.map((t) => t.agentKey)).toEqual([
      "strategist",
      "pricing-analyst",
      "chief-of-staff",
    ]);
    expect(plan.tasks.map((t) => t.dependsOn)).toEqual([[], [0], [0, 1]]);
  });

  it("drops unknown agents and duplicates, then remaps surviving dependencies", () => {
    const plan = validatePlan({
      tasks: [
        task("nobody-here"), // 0: unknown -> dropped
        task("strategist"), // 1: -> kept index 0
        task("pricing-analyst", [1]), // 2: -> kept index 1, dep 1 -> 0
        task("strategist", [1]), // 3: duplicate agent -> dropped
        task("chief-of-staff", [0, 2, 3, 2]), // 4: -> kept 2; deps on dropped rows vanish
      ],
    });
    expect(plan.tasks.map((t) => t.agentKey)).toEqual([
      "strategist",
      "pricing-analyst",
      "chief-of-staff",
    ]);
    expect(plan.tasks.map((t) => t.dependsOn)).toEqual([[], [0], [1]]);
  });

  it("strips forward, self, and out-of-range references so the result is always a backwards DAG", () => {
    const plan = validatePlan({
      tasks: [
        task("strategist", [1, 2]), // forward
        task("pricing-analyst", [1]), // self
        task("risk-auditor", [99, -3, 1.5, "0", null, 0]),
      ],
    });
    expect(plan.tasks[0].dependsOn).toEqual([]);
    expect(plan.tasks[1].dependsOn).toEqual([]);
    expect(plan.tasks[2].dependsOn).toEqual([0]);
    for (const [i, t] of plan.tasks.entries()) {
      for (const dep of t.dependsOn) {
        expect(dep).toBeLessThan(i);
        expect(dep).toBeGreaterThanOrEqual(0);
      }
      expect([...t.dependsOn].sort((a, b) => a - b)).toEqual(t.dependsOn);
      expect(new Set(t.dependsOn).size).toBe(t.dependsOn.length);
    }
  });

  it("survives an adversarial plan and still yields an executable DAG", () => {
    const plan = validatePlan({
      approach: 42,
      tasks: [
        null,
        "not a task",
        { agentKey: "strategist", title: "  ", brief: "no title" },
        { agentKey: "strategist", title: "No brief", brief: "   " },
        { agentKey: "  product-manager  ", title: "Trimmed key", brief: "b", dependsOn: "nope" },
        task("frontend-engineer", [4, 4, 9]),
        { agentKey: "qa-engineer", title: "x".repeat(200), brief: "y".repeat(2000) },
      ],
    });
    expect(plan.tasks.map((t) => t.agentKey)).toEqual([
      "product-manager",
      "frontend-engineer",
      "qa-engineer",
    ]);
    expect(plan.tasks[0].dependsOn).toEqual([]);
    expect(plan.tasks[1].dependsOn).toEqual([0]);
    expect(plan.tasks[2].title.length).toBe(80);
    expect(plan.tasks[2].brief.length).toBe(1000);
    expect(plan.approach).toBe("Staffed 3 specialists across the roster.");
  });

  it("clamps to MAX_TASKS and keeps the surviving edges in range", () => {
    const keys = ROSTER.slice(0, MAX_TASKS + 4).map((a) => a.key);
    const plan = validatePlan({
      tasks: keys.map((key, i) => task(key, Array.from({ length: i }, (_, j) => j))),
    });
    expect(plan.tasks.length).toBe(MAX_TASKS);
    expect(plan.tasks.map((t) => t.agentKey)).toEqual(keys.slice(0, MAX_TASKS));
    expect(plan.tasks[MAX_TASKS - 1].dependsOn).toEqual(
      Array.from({ length: MAX_TASKS - 1 }, (_, j) => j)
    );
  });

  it("clamps a long approach and defaults a missing one", () => {
    expect(validatePlan({ approach: "a".repeat(500), tasks: [task("strategist")] }).approach.length)
      .toBe(300);
    expect(validatePlan({ approach: "   ", tasks: [task("strategist")] }).approach).toBe(
      "Staffed 1 specialists across the roster."
    );
  });

  it("throws when nothing usable is left", () => {
    expect(() => validatePlan({})).toThrow(/no tasks/);
    expect(() => validatePlan({ tasks: [] })).toThrow(/no tasks/);
    expect(() => validatePlan({ tasks: "strategist" })).toThrow(/no tasks/);
    expect(() => validatePlan({ tasks: [task("nobody-here"), task("also-fake")] })).toThrow(
      /roster agents/
    );
    expect(() =>
      validatePlan({ tasks: [{ agentKey: "strategist", title: "T", brief: "" }] })
    ).toThrow(/roster agents/);
  });
});

describe("normalizeTaskOutput", () => {
  it("passes a complete envelope through", () => {
    expect(
      normalizeTaskOutput({
        summary: "  Priced three tiers.  ",
        body: "## Tiers\n- Solo $19",
        artifacts: [{ title: "Pricing table", content: "Solo/Team/Studio" }],
        handoff: "Value metric is batches per month.",
      })
    ).toEqual({
      summary: "Priced three tiers.",
      body: "## Tiers\n- Solo $19",
      artifacts: [{ title: "Pricing table", content: "Solo/Team/Studio" }],
      handoff: "Value metric is batches per month.",
    });
  });

  it("tolerates artifacts as bare strings and skips empty or non-textual ones", () => {
    const out = normalizeTaskOutput({
      body: "work",
      artifacts: ["const x = 1;", "   ", 42, null, { title: "Schema", content: { table: "users" } }],
    });
    expect(out.artifacts).toEqual([
      { title: "Artifact", content: "const x = 1;" },
      { title: "Schema", content: '{"table":"users"}' },
    ]);
  });

  it("caps the artifact list", () => {
    const out = normalizeTaskOutput({
      body: "work",
      artifacts: Array.from({ length: 10 }, (_, i) => `artifact ${i}`),
    });
    expect(out.artifacts.length).toBe(6);
    expect(out.artifacts[5].content).toBe("artifact 5");
  });

  it("synthesizes a summary from the first real line of the body", () => {
    const out = normalizeTaskOutput({
      body: "# Pricing\n\n   \nThree tiers anchored on batches per month.\nMore detail here.",
      handoff: "Downstream: use the batch metric.",
    });
    expect(out.summary).toBe("Three tiers anchored on batches per month.");
    expect(out.handoff).toBe("Downstream: use the batch metric.");
  });

  it("falls back to a placeholder summary when the body is all headings", () => {
    expect(normalizeTaskOutput({ body: "# Only a heading" }).summary).toBe("Task complete.");
  });

  it("falls back handoff -> summary, and body -> first artifact", () => {
    const out = normalizeTaskOutput({
      summary: "Wrote the schema.",
      artifacts: [{ title: "schema.sql", content: "create table users();" }],
    });
    expect(out.handoff).toBe("Wrote the schema.");
    expect(out.body).toBe("create table users();");
  });

  it("clamps every field", () => {
    const out = normalizeTaskOutput({
      summary: "s".repeat(500),
      body: "b".repeat(30_000),
      handoff: "h".repeat(2000),
      artifacts: [{ title: "t".repeat(200), content: "c".repeat(30_000) }],
    });
    expect(out.summary.length).toBe(300);
    expect(out.body.length).toBe(20_000);
    expect(out.handoff.length).toBe(1200);
    expect(out.artifacts[0].title.length).toBe(80);
    expect(out.artifacts[0].content.length).toBe(20_000);
  });

  it("throws when the model returned no usable work", () => {
    expect(() => normalizeTaskOutput({})).toThrow(/no body or artifacts/);
    expect(() => normalizeTaskOutput({ body: "   " })).toThrow(/no body or artifacts/);
    expect(() => normalizeTaskOutput({ summary: "I did it!", artifacts: [] })).toThrow(
      /no body or artifacts/
    );
    expect(() => normalizeTaskOutput({ artifacts: [{ title: "empty", content: "  " }] })).toThrow(
      /no body or artifacts/
    );
    expect(() => normalizeTaskOutput({ body: 12345 })).toThrow(/no body or artifacts/);
  });
});
