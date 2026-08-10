import { describe, expect, it } from "vitest";
import {
  CONTEXT_CHAR_BUDGET,
  DIVISIONS,
  MAX_TASKS,
  MEMORY_CHAR_BUDGET,
  MIN_TASKS,
  ROSTER,
  agentsByDivision,
  buildTaskMessages,
  getAgent,
  normalizeTaskOutput,
  planMessages,
  renderMemory,
  validatePlan,
} from "../convex/lib/roster";

const TIERS = ["worker", "premium"];
const MEMORY_HEADING = "WHAT THIS COMPANY HAS ALREADY LEARNED";

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

  it("injects company memory when there is any, and says nothing when there is not", () => {
    const memory = "- Pricing is per-seat, chosen over usage-based.\n- Owner-operators, not chains.";
    const user = buildTaskMessages(getAgent("pricing-analyst")!, { ...ctx, memory })[1].content;
    expect(user).toContain(MEMORY_HEADING);
    expect(user).toContain("Pricing is per-seat, chosen over usage-based.");
    expect(user).toContain("Owner-operators, not chains.");
    // No memory (a company's first mission) and empty memory both stay silent —
    // an empty heading would read as "we learned nothing", which is not a fact.
    expect(buildTaskMessages(getAgent("pricing-analyst")!, ctx)[1].content).not.toContain(
      MEMORY_HEADING
    );
    expect(
      buildTaskMessages(getAgent("pricing-analyst")!, { ...ctx, memory: "" })[1].content
    ).not.toContain(MEMORY_HEADING);
  });

  it("never lets memory displace the goal, the company, the brief or live handoffs", () => {
    const user = buildTaskMessages(getAgent("pricing-analyst")!, {
      ...ctx,
      memory: "m".repeat(50_000),
    })[1].content;
    expect(user.length).toBeLessThanOrEqual(CONTEXT_CHAR_BUDGET);
    // 50k unbroken chars is a single "line", and no whole bullet that size can
    // fit, so the block is dropped rather than sliced mid-claim.
    expect(user).not.toContain("mmm");
    // Memory is spent last, so everything this task is actually accountable for
    // is still there verbatim — a learning from a past mission must never cost
    // the agent its own brief.
    expect(user).toContain(ctx.goal);
    expect(user).toContain(ctx.company);
    expect(user).toContain(ctx.brief);
    for (const up of ctx.upstream) {
      expect(user).toContain(up.handoff);
    }
  });

  it("drops memory entirely when the head and the handoffs already fill the budget", () => {
    const user = buildTaskMessages(getAgent("chief-of-staff")!, {
      goal: "Ship a paid beta in six weeks",
      company: "BakeCost — margin calculator for small bakeries",
      brief: "b".repeat(1000),
      upstream: Array.from({ length: 8 }, (_, i) => ({
        agent: `Agent ${i}`,
        title: `Task ${i}`,
        handoff: "h".repeat(2000),
      })),
      memory: "m".repeat(4000),
    })[1].content;
    expect(user.length).toBe(CONTEXT_CHAR_BUDGET);
    expect(user).toContain("b".repeat(1000));
    expect(user).toContain("WHAT YOUR TEAMMATES ALREADY DELIVERED");
    expect(user).not.toContain(MEMORY_HEADING);
    expect(user).not.toContain("mmm");
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

  it("shows the planner what the company already learned, and omits it when it has not", () => {
    const memory = "- Owner-operators sign up; chains do not.";
    const withMemory = planMessages("Launch the waitlist", "BakeCost", memory)[1].content;
    expect(withMemory).toContain(MEMORY_HEADING);
    expect(withMemory).toContain("Owner-operators sign up; chains do not.");
    expect(user.content).not.toContain(MEMORY_HEADING);
    expect(planMessages("Launch the waitlist", "BakeCost", "")[1].content).not.toContain(
      MEMORY_HEADING
    );
  });

  it("never lets memory displace the goal or the company", () => {
    const memory = "m".repeat(20_000);
    const huge = planMessages("Launch the waitlist", "BakeCost — bakery margins", memory)[1].content;
    expect(huge.length).toBeLessThanOrEqual(CONTEXT_CHAR_BUDGET);
    expect(huge).not.toContain("mmm"); // dropped whole, never sliced mid-claim
    expect(huge).toContain("Launch the waitlist");
    expect(huge).toContain("BakeCost — bakery margins");
    // A goal and company that already fill the budget leave memory nothing.
    const full = planMessages("g".repeat(9000), "c".repeat(9000), "m".repeat(4000))[1].content;
    expect(full.length).toBe(CONTEXT_CHAR_BUDGET);
    expect(full).not.toContain(MEMORY_HEADING);
    expect(full).not.toContain("mmm");
  });
});

describe("renderMemory", () => {
  it("keeps whole learnings only, newest first, and drops blanks", () => {
    expect(renderMemory(["Pricing is per-seat.", "  ", "Wedge is owner-operators."])).toBe(
      "- Pricing is per-seat.\n- Wedge is owner-operators."
    );
    expect(renderMemory([])).toBe("");
  });

  it("sheds the oldest learnings whole rather than truncating one mid-sentence", () => {
    // Half a learning reads as a different claim than the whole one: a clipped
    // "pricing is per-seat, not usage-based" inverts its own meaning.
    const learnings = Array.from({ length: 40 }, (_, i) => `${i}:${"x".repeat(100)}`);
    const rendered = renderMemory(learnings);
    expect(rendered.length).toBeLessThanOrEqual(MEMORY_CHAR_BUDGET);
    for (const line of rendered.split("\n")) {
      expect(learnings).toContain(line.slice(2));
    }
    // Newest first, so the freshest learning always survives the budget.
    expect(rendered.startsWith("- 0:")).toBe(true);
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
    // [0, 1] reduces to [1]: task 1 already depends on 0, so the edge to 0 is
    // implied. Scheduling is identical; the synthesis task just stops carrying
    // a handoff that says nothing its other dependency does not already cover.
    expect(plan.tasks.map((t) => t.dependsOn)).toEqual([[], [0], [1]]);
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
    // Every task here depends on all its predecessors, so the chain is fully
    // transitive and reduces to a single edge on the immediate predecessor.
    expect(plan.tasks[MAX_TASKS - 1].dependsOn).toEqual([MAX_TASKS - 2]);
    // Reduction must never push an edge out of range or forward.
    plan.tasks.forEach((t, i) => {
      for (const d of t.dependsOn) expect(d).toBeLessThan(i);
    });
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

describe("memory injection never mutilates a learning", () => {
  const LEARNINGS = [
    "Pricing is per-seat, not usage-based",
    "Onboarding must import the shop's existing spreadsheet; chains are not the wedge",
    "The team decided against a free tier after churn modelling",
    "Integrations were deferred to post-launch, not cancelled",
    "The buyer is the owner-operator, not the head baker",
  ];

  /** Every bullet the prompt carries must be a whole stored learning. */
  function assertWholeBullets(user: string) {
    const at = user.indexOf(MEMORY_HEADING);
    if (at === -1) return; // dropping the block entirely is a valid outcome
    const block = user.slice(at + MEMORY_HEADING.length).trim();
    for (const line of block.split("\n")) {
      if (!line.trim()) continue;
      expect(line.startsWith("- ")).toBe(true);
      // The bullet must match a stored learning exactly — not a prefix of one.
      expect(LEARNINGS).toContain(line.slice(2));
    }
  }

  // The band both review lenses reproduced: a task WITH dependencies, where the
  // head plus the live handoffs leave a memory budget smaller than the rendered
  // block. A byte slice there cuts the last bullet mid-sentence and can drop a
  // trailing negation, inverting the claim it asserts as company fact.
  it("drops whole bullets, never bytes, across the full dependency space", () => {
    const agent = getAgent("chief-of-staff")!;
    const memory = renderMemory(LEARNINGS);
    let sawTrimmedBlock = false;

    for (const deps of [0, 1, 2, 3, 4, 5, 6, 7]) {
      for (const handoffLen of [100, 300, 600, 900, 1100, 1200]) {
        for (const companyLen of [200, 800, 1400, 2000]) {
          const messages = buildTaskMessages(agent, {
            goal: "Get the first ten paying customers",
            company: "c".repeat(companyLen),
            brief: "b".repeat(518),
            upstream: Array.from({ length: deps }, (_, i) => ({
              agent: `Agent ${i}`,
              title: `Task ${i}`,
              handoff: "h".repeat(handoffLen),
            })),
            memory,
          });
          const user = messages[1].content;
          expect(user.length).toBeLessThanOrEqual(CONTEXT_CHAR_BUDGET);
          assertWholeBullets(user);
          if (user.includes(MEMORY_HEADING) && !user.includes(memory)) {
            sawTrimmedBlock = true;
          }
        }
      }
    }

    // Guard the guard: if no configuration ever trimmed the block, this test
    // would pass vacuously and stop protecting anything.
    expect(sawTrimmedBlock).toBe(true);
  });

  it("omits the block rather than emitting a partial bullet, at every budget", () => {
    // Sweep the leftover budget continuously by growing one handoff one char at
    // a time. A single oversized learning either appears whole or not at all —
    // there is no width at which half of it reaches the model.
    const agent = getAgent("chief-of-staff")!;
    const learning = `The buyer is the owner-operator, ${"x".repeat(600)}, not the head baker`;
    const memory = renderMemory([learning]);
    let sawWhole = false;
    let sawAbsent = false;

    for (const companyLen of [100, 700, 1400, 2000]) {
      for (let handoffLen = 0; handoffLen <= 1200; handoffLen += 13) {
        const user = buildTaskMessages(agent, {
          goal: "Get the first ten paying customers",
          company: "c".repeat(companyLen),
          brief: "b".repeat(600),
          // A 4-dependency synthesis task — the shape planMessages explicitly
          // tells the planner to produce as the final step of a mission.
          upstream: Array.from({ length: 4 }, (_, i) => ({
            agent: `Agent ${i}`,
            title: `T${i}`,
            handoff: "h".repeat(handoffLen),
          })),
          memory,
        })[1].content;

        if (user.includes(MEMORY_HEADING)) {
          expect(user).toContain(`- ${learning}`); // whole or nothing
          sawWhole = true;
        } else {
          expect(user).not.toContain("xxx");
          sawAbsent = true;
        }
        expect(user).toContain("YOUR TASK");
      }
    }

    // Both outcomes must actually occur, or the sweep proves nothing.
    expect(sawWhole).toBe(true);
    expect(sawAbsent).toBe(true);
  });

  it("keeps memory inside its own budget when nothing else competes", () => {
    expect(renderMemory(LEARNINGS).length).toBeLessThanOrEqual(MEMORY_CHAR_BUDGET);
  });
});

describe("validatePlan transitive reduction", () => {
  const t = (agentKey: string, dependsOn: number[]) => ({
    title: `T ${agentKey}`,
    agentKey,
    brief: "do the thing",
    dependsOn,
  });

  it("drops edges already implied by another dependency", () => {
    // The exact shape a real planner produced for "win the first ten shops":
    // task 3 listed [0,1,2] while task 2 already depended on [0,1].
    const plan = validatePlan({
      tasks: [
        t("market-researcher", []),
        t("competitive-analyst", [0]),
        t("pricing-analyst", [0, 1]),
        t("product-manager", [0, 1, 2]),
      ],
    });
    expect(plan.tasks[1].dependsOn).toEqual([0]);
    expect(plan.tasks[2].dependsOn).toEqual([1]); // 0 implied by 1
    expect(plan.tasks[3].dependsOn).toEqual([2]); // 0 and 1 implied by 2
  });

  it("keeps genuinely independent dependencies", () => {
    // 3 needs both 1 and 2, and neither reaches the other — a real join.
    const plan = validatePlan({
      tasks: [
        t("market-researcher", []),
        t("competitive-analyst", [0]),
        t("ux-researcher", [0]),
        t("growth-hacker", [1, 2]),
      ],
    });
    expect(plan.tasks[3].dependsOn).toEqual([1, 2]);
  });

  it("preserves execution order exactly — reduction is scheduling-neutral", () => {
    // Property: a task is runnable once all deps are done. Simulate waves on
    // the reduced graph and on the original, and assert identical orderings.
    const original = [
      t("market-researcher", []),
      t("competitive-analyst", [0]),
      t("pricing-analyst", [0, 1]),
      t("product-manager", [0, 1, 2]),
      t("ux-researcher", [0]),
      t("sales-strategist", [0]),
      t("growth-hacker", [0, 1, 2, 3, 5]),
    ];
    const reduced = validatePlan({ tasks: original }).tasks;

    const waves = (tasks: { dependsOn: number[] }[]) => {
      const done = new Set<number>();
      const out: number[][] = [];
      while (done.size < tasks.length) {
        const ready = tasks
          .map((task, i) => ({ task, i }))
          .filter(({ task, i }) => !done.has(i) && task.dependsOn.every((d) => done.has(d)))
          .map(({ i }) => i);
        if (ready.length === 0) throw new Error("deadlock");
        out.push(ready);
        for (const i of ready) done.add(i);
      }
      return out;
    };

    expect(waves(reduced)).toEqual(waves(original));
    // And the point of the exercise: strictly fewer handoffs to ship.
    const edges = (tasks: { dependsOn: number[] }[]) =>
      tasks.reduce((n, task) => n + task.dependsOn.length, 0);
    expect(edges(reduced)).toBeLessThan(edges(original));
  });

  it("never introduces a forward or self edge", () => {
    const plan = validatePlan({
      tasks: [
        t("market-researcher", []),
        t("competitive-analyst", [0]),
        t("pricing-analyst", [0, 1]),
        t("product-manager", [1, 2]),
        t("growth-hacker", [0, 2, 3]),
      ],
    });
    plan.tasks.forEach((task, i) => {
      for (const d of task.dependsOn) {
        expect(d).toBeLessThan(i);
        expect(d).toBeGreaterThanOrEqual(0);
      }
    });
  });
});

describe("agents deliver instead of deferring", () => {
  // Regression guard for a failure observed on a real mission: specialists
  // shipped empty templates ("Awaiting the list of target bike shops") instead
  // of doing their job, and the refusal propagated down the DAG via handoffs.
  const messages = () =>
    buildTaskMessages(getAgent("competitive-analyst")!, {
      goal: "Win the first ten paying bike shops in Portland",
      company: "Wrench — quoting for independent bike mechanics",
      brief: "Map the incumbent tools these shops use today.",
      upstream: [{ agent: "Market Researcher", title: "Identify shops", handoff: "h" }],
    });

  it("forbids waiting, asking for data, and blank templates", () => {
    const system = messages()[0].content;
    expect(system).toMatch(/only turn/i);
    expect(system).toMatch(/never wait for another agent/i);
    expect(system).toMatch(/empty template/i);
    expect(system).toMatch(/failed task/i);
  });

  it("tells the agent to assume-and-label rather than stall", () => {
    const system = messages()[0].content;
    expect(system).toMatch(/label it as an assumption/i);
    expect(system).toMatch(/what a human should verify/i);
  });

  it("keeps the fabrication ban intact alongside the assume-and-label licence", () => {
    // The whole risk of unblocking deferral is that it reads as permission to
    // invent. Both halves must be present in the same prompt.
    const system = messages()[0].content;
    expect(system).toMatch(/never state real-world numbers/i);
    expect(system).toContain("Never invent testimonials");
    expect(system).toMatch(/never promise guaranteed results/i);
  });
});
