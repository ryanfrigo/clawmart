# Clawmart Agency — build contract

The **agent army**: once a company is live, the user points a whole roster of specialists at
one goal — "price this", "get the first ten customers", "spec the API" — and an orchestrator
staffs it, breaks it into a dependency graph, and runs the specialists in parallel waves.

Where the founding-team pipeline (`docs/COMPANY-STUDIO.md`) is five fixed agents in a fixed
order, the Agency is **N specialists staffed on demand**. Same honest scope: agents produce
drafts and specs. A human ships them.

Code: `convex/lib/roster.ts` (who), `convex/lib/router.ts` (which model),
`convex/missions.ts` (state + auth), `convex/missionEngine.ts` (the actions),
`convex/boxes.ts` + `convex/lib/boxevents.ts` (the dev-box bridge, off by default).

## What a mission is

A mission is one goal, dispatched at the roster, on one live company.

1. The owner submits a goal (12–1000 chars), a routing strategy, and optionally `execute`
   (may one engineering task run on a real dev box?) → `missions.startMission`.
2. The orchestrator (`missionEngine.planMission`) writes a plan: up to 8 tasks (it is told to
   use at least 2), each staffed to a real roster key, each with a brief and backwards-only
   dependencies.
3. Tasks run in waves until every one is settled. The mission ends `done` (at least one
   specialist delivered), `failed`, or `cancelled`.

Mission progress is written into the **existing `agentEvents` table** keyed by `companyId`,
so the Studio live feed shows the army working with no changes to the feed itself. Task
deliverables live on the task row (`missionTasks.outputJson`) — a mission never rewrites the
company's build assets.

## One envelope for every agent

Five bespoke JSON contracts were fine for five agents. For a roster, N agents would mean N
contracts, N parsers, N renderers, N validators — and every new specialist would be a code
change in the engine.

So **every roster agent returns the same envelope** (`TASK_CONTRACT`):

```json
{ "summary": "...", "body": "markdown", "artifacts": [{"title": "...", "content": "..."}], "handoff": "..." }
```

The only thing that varies per specialist is *who they are* (`role`) and *what they are
accountable for* (`delivers`). One parser (`normalizeTaskOutput`), one renderer, one
validator. That is what lets the planner staff any goal from the whole roster without the
engine knowing anything about the individuals.

`normalizeTaskOutput` is deliberately forgiving of what weak free-tier models actually
produce — missing summary (first real body line substitutes), artifacts as bare strings,
missing handoff (summary substitutes). It throws only when there is no work at all: a model
that returned nothing fails its task rather than recording an empty one.

Only **handoffs** travel down the graph, never full bodies (`CONTEXT_CHAR_BUDGET` = 6000
chars per prompt). An eight-task mission would otherwise inflate context quadratically and
blow the free tier's budget.

## The roster

**35 specialists across 7 divisions** (`ROSTER` in `convex/lib/roster.ts`):

| Division | Count | Examples |
|---|---|---|
| strategy | 5 | Chief Strategist, Market Researcher, Pricing Analyst, Risk Auditor |
| product | 4 | Product Manager, Spec Writer, Sprint Planner, UX Researcher |
| engineering | 8 | Backend Architect, Frontend Engineer, AI Engineer, Security Engineer |
| design | 4 | Brand Designer, UI Designer, Content Designer, Accessibility Auditor |
| growth | 6 | Growth Lead, SEO Specialist, Content Marketer, Lifecycle Marketer |
| revenue | 3 | Sales Strategist, Customer Success Lead, Partnerships Lead |
| operations | 5 | Chief of Staff, Finance Analyst, Compliance Reviewer, Technical Writer |

Each entry carries `key` (stable id, referenced by plans and task rows), `name`, `division`,
`blurb` (one line — shown to users *and* to the planner), `role`, `delivers`, and `tier`
(`worker` | `premium`, resolved to concrete models by the router). Kept at "a team you could
name" scale on purpose: every entry has a distinct deliverable, and the planner sees all of
them in one manifest.

`codeCapable: true` marks the eight engineering roles whose work can be handed to a dev box
(`docs/PROVISIONING.md`). It has two readers. The box harness: the box config names a roster
key — the staffed specialist on a mission dispatch, `CLAWMART_BOX_AGENT_KEY` otherwise — and
`infra/agent/harness/__main__.py` accepts it only if it is one of those eight, using it for
the agent's system-prompt role line (the PR title is the model's own). An unknown key is ignored
and the run falls back to a generic engineer — the control plane never lets the model choose
its own fan-out. And the mission bridge below: only a task staffed to one of those eight can
be dispatched to a box, whoever the planner picked.

## Execution: plan → tick → runTask → distill

Four Convex actions chained through the scheduler, so a mission is durable and has no
single-function timeout ceiling (same "no EC2" reasoning as `docs/COMPANY-STUDIO.md`):

- **`planMission`** — one model call, always at the `premium` tier of the chosen strategy
  (a bad DAG wastes every downstream task), validated by `validatePlan`, saved by
  `missions.savePlan`.
- **`tick`** — calls `missions.claimReadyTasks` and fans out `runTask` for whatever it
  claimed.
- **`runTask`** — one specialist, one task: build prompt → walk the model chain → normalize →
  `completeTask` (or `failTask`) → tick the mission again. One branch off this path: a
  `codeCapable` specialist on a mission that opted into execution is offered to a dev box
  first (below), and the box settles the task instead.
- **`distillMemory`** — after the mission settles `done`, one model call that writes what the
  team learned into company memory (below). Off the critical path by construction.

**Parallel waves fall out of that loop.** `claimReadyTasks` is a single transactional
mutation: it claims every queued task whose dependencies are all `done`, up to
`MAX_CONCURRENT_TASKS` (3), marks them running, and returns them. Every settling task ticks
the mission, so a completion immediately claims whatever it unblocked. Because the claim is
transactional, two concurrent ticks cannot double-run a task or double-finalize a mission.

The same mutation settles the mission:

- **Skip cascade** — a queued task whose dependency `failed` or was `skipped` can never run,
  so it is marked `skipped` immediately instead of hanging the mission.
- **Partial credit** — when nothing is running and nothing is claimable, the mission is
  `done` if at least one task delivered, `failed` only if every task failed. Half a mission
  of real deliverables is the honest outcome, not a wipe.

`cancel` marks queued tasks `skipped` and the mission `cancelled`; tasks already in flight
finish their current model call, but nothing new is claimed (`taskContext` returns null once
the mission is no longer `running`).

## Why the DAG cannot deadlock

The engine trusts nothing the planner returns. `validatePlan` (pure, unit-testable):

1. Drops tasks that are malformed, staffed to an unknown `agentKey`, or repeat an agent
   already used; caps at `MAX_TASKS` (8).
2. Remaps `dependsOn` from the model's original indexes onto the surviving indexes and
   **drops any edge that does not point strictly backwards** (`d < i`), plus self-references
   and duplicates.
3. Throws if nothing usable survives.

Edges pointing only at lower indexes make a cycle impossible by construction, so wave
scheduling always terminates. `savePlan` re-filters the same predicate as defence in depth —
a forward edge that slipped through would strand the mission forever.

## Company memory: missions compound

Every mission used to start cold. Now a finished mission leaves something behind, so the
tenth mission on a company knows what the first nine settled (design borrowed from
**hermes-agent**, MIT — memory that persists across runs).

**When it runs.** Exactly one trigger: `missions.claimReadyTasks`, inside the same
transactional settle that marks the mission `done`, and only when at least one task
delivered. That patch takes the mission out of `running`, so however many ticks race, the
distiller is scheduled once. The stale-mission watchdog deliberately does **not** trigger it —
a mission that stalled for 15 minutes has the least trustworthy handoffs in the system, and
permanent memory is the last place to put them.

**What gets distilled.** `missions.missionOutcome` returns the goal, the company brief, and
the handoffs of the tasks that actually completed, in index order (null if nobody left one).
`missionEngine.distillMemory` makes **one** model call on that — the `worker` tier of the
mission's own strategy, so a `free` mission still cannot bill — through the same fallback
chain, JSON nudge, and breaker reporting as `runTask`, capped at 700 tokens. Summarizing
handoffs the specialists already wrote is the cheapest work in the mission and must never
outspend it.

The model returns `{"learnings": ["…"]}`; `validateLearnings` trims, collapses whitespace (an
embedded newline would forge a second bullet downstream), dedupes case-insensitively, drops
anything under 12 characters, and keeps at most **5 learnings × 280 chars**. It throws when
nothing survives, which advances the model chain instead of storing junk — the same contract
as `normalizeTaskOutput`.

**Where it lives.** One row per learning in `companyMemory`
(`companyId`, `text`, `sourceMissionId`, `createdAt`, `updatedAt`; indexed `by_company`).
`rememberLearnings` skips a text the company already stored — overlapping missions re-derive
the same conclusion constantly, and storing it twice would spend the cap twice — then deletes
everything past **24 rows** on a newest-first scan. The cap is enforced on write, not on read,
because memory is injected into every future prompt: unbounded rows would be unbounded cost,
not just an unbounded table.

**How it is injected — and budgeted.** `planContext` and `taskContext` both render the newest
24 rows through `renderMemory` into a `WHAT THIS COMPANY HAS ALREADY LEARNED` block, bounded
by `MEMORY_CHAR_BUDGET` (1200 of the 6000-char prompt). Whole bullets only: half a learning
reads as a different claim, and a clipped "pricing is per-seat, not usage-based" inverts its
own meaning.

Memory is spent **last**. In `buildTaskMessages` the head (goal, company, and the agent's own
brief) is written first and untouched, then this mission's live teammate handoffs, and memory
gets only `remaining - upstreamBlock.length`. A wide DAG therefore drops the memory block
entirely rather than shortening a brief. `planMessages` follows the same rule with the
goal/company head. Past learnings are a nice-to-have; the thing the agent is accountable for
is not.

**Trust rules bind hardest here.** Anything the distiller emits is laundered into an unbounded
number of later prompts as established fact, so on top of `TRUST_RULES` its prompt requires
every learning to be grounded *only* in the handoffs shown, forbids any number, metric, price,
date, or count that is not already in them, and forbids padding when the deliverables support
fewer than two.

**Best-effort, always.** The mission is already settled before `distillMemory` runs and the
action writes nothing to it. An exhausted chain, a rate-limited endpoint, or unparseable JSON
just means this company learns nothing from this mission. A missed learning is cheap;
reopening a completed mission is not.

**The owner can forget.** `missions.listMemory` (owner-only, `[]` for anyone else) backs a
collapsible *What the team has learned* list in the mission panel, and `missions.forgetMemory`
(owner-only, `not_found` for missing-or-not-yours) deletes one row. A wrong learning compounds
into every future plan and every future brief, so removing it by hand has to be one click.

## Free-inference routing

The founding-team pipeline makes 5 calls per company. An army makes up to 8 per mission
across many missions, so routing prefers **free capacity** and degrades instead of failing
when a free endpoint rate-limits (they rate-limit constantly).

**Strategy → fallback chain** (`chooseChain(strategy, tier, cooledDown)`, max 4 models):

| Strategy | Chain |
|---|---|
| `free` | free models only — a free mission can never bill |
| `balanced` | free models first, then the tier's paid model as the completion guarantee |
| `quality` | paid only — `anthropic/claude-sonnet-4.6` and `google/gemini-2.5-flash`, premium first for `premium`-tier agents and worker first for `worker`-tier ones. Never a free model. |

Order of operations matters here, and the reverse order was a real defect caught in review:
the chain is deduped, then **cooled-down models are filtered out, and only then** is it
truncated to `MAX_CHAIN` (4). Truncating first hides every healthy model below the cut no
matter how many above it are cooled — the breaker would have nothing left to route to.

Truncation also must not be what removes the paid fallback. The default free list has six
entries, so `[...free, paid]` is seven long and a plain slice drops the paid model every
time, making `balanced` silently identical to `free` while the UI promises otherwise. When
the paid model is healthy but falls off the end, it takes the last slot instead.

The chain is never allowed to go empty: when every candidate is cooled down it still attempts
its first choice rather than failing without a single request.

**Circuit breaker** (`modelHealth` table, one row per model). A failed call increments
`failures` and sets `cooldownUntil`; a success resets both to zero. Backoff is exponential —
1m, 2m, 4m, … capped at 30m (`nextCooldownMs`). A 429's `Retry-After` header overrides the
guess (`retryAfterMs`) **only when it is greater than zero** — `Retry-After: 0`, a past HTTP
date, or a negative value would otherwise set the cooldown to "now" and disable the breaker
for exactly the endpoint that just rate-limited us. State is persisted rather than in-process
because Convex actions are short-lived, so a flapping model stays out of rotation across
invocations.

The default free-model list is verified against the live OpenRouter catalog, not assumed:
of 400 catalog entries only 14 are `:free`, and the set turns over within months. A stale id
simply fails its attempt, trips its breaker, and the chain advances — and
`CLAWMART_FREE_MODELS` replaces the list without a deploy.

Two failure classes are handled differently:

- **Availability** (HTTP error, timeout) — cools the model down, then the chain advances.
  Exception: 401/402/403 mean *our* credentials are wrong, so every model behind that key
  fails identically and the chain stops (`isChainWorthy`).
- **Quality** (unparseable JSON, empty envelope) — the model answered, so it is *not* cooled
  down. The next attempt appends a JSON nudge instead.

**Upstream** (`resolveUpstream`). OpenRouter is the default and the only configured provider.
If `OMNIROUTE_BASE_URL` is set, calls go to that self-hosted OmniRoute gateway instead — it
is OpenAI-compatible, so it is the same code path with a different base URL plus an
`x-omniroute-combo: auto/cheap` hint. **Vercel AI Gateway is never used.** Keys
live in Convex env only, never in the repo or client code.

### Env vars (all in Convex env)

| Var | Required | Purpose |
|-----|----------|---------|
| `OPENROUTER_API_KEY` | yes (default path) | OpenRouter key; also the fallback key for OmniRoute. |
| `CLAWMART_FREE_MODELS` | no | Comma-separated free model ids, overriding `DEFAULT_FREE_MODELS` without a deploy. Free ids churn; a stale id simply fails, trips its breaker, and the chain moves on. |
| `OMNIROUTE_BASE_URL` | no | Opt-in: OpenAI-compatible root (`.../v1`) of a self-hosted OmniRoute gateway. Unset = OpenRouter. |
| `OMNIROUTE_API_KEY` | no | Key for that gateway; falls back to `OPENROUTER_API_KEY`. |

## Missions that execute: the dev-box bridge

By default every specialist writes about the work. A mission started with `execute: true`
may hand **one** engineering task to a real dev box (`docs/PROVISIONING.md`), which works on
a branch in an allowlisted repo and opens a pull request the owner reviews.

The whole path stays behind `CLAWMART_BOXES_ENABLED`, which is **off in production**. With
the flag unset `boxes.claimBoxForTask` returns on its first line, before a single read or
write, and a mission runs exactly as it always has.

**Dispatch.** `missionEngine.runTask` offers a task to a box when its agent is `codeCapable`
*and* the mission opted in; `boxes.claimBoxForTask` then decides. Every refusal is a return
value, never a throw, and the engine falls through to the ordinary model path — so a mission
that cannot get a box loses a *draft*, never a task. It refuses when: the flag is off, the
mission did not opt in, the agent is not one of the eight, the mission already used its box,
the company is not live or already has a live box, no repo is allowlisted, or a daily box
window is full. The box is sent the task title, the brief, the mission goal, and the staffed
specialist's roster key, so the harness runs as that specialist rather than as the globally
configured default. It is never sent a repo name or a branch — the allowlist and server config
pick those, so no plan and no prompt injection can steer a box at a different repository.

A daily box window is *checked* before it is charged: on this path a refusal is a return value,
not a throw, so an increment made before a later refusal would commit for a box nobody got and
quietly drain the shared global budget.

**One box per mission, not per task.** Booting EC2 costs minutes and money, so a mission gets
one, enforced by a `devBoxes.by_mission` row that is never deleted. A second `codeCapable`
task in the same mission drafts text exactly as it does today.

> The intent was for tasks to *share* one box. The current box cannot do that: it runs one
> task from its SSM config, opens its PR, and `shutdown -h now`s, and it has no inbound
> channel — it only POSTs outward. Task reuse needs a box-side work loop, which is a change to
> `infra/agent/` and unverifiable without AWS. What is built is the honest half: one box per
> mission, for one task.

**Completion.** The harness has no structured callback — it reports through `/box/event`
(`{kind, text}`) and nothing else — so the bridge recognises its two terminal lines. The
matching rules live in `convex/lib/boxevents.ts` and are unit-tested, because that same
stream carries **untrusted repository bytes**: tool results and gate output are posted as
`output` events, and a repo can contain any line it likes. Hence a marker must be the *whole*
event text (repo content arrives inside multi-line blocks, never as an entire event), and a
pull-request link is accepted only under the repo the box was allowlisted to touch — the
worst a forged line achieves is pointing at another PR in that same repo.

A settled box task gets the same `TASK_CONTRACT` envelope every other specialist returns, so
the DAG, the mission board, and the memory distiller need no special case. **The envelope is
generated by us**, not by the box: the only box-supplied value that survives into it is the
validated PR URL. Nothing the box says ever becomes prompt text for another agent — box
output reaches the live feed, which is display-only, and stops there. A box that opened no
pull request **fails** its task, so the skip cascade settles anything downstream instead of
letting a dependent specialist build on work that does not exist.

**A box failure settles the task; it never hangs the mission.** Four paths settle it directly
and the first one to find the task still `running` wins:

| What happened | Settles via |
|---|---|
| Harness finished (`status: done`) | `boxes.recordBoxEvent` → PR captured, or failed if none |
| Provisioning failed (no creds, no image, AWS error) | `boxes.markFailed` |
| Box terminated or killed by the owner | `boxes.markTerminated` |
| Box never reported back | `boxes.expireMissionBox`, scheduled at dispatch |

That last one is the guarantee: it is scheduled the moment the box is claimed, for the box's
own hard shutdown deadline plus five minutes, so it does not depend on anything the box says.
The stale-mission watchdog stays *behind* all four as a catch-all — and it now **skips** a
mission whose box is still inside that deadline. A box goes silent for long stretches by
design (its verification gate alone allows 15 minutes for install and 10 per step), so
closing the mission at 15 minutes would have failed tasks whose executor was still working,
on every slow repository.

Settling the box task also releases the box: a `done` event, a cancelled mission, and a
watchdog close each tear the instance down, which frees the company's box slot and revokes
the callback credential rather than waiting for the deadline.

## Guardrails

| Limit | Value | Where |
|---|---|---|
| Tasks per mission | `MAX_TASKS` = 8 (min 2) | `lib/roster.ts`, re-clamped in `savePlan` |
| Tasks in flight per mission | `MAX_CONCURRENT_TASKS` = 3 | `missions.claimReadyTasks` |
| Active missions per company | 2 (`planning` + `running`) | `missions.startMission` |
| Missions per user per day | 8 | sliding-window `rateLimits` |
| Missions per day, global | 60 | sliding-window `rateLimits` |
| Models tried per task | `MAX_CHAIN` = 4 | `lib/router.ts` |
| Tokens per call | 3000 task / 2000 plan / 700 distill, 90s timeout | `missionEngine.ts` |
| Prompt context | 6000 chars, handoffs only | `buildTaskMessages` |
| Learnings per mission | 5 max, 280 chars each | `validateLearnings` |
| Learnings stored per company | `MAX_COMPANY_MEMORY` = 24, oldest evicted | `missions.rememberLearnings` |
| Memory per prompt | `MEMORY_CHAR_BUDGET` = 1200, spent last | `lib/roster.ts` |
| Stale mission watchdog | 15 min without progress | `missions.failStaleMissions`, cron every 5 min |
| Eligible companies | `status === "live"` only | `missions.startMission` |
| Dev boxes per mission | 1, ever — and only if `execute` | `boxes.claimBoxForTask`, `devBoxes.by_mission` |
| Dev boxes per user / global | 5 and 20 per day, shared with the manual button | sliding-window `rateLimits` |
| Box task settle deadline | box's own runtime cap + 5 min | `boxes.expireMissionBox` |

Missions are owner-only end to end: `startMission`, `cancel`, `listForCompany`,
`missionBoard`, `listMemory`, and `forgetMemory` all check the Clerk subject against
`company.ownerId` / `mission.ownerId`.

The watchdog exists because a crashed action would otherwise leave a mission `running`
forever, holding one of the company's two slots. It closes anything with no progress for 15
minutes, keeping completed deliverables (`done` if any task finished, else `failed`), and
queries by the `by_status` index so it never table-scans.

## Trust rules apply to generated mission output

`TRUST_RULES` is injected into **every** agent's system prompt and into the planner's — no
exceptions, no per-agent opt-out. It forbids invented testimonials, customer quotes, user
counts, revenue, ratings, press mentions, case studies, and "as seen in" logos; forbids
guaranteed results; forbids claiming work was executed that was only described; and requires
the agent to say plainly when it lacks information instead of inventing it.

Every surface that renders mission output labels it an **AI draft**. This is the same rule
that binds the rest of the product (CLAUDE.md) — generated copy is not an exemption.

## Prior art

The design borrows deliberately from open-source work; what we took and what we did not:

- **agency-agents** — the roster convention: a division, a one-line blurb, an identity, and
  concrete deliverables per specialist. Adopted directly; the model-per-agent and tool
  wiring are not.
- **prime-agent** — the fan-out shape (an orchestrator spawns subagents that run in
  parallel). Adopted, but expressed with the Convex scheduler instead of a process
  supervisor, so there is nothing to keep alive between calls.
- **OmniRoute** — routing strategies resolving to a fallback chain, plus a per-model circuit
  breaker with exponential backoff. Adopted with two changes: breaker state is persisted in
  Convex (actions are short-lived), and the caller owns the retry loop so the router stays
  pure. `OMNIROUTE_BASE_URL` lets you put the real gateway in front of us.
- **hermes-agent** (MIT) — persistent memory and skills across runs. **Memory adopted**: a
  settled mission distills 2–5 durable learnings into a capped `companyMemory` list that is
  injected into every later plan and brief (above). Two changes: the distillation is one
  best-effort model call scheduled off the settle rather than an always-on scratchpad, and the
  owner can delete any row. **Skills not adopted** — nothing an agent learns becomes
  executable; memory is text a future prompt reads, and that is all.
- **orca** — parallel git worktrees, one agent per worktree. **Still not adopted.** A mission
  can put *one* task on a real box (above), which is one branch and one PR, not N agents in N
  worktrees. Parallel execution would mean N boxes per mission — precisely the cost the
  one-box-per-mission rule exists to refuse.

## Non-goals

- **Agents draft; humans ship.** A mission produces specs, copy, plans, and code text. It
  does not deploy, publish, post, or merge anything. The one exception is stated rather than
  buried: an `execute` mission spends cents of EC2 and pushes a `clawmart/*` branch to open a
  pull request. It cannot merge one — that is the owner's click, on a protected base branch,
  with a bot PAT that has no `workflows` scope.
- **Execution is opt-in, flagged, and singular.** The mission engine calls a model API and
  writes to Convex; the only path from a draft to a real change in a repo is the dev-box flow
  (`docs/PROVISIONING.md`), reached only through the bridge above — one box per mission, only
  for a `codeCapable` specialist, only when the owner asked for it, and only while
  `CLAWMART_BOXES_ENABLED` is set. It is unset in production.
- **No shared scratchpad and no learned skills.** Cross-mission memory is exactly one capped,
  owner-editable list of distilled text per company — never executable, never written mid-
  mission. There is still no agent-to-agent chat outside the handoff edges in the plan.
- **No recurring missions.** The only Agency cron is the stale-mission watchdog; missions are
  started by their owner.
- **No task retries beyond the model chain.** A task gets one pass through up to 4 models;
  there is no re-queue. The skip cascade and partial credit make a failed task survivable.

## The feedback loop: `scripts/mission-audit.mjs`

Unit tests stub `fetch` and never call a model, so they can prove a prompt
*contains* a rule but never that a model *obeyed* it. Every serious defect found
in the Agency so far came from reading what the specialists actually wrote.

`scripts/mission-audit.mjs` makes that repeatable. It dispatches a real mission
(or audits an existing one), waits for it to settle, and greps the corpus of
every deliverable for failure modes that were observed live:

```bash
# run a fresh mission and audit it
node scripts/mission-audit.mjs <companyId> "Win the first ten shops" free

# audit one that already ran (owner-scoped queries need the owner's subject)
CLAWMART_AUDIT_SUBJECT=user_abc node scripts/mission-audit.mjs --mission <missionId>
```

It exits non-zero when a probe fires, so a prompt change can be gated on it.
The identity is mocked, which Convex honors only on a dev deployment — it never
touches production data.

| Probe | The live failure it guards |
|---|---|
| `deferral` | Specialists shipped empty templates ("Awaiting the list of target bike shops") instead of work. A refusal travels in the handoff, so it propagated down the DAG and was distilled into permanent memory. |
| `invented emails` / `invented phones` | Fixing deferral opened the opposite hole: invented shops with fabricated contacts, attached to businesses that may really exist. |
| `fake provenance` | "based on shop size indicators observed in public listings" — research the model cannot have done, which makes invention look sourced. |
| `claimed traction` | Trust rule: a pre-launch company has no users or customers to report. |
| `unlabeled counts` | A count presented as fact. Deliberately *not* a bare number regex — bottom-up sizing is the Market Researcher's actual job, and an earlier version failed a mission for doing it correctly. Hedged numbers ("~60 shops", "120 (assumed)") and targets ("the top 10 shops") are exempt. |

Calibration across three real missions on the free tier, each run before and
after the relevant fix:

| Mission | deferral | contacts | provenance | verdict |
|---|---|---|---|---|
| before any fix | 4 | 0 | 0 | FAIL |
| anti-deferral only | 0 | 31 | 2 | FAIL |
| both fixes | 0 | 0 | 0 | **PASS** |

The probes are a lagging indicator, not a spec — when one fires, read the
samples before changing a prompt. Twice the honest conclusion was that the
probe was wrong and the model was right.
