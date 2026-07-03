# Company Studio — build contract

Clawmart's second surface (alongside the packs storefront): a Polsia-style studio where a
user describes a company or SaaS idea and a **founding team of AI agents** drafts the whole
company — positioning, brand, product spec, a live landing page, and a launch marketing kit —
while the user watches the build happen in real time.

Reference point: [Polsia](https://polsia.com) ("AI that runs your company while you sleep").
Where Polsia hides the work behind a nightly loop and a morning email, Clawmart Studio shows
a **live agent feed** and ships a **public company page instantly**. Honest scope: we draft
and host company assets; we do not claim to autonomously run a business.

## Infrastructure decision (no EC2)

The agent runtime is **Convex actions + the Convex scheduler** on the existing
Vercel + Convex stack. Explicitly rejected: EC2 / long-lived servers.

- The workload is ~100% waiting on LLM HTTP calls — no CPU to justify servers, nothing to
  patch, scale, or babysit.
- Each pipeline step is one Convex action that schedules the next step
  (`ctx.scheduler.runAfter(0, …)`), so builds are durable and have no single-function
  timeout ceiling.
- Convex live queries give the real-time agent feed for free — the core UX differentiator.
- Convex crons already exist in this repo and cover future Polsia-style recurring work
  ("agents check on your company daily").
- Escape hatch if we ever execute user code: Vercel Sandbox — still not EC2.

## LLM provider

**OpenRouter only** (`https://openrouter.ai/api/v1/chat/completions`) — not Vercel AI Gateway.
`OPENROUTER_API_KEY` lives in **Convex env** (actions run there). Never in the repo, never
in client code.

Models (see `convex/lib/agents.ts`):

- Worker default: `google/gemini-2.5-flash` (cheap, fast, JSON-reliable)
- Premium steps (strategist, landing): `anthropic/claude-sonnet-4.6`

Agents must return strict JSON (prompt-enforced; fence-stripped parse with one retry).

## Data model (additive — packs tables untouched)

- `companies` — one per user idea. `ownerId` (Clerk subject), `idea`, `slug` (public URL key;
  re-slugged from the brand name when the brand step lands), `name`, `tagline`,
  `status: draft | building | live | failed`, timestamps.
- `agentRuns` — one per pipeline step per build: `companyId`, `agentKey`, `status:
  queued | running | done | failed`, `model`, `error?`, token counts, timestamps.
- `agentEvents` — append-only live feed: `companyId`, `ts`, `kind: status | output`, `text`.
- `companyAssets` — final artifacts: `companyId`, `kind: plan | brand | product | landing |
  marketing`, `json` (stringified — agent schemas evolve too fast for Convex validators).

## Agent pipeline

Ordered founding team, each step feeding the next:

1. **Strategist** — positioning, ICP, business model, risks
2. **Brand** — name, tagline, palette, voice (company re-slugged here)
3. **Product** — SaaS spec: features, MVP cut, pricing tiers
4. **Landing** — structured landing-page JSON rendered at `/c/[slug]`
5. **Marketing** — launch kit: tweets, LinkedIn post, cold email

`startBuild` (mutation, auth'd, guarded) creates 5 queued runs and schedules step 0. Each
`runAgent` action: mark running → OpenRouter call → parse → write asset + events → mark done →
schedule next. One retry per step; a terminal failure marks the run and company `failed` but
keeps earlier assets. Last step flips the company `live`.

## Auth

Clerk (already installed; keys already in env). `ConvexProviderWithClerk` on the client,
`convex/auth.config.ts` with the Clerk issuer domain, `clerkMiddleware` in Next. Studio
routes are signed-in only; `/c/[slug]` is public. Packs checkout stays guest-only.

## Surfaces

- `/studio` — pitch + create form + "my companies"
- `/studio/[id]` — live build feed + output tabs (plan / brand / product / landing preview /
  marketing kit)
- `/c/[slug]` — public generated landing page; email-capture CTA writes to the existing
  `waitlist` table (`source: "c/<slug>"`); footer credits "Built with Clawmart Studio"

## Guardrails

- 3 companies per user; one active build per company
- Global daily agent-run cap via the existing `rateLimits` sliding-window pattern
- `max_tokens` capped per call; one retry per step; no unbounded loops
- Trust rules apply to **generated** copy too: prompts forbid fabricated testimonials,
  user counts, ratings, and "guaranteed results" in landing pages and marketing kits

## v1 non-goals

Deploying user apps to their own infra, ad-spend management, revenue share, recurring
autonomous runs, payments for the studio itself (free tier validates demand first;
pack sales remain the revenue line).
