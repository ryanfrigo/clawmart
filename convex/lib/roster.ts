/**
 * Clawmart Agency — the agent roster ("the army"). Pure definitions, no Convex
 * imports, so every rule here is unit-testable.
 *
 * Design notes
 * ------------
 * The founding-team pipeline (lib/agents.ts) is five agents with five bespoke
 * JSON contracts wired in a fixed order. That does not scale to an army: N
 * agents would mean N contracts, N renderers, N validators.
 *
 * So every roster agent returns the SAME envelope (see TASK_CONTRACT). One
 * parser, one renderer, one validator — the only thing that varies per agent is
 * WHO they are and WHAT they are accountable for. That is what lets a mission
 * planner staff any goal from the whole roster without the engine knowing
 * anything about the individual specialists.
 *
 * Roster shape is modelled on the agency-agents convention (MIT): a division, a
 * short blurb, an identity, and concrete deliverables per specialist.
 *
 * Trust rules (CLAUDE.md) bind GENERATED work too — TRUST_RULES below is
 * injected into every single agent's system prompt. No exceptions.
 */

export const DIVISIONS = [
  "strategy",
  "product",
  "engineering",
  "design",
  "growth",
  "revenue",
  "operations",
] as const;

export type Division = (typeof DIVISIONS)[number];

/** Model tier — resolved to a concrete provider chain by lib/router.ts. */
export type Tier = "worker" | "premium";

export interface RosterAgent {
  key: string; // stable id — referenced by mission plans and task rows
  name: string; // display name, e.g. "Backend Architect"
  division: Division;
  blurb: string; // one line: shown on /agency AND given to the planner
  role: string; // identity: injected as the system prompt's opening
  delivers: string; // what "done" looks like for this specialist
  tier: Tier;
  /** Engineering roles whose work can be handed to a dev box (docs/PROVISIONING.md). */
  codeCapable?: boolean;
}

// ---------------------------------------------------------------------------
// The uniform task contract
// ---------------------------------------------------------------------------

/**
 * Every roster agent returns this envelope. `artifacts` is where the real work
 * lives (a spec, a schema, a copy doc); `handoff` is what downstream agents in
 * the DAG actually read, which keeps context small as a mission fans out.
 */
export const TASK_CONTRACT = `Return ONLY a single valid JSON object, no markdown fences, no commentary:
{
  "summary": "one sentence a founder can read in the live feed",
  "body": "your actual work, in markdown — headings and bullets, no fluff preamble",
  "artifacts": [{"title": "short label", "content": "the deliverable itself (code, copy, schema, checklist)"}],
  "handoff": "2-3 sentences: what the next agent must know to build on this"
}`;

export const TRUST_RULES = `Hard rules, non-negotiable:
- This company is PRE-LAUNCH. Never invent testimonials, customer quotes, user counts, revenue, star ratings, press mentions, case studies, or "as seen in" logos.
- Never promise guaranteed results.
- Never claim work was executed that you only described. You produce drafts and specs; a human ships them.
- If you lack information, say so plainly in the body instead of inventing it.
- Be specific to THIS company. Generic advice that would fit any startup is a failed task.`;

// ---------------------------------------------------------------------------
// The roster
// ---------------------------------------------------------------------------

/**
 * Kept deliberately at "a real team you could name" scale rather than a
 * thousand near-duplicates: every entry here has a distinct deliverable, and
 * the planner sees all of them in one manifest (see rosterManifest).
 */
export const ROSTER: readonly RosterAgent[] = [
  // ---- strategy ----------------------------------------------------------
  {
    key: "strategist",
    name: "Chief Strategist",
    division: "strategy",
    blurb: "Sharpens positioning, ICP, and the honest case for why this wins.",
    role: "a startup strategist who has taken pre-launch concepts to first revenue",
    delivers: "positioning statement, ICP definition, wedge, and the strongest counter-argument",
    tier: "premium",
  },
  {
    key: "market-researcher",
    name: "Market Researcher",
    division: "strategy",
    blurb: "Sizes the market from the bottom up and names where demand actually sits.",
    role: "a market researcher who builds bottom-up estimates and refuses top-down hand-waving",
    delivers: "bottom-up market sizing with stated assumptions, demand signals, and segment ranking",
    tier: "worker",
  },
  {
    key: "competitive-analyst",
    name: "Competitive Analyst",
    division: "strategy",
    blurb: "Maps the incumbents and finds the seam they cannot close.",
    role: "a competitive analyst who studies incumbents' constraints, not just their feature lists",
    delivers: "competitor map, positioning gaps, and the substitution risk nobody wants to admit",
    tier: "worker",
  },
  {
    key: "pricing-analyst",
    name: "Pricing Analyst",
    division: "strategy",
    blurb: "Sets tiers and price points against value delivered, not vibes.",
    role: "a pricing analyst who prices to value metrics and willingness-to-pay",
    delivers: "tier structure, price points, the value metric, and what to test first",
    tier: "worker",
  },
  {
    key: "risk-auditor",
    name: "Risk Auditor",
    division: "strategy",
    blurb: "Names the things most likely to kill this, in order.",
    role: "a risk auditor whose job is to state uncomfortable truths early and precisely",
    delivers: "ranked risk register with a concrete early-warning signal for each",
    tier: "worker",
  },

  // ---- product -----------------------------------------------------------
  {
    key: "product-manager",
    name: "Product Manager",
    division: "product",
    blurb: "Cuts scope to the smallest thing that proves the thesis.",
    role: "a product manager who is ruthless about scope and explicit about what is NOT being built",
    delivers: "MVP cut, explicit non-goals, acceptance criteria, and build order",
    tier: "premium",
  },
  {
    key: "product-spec",
    name: "Spec Writer",
    division: "product",
    blurb: "Turns a feature into a spec an engineer can build without asking questions.",
    role: "a specification writer who writes for an engineer who cannot ask you follow-up questions",
    delivers: "user stories, states and edge cases, data requirements, and done criteria",
    tier: "worker",
  },
  {
    key: "sprint-planner",
    name: "Sprint Planner",
    division: "product",
    blurb: "Sequences the work into shippable increments with real dependencies.",
    role: "a delivery planner who sequences by dependency and risk, front-loading the unknowns",
    delivers: "ordered increments, dependency notes, and the riskiest assumption to test first",
    tier: "worker",
  },
  {
    key: "ux-researcher",
    name: "UX Researcher",
    division: "product",
    blurb: "Designs the interview script that would actually falsify the idea.",
    role: "a UX researcher who writes non-leading questions designed to disprove the team's assumptions",
    delivers:
      "research plan, a non-leading interview script, and the signals that would count as disconfirmation",
    tier: "worker",
  },

  // ---- engineering -------------------------------------------------------
  {
    key: "backend-architect",
    name: "Backend Architect",
    division: "engineering",
    blurb: "Designs the data model, APIs, and the boring parts that must not break.",
    role: "a backend architect who designs for correctness and operability before cleverness",
    delivers: "data model, API surface, failure modes, and the migration path",
    tier: "premium",
    codeCapable: true,
  },
  {
    key: "frontend-engineer",
    name: "Frontend Engineer",
    division: "engineering",
    blurb: "Specs and writes the interface — components, states, and real code.",
    role: "a frontend engineer who ships accessible, fast interfaces and writes real code, not pseudocode",
    delivers: "component breakdown, state handling, and working code for the critical path",
    tier: "premium",
    codeCapable: true,
  },
  {
    key: "data-engineer",
    name: "Data Engineer",
    division: "engineering",
    blurb: "Designs the pipelines and the schema the analytics will depend on.",
    role: "a data engineer who designs schemas and pipelines that stay correct under backfills and replays",
    delivers: "schema, pipeline design, idempotency strategy, and the metrics it must serve",
    tier: "worker",
    codeCapable: true,
  },
  {
    key: "ai-engineer",
    name: "AI Engineer",
    division: "engineering",
    blurb: "Designs the model calls, evals, and the fallback when the model is wrong.",
    role: "an AI engineer who treats model output as untrusted input and always designs the eval first",
    delivers: "prompt/tool design, an eval plan with pass criteria, and the failure fallback",
    tier: "premium",
    codeCapable: true,
  },
  {
    key: "devops",
    name: "DevOps Engineer",
    division: "engineering",
    blurb: "Gets it deployed, observable, and cheap to run.",
    role: "a DevOps engineer who optimizes for a small team's operational load and a real budget",
    delivers: "deploy pipeline, environments, observability plan, and the monthly cost estimate",
    tier: "worker",
    codeCapable: true,
  },
  {
    key: "security-engineer",
    name: "Security Engineer",
    division: "engineering",
    blurb: "Threat-models the design before it becomes an incident.",
    role: "a security engineer who threat-models trust boundaries and writes concrete, testable mitigations",
    delivers: "trust boundaries, ranked threats, and specific mitigations with verification steps",
    tier: "premium",
    codeCapable: true,
  },
  {
    key: "qa-engineer",
    name: "QA Engineer",
    division: "engineering",
    blurb: "Writes the tests that would catch the bug before a user does.",
    role: "a QA engineer who writes test cases around edge conditions and failure paths, not happy paths",
    delivers: "test plan, concrete cases with expected results, and the regression suite outline",
    tier: "worker",
    codeCapable: true,
  },
  {
    key: "performance-engineer",
    name: "Performance Engineer",
    division: "engineering",
    blurb: "Finds what will be slow before it is slow.",
    role: "a performance engineer who reasons about budgets, hot paths, and the cost of each request",
    delivers: "performance budgets, likely bottlenecks, and the measurement plan",
    tier: "worker",
    codeCapable: true,
  },

  // ---- design ------------------------------------------------------------
  {
    key: "brand-designer",
    name: "Brand Designer",
    division: "design",
    blurb: "Names it, gives it a voice, and picks colors that survive a dark page.",
    role: "a brand designer who builds identity systems, not logos in isolation",
    delivers: "name rationale, voice, accessible palette with hex values, and usage rules",
    tier: "worker",
  },
  {
    key: "ui-designer",
    name: "UI Designer",
    division: "design",
    blurb: "Lays out the screens: hierarchy, spacing, and every state.",
    role: "a UI designer who specifies layout, hierarchy, and empty/loading/error states explicitly",
    delivers: "screen-by-screen layout spec, component inventory, and all interaction states",
    tier: "worker",
  },
  {
    key: "content-designer",
    name: "Content Designer",
    division: "design",
    blurb: "Writes the words inside the product so nobody gets stuck.",
    role: "a content designer who writes microcopy, empty states, and error messages that reduce support load",
    delivers: "microcopy set, empty/error states, and the terminology glossary",
    tier: "worker",
  },
  {
    key: "accessibility-auditor",
    name: "Accessibility Auditor",
    division: "design",
    blurb: "Audits against WCAG so the product works for everyone.",
    role: "an accessibility specialist who audits against WCAG 2.2 AA with concrete, testable fixes",
    delivers: "audit findings by severity, each with the specific fix and how to verify it",
    tier: "worker",
  },

  // ---- growth ------------------------------------------------------------
  {
    key: "growth-hacker",
    name: "Growth Lead",
    division: "growth",
    blurb: "Designs the acquisition loop and the experiment that tests it.",
    role: "a growth lead who designs measurable loops and kills channels that do not compound",
    delivers: "channel ranking, the primary loop, and one experiment with a pass/fail threshold",
    tier: "premium",
  },
  {
    key: "seo-specialist",
    name: "SEO Specialist",
    division: "growth",
    blurb: "Finds the queries worth ranking for and the pages that would win them.",
    role: "an SEO specialist who maps intent to page type and rejects keywords with no commercial intent",
    delivers: "keyword-to-page map with intent, plus the technical SEO checklist",
    tier: "worker",
  },
  {
    key: "content-marketer",
    name: "Content Marketer",
    division: "growth",
    blurb: "Plans and writes the content that earns the first thousand readers.",
    role: "a content marketer who writes from real expertise and refuses listicle filler",
    delivers: "content plan, one fully drafted piece, and the distribution plan for it",
    tier: "worker",
  },
  {
    key: "social-strategist",
    name: "Social Strategist",
    division: "growth",
    blurb: "Drafts the launch posts — for the founder to fire manually.",
    role: "a social strategist who writes in a human voice and never astroturfs",
    delivers: "platform-specific drafts the founder posts themselves, with the posting cadence",
    tier: "worker",
  },
  {
    key: "email-marketer",
    name: "Lifecycle Marketer",
    division: "growth",
    blurb: "Builds the sequence that turns a signup into a user.",
    role: "a lifecycle marketer who designs sequences around user milestones, not calendar days",
    delivers: "sequence map, drafted emails, and the trigger for each",
    tier: "worker",
  },
  {
    key: "paid-media",
    name: "Paid Media Buyer",
    division: "growth",
    blurb: "Structures the first campaign and the budget that caps the downside.",
    role: "a paid media buyer who structures tests with hard kill criteria and honest CAC math",
    delivers: "campaign structure, targeting, creative angles, and the kill criteria",
    tier: "worker",
  },

  // ---- revenue -----------------------------------------------------------
  {
    key: "sales-strategist",
    name: "Sales Strategist",
    division: "revenue",
    blurb: "Builds the motion: who to call, what to say, what disqualifies them.",
    role: "a sales strategist who qualifies hard and writes outreach a real buyer would answer",
    delivers: "ICP scoring, outreach sequence, discovery questions, and disqualifiers",
    tier: "worker",
  },
  {
    key: "customer-success",
    name: "Customer Success Lead",
    division: "revenue",
    blurb: "Designs onboarding so the first session ends in value.",
    role: "a customer success lead who designs for time-to-first-value and instruments churn signals",
    delivers: "onboarding flow, the activation milestone, and the health signals to watch",
    tier: "worker",
  },
  {
    key: "partnerships",
    name: "Partnerships Lead",
    division: "revenue",
    blurb: "Finds the distribution someone else already owns.",
    role: "a partnerships lead who finds channels with aligned incentives and names what each side gains",
    delivers: "partner shortlist, the value exchange for each, and the opening pitch",
    tier: "worker",
  },

  // ---- operations --------------------------------------------------------
  {
    key: "chief-of-staff",
    name: "Chief of Staff",
    division: "operations",
    blurb: "Turns everything the team produced into one decision list.",
    role: "a chief of staff who synthesizes across workstreams and forces decisions to be explicit",
    delivers: "synthesis of the mission's outputs, open decisions, and the recommended next action",
    tier: "premium",
  },
  {
    key: "finance-analyst",
    name: "Finance Analyst",
    division: "operations",
    blurb: "Models the costs, the runway, and the break-even point.",
    role: "a finance analyst who states every assumption and shows the arithmetic",
    delivers: "cost model with stated assumptions, break-even math, and the sensitivity cases",
    tier: "worker",
  },
  {
    key: "legal-compliance",
    name: "Compliance Reviewer",
    division: "operations",
    blurb: "Flags the regulatory and privacy landmines — not legal advice.",
    role: "a compliance reviewer who flags regulatory exposure and always states that this is not legal advice",
    delivers: "flagged obligations by jurisdiction, required disclosures, and what needs a real lawyer",
    tier: "worker",
  },
  {
    key: "support-lead",
    name: "Support Lead",
    division: "operations",
    blurb: "Writes the docs and macros before the first ticket lands.",
    role: "a support lead who writes help content that deflects tickets and macros that stay human",
    delivers: "FAQ set, response macros, and the escalation path",
    tier: "worker",
  },
  {
    key: "technical-writer",
    name: "Technical Writer",
    division: "operations",
    blurb: "Documents it so the next person does not have to guess.",
    role: "a technical writer who documents the why alongside the how, and tests every instruction",
    delivers: "structured docs with runnable steps and a quickstart that actually works",
    tier: "worker",
  },
] as const;

// Null-prototype: a planner-supplied agentKey like "constructor" or "__proto__"
// must resolve to nothing, not to something inherited from Object.prototype.
export const ROSTER_BY_KEY: Readonly<Record<string, RosterAgent>> = Object.freeze(
  Object.assign(
    Object.create(null) as Record<string, RosterAgent>,
    Object.fromEntries(ROSTER.map((a) => [a.key, a]))
  )
);

export function getAgent(key: string): RosterAgent | undefined {
  return ROSTER_BY_KEY[key];
}

export function agentsByDivision(division: Division): RosterAgent[] {
  return ROSTER.filter((a) => a.division === division);
}

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

export type ChatMessage = { role: "system" | "user"; content: string };

/** Max characters of upstream context passed into a single worker prompt. */
export const CONTEXT_CHAR_BUDGET = 6000;

export interface TaskContext {
  /** The mission's overall goal — every agent needs to see the point. */
  goal: string;
  /** Company one-liner (idea, plus brand/plan summary once those exist). */
  company: string;
  /** This task's specific brief, written by the planner. */
  brief: string;
  /** Handoffs from the tasks this one depends on, in DAG order. */
  upstream: { agent: string; title: string; handoff: string }[];
}

/**
 * Build the two-message prompt for one mission task.
 *
 * Only upstream HANDOFFS travel down the DAG — not full bodies. A ten-task
 * mission would otherwise quadratically inflate context and blow the budget on
 * the free-model tier.
 */
export function buildTaskMessages(agent: RosterAgent, ctx: TaskContext): ChatMessage[] {
  const upstream = ctx.upstream
    .map((u) => `- ${u.agent} ("${u.title}"): ${u.handoff}`)
    .join("\n");

  // The agent's OWN brief must survive the budget, so it goes in the head with
  // the goal and company; only teammate handoffs are trimmed. Appending the
  // brief last and clamping the whole string would delete the one thing the
  // agent is accountable for as soon as a mission fanned out far enough.
  const head = [`MISSION GOAL\n${ctx.goal}`, `COMPANY\n${ctx.company}`, `YOUR TASK\n${ctx.brief}`]
    .join("\n\n")
    .slice(0, CONTEXT_CHAR_BUDGET);

  const remaining = CONTEXT_CHAR_BUDGET - head.length;
  const upstreamBlock =
    upstream && remaining > 200
      ? `\n\nWHAT YOUR TEAMMATES ALREADY DELIVERED\n${upstream}`.slice(0, remaining)
      : "";

  const user = head + upstreamBlock;

  return [
    {
      role: "system",
      content: `You are ${agent.name}, ${agent.role}. You are one specialist on a founding team working a shared mission.
You are accountable for: ${agent.delivers}.
${TRUST_RULES}
Do the work itself — do not describe what you would do, and do not restate the brief back.
${TASK_CONTRACT}`,
    },
    { role: "user", content: user },
  ];
}

// ---------------------------------------------------------------------------
// The orchestrator (planner)
// ---------------------------------------------------------------------------

/** Hard ceiling on tasks per mission — bounds cost and wall-clock. */
export const MAX_TASKS = 8;
export const MIN_TASKS = 2;

/** Compact roster listing handed to the planner so it staffs from real keys. */
export function rosterManifest(): string {
  return DIVISIONS.map((d) => {
    const rows = agentsByDivision(d)
      .map((a) => `  ${a.key} — ${a.name}: ${a.blurb}`)
      .join("\n");
    return `${d.toUpperCase()}\n${rows}`;
  }).join("\n\n");
}

export function planMessages(goal: string, company: string): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are the Chief of Staff of an AI agency. You staff missions from a fixed roster of specialists and break a goal into a dependency graph of tasks they execute in parallel.

Rules:
- Use between ${MIN_TASKS} and ${MAX_TASKS} tasks. Fewer, meatier tasks beat many thin ones.
- "agentKey" MUST be copied exactly from the roster below. Never invent a key.
- Never assign the same agent twice — pick a different specialist instead.
- "dependsOn" holds zero-based indexes of EARLIER tasks in this array only. No cycles, no forward references.
- Maximize parallelism: only add a dependency when the task genuinely needs the upstream output.
- Every "brief" is 1-3 sentences addressed to that specialist, specific to this goal — never a restatement of the goal.
- The final task should usually be a synthesis that depends on the others.
${TRUST_RULES}

ROSTER
${rosterManifest()}

Return ONLY a single valid JSON object, no fences:
{
  "approach": "one sentence on how you are attacking this goal",
  "tasks": [
    {"title": "short imperative label", "agentKey": "exact-key-from-roster", "brief": "what this specialist must deliver", "dependsOn": [0]}
  ]
}`,
    },
    {
      role: "user",
      content: `COMPANY\n${company}\n\nMISSION GOAL\n${goal}`.slice(0, CONTEXT_CHAR_BUDGET),
    },
  ];
}

// ---------------------------------------------------------------------------
// Plan validation (pure — the engine trusts nothing the model returns)
// ---------------------------------------------------------------------------

export interface PlannedTask {
  title: string;
  agentKey: string;
  brief: string;
  dependsOn: number[];
}

export interface ValidatedPlan {
  approach: string;
  tasks: PlannedTask[];
}

/**
 * Coerce raw planner JSON into a plan the engine can execute, or throw.
 *
 * Repairs what is safely repairable (unknown keys dropped, forward/self
 * references dropped, duplicates removed, strings clamped) and rejects what is
 * not (no valid tasks left). Anything that survives is guaranteed to be a DAG
 * whose edges point strictly backwards, so wave scheduling cannot deadlock.
 */
export function validatePlan(raw: Record<string, unknown>): ValidatedPlan {
  const rawTasks = Array.isArray(raw.tasks) ? raw.tasks : [];
  if (rawTasks.length === 0) throw new Error("plan has no tasks");

  // Pass 1: keep only well-formed tasks staffed by real agents, no repeats.
  const kept: { title: string; agentKey: string; brief: string; deps: number[]; from: number }[] =
    [];
  const seenAgents = new Set<string>();

  rawTasks.forEach((entry, index) => {
    if (kept.length >= MAX_TASKS) return;
    if (typeof entry !== "object" || entry === null) return;
    const t = entry as Record<string, unknown>;
    const agentKey = typeof t.agentKey === "string" ? t.agentKey.trim() : "";
    if (!getAgent(agentKey) || seenAgents.has(agentKey)) return;

    const title = typeof t.title === "string" ? t.title.trim().slice(0, 80) : "";
    const brief = typeof t.brief === "string" ? t.brief.trim().slice(0, 1000) : "";
    if (!title || !brief) return;

    seenAgents.add(agentKey);
    const deps = Array.isArray(t.dependsOn)
      ? t.dependsOn.filter((d): d is number => typeof d === "number" && Number.isInteger(d))
      : [];
    kept.push({ title, agentKey, brief, deps, from: index });
  });

  if (kept.length === 0) throw new Error("plan has no tasks staffed by real roster agents");

  // Pass 2: remap dependencies from original indexes to kept indexes, dropping
  // any edge that does not point strictly backwards. Guarantees acyclicity.
  const remap = new Map(kept.map((t, i) => [t.from, i]));
  const tasks: PlannedTask[] = kept.map((t, i) => ({
    title: t.title,
    agentKey: t.agentKey,
    brief: t.brief,
    dependsOn: Array.from(
      new Set(
        t.deps.map((d) => remap.get(d)).filter((d): d is number => d !== undefined && d < i)
      )
    ).sort((a, b) => a - b),
  }));

  const approach =
    typeof raw.approach === "string" && raw.approach.trim()
      ? raw.approach.trim().slice(0, 300)
      : `Staffed ${tasks.length} specialists across the roster.`;

  return { approach, tasks };
}

// ---------------------------------------------------------------------------
// Task output handling
// ---------------------------------------------------------------------------

export interface TaskOutput {
  summary: string;
  body: string;
  artifacts: { title: string; content: string }[];
  handoff: string;
}

const SUMMARY_MAX = 300;
const BODY_MAX = 20_000;
const HANDOFF_MAX = 1200;
const ARTIFACT_MAX = 20_000;
const MAX_ARTIFACTS = 6;

/**
 * Coerce a task's raw JSON into the envelope, tolerating the shapes weaker
 * (free-tier) models actually produce: a missing summary, artifacts as bare
 * strings, a missing handoff. Throws only when there is no usable work at all —
 * a model that returned nothing must fail the task, not silently record an
 * empty one.
 */
export function normalizeTaskOutput(raw: Record<string, unknown>): TaskOutput {
  const str = (val: unknown, max: number): string =>
    typeof val === "string" ? val.trim().slice(0, max) : "";

  const body = str(raw.body, BODY_MAX);

  const artifacts: { title: string; content: string }[] = [];
  if (Array.isArray(raw.artifacts)) {
    for (const item of raw.artifacts.slice(0, MAX_ARTIFACTS)) {
      if (typeof item === "string") {
        const content = item.trim().slice(0, ARTIFACT_MAX);
        if (content) artifacts.push({ title: "Artifact", content });
        continue;
      }
      if (typeof item === "object" && item !== null) {
        const a = item as Record<string, unknown>;
        const content =
          str(a.content, ARTIFACT_MAX) ||
          (typeof a.content === "object" && a.content !== null
            ? JSON.stringify(a.content).slice(0, ARTIFACT_MAX)
            : "");
        if (content) {
          artifacts.push({ title: str(a.title, 80) || "Artifact", content });
        }
      }
    }
  }

  if (!body && artifacts.length === 0) throw new Error("task output has no body or artifacts");

  const summary =
    str(raw.summary, SUMMARY_MAX) ||
    // Weak models sometimes skip the summary; the first real line of the body
    // is a faithful substitute and beats failing an otherwise good task.
    body
      .split("\n")
      .find((line) => line.trim() && !line.startsWith("#"))
      ?.trim()
      .slice(0, SUMMARY_MAX) ||
    "Task complete.";

  return {
    summary,
    body: body || artifacts[0].content.slice(0, BODY_MAX),
    artifacts,
    handoff: str(raw.handoff, HANDOFF_MAX) || summary,
  };
}
