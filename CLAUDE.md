# Clawmart

Clawmart is **Clawmart Studio** — a Polsia-style product where a user describes a company or
SaaS idea and a **founding team of five AI agents** (Strategist, Brand, Product, Landing,
Marketing) drafts the whole company live: plan, brand, product spec, a standalone public
landing page at `/c/[slug]`, and a launch kit. The user watches the build happen in a
real-time agent feed. Outputs are honestly labeled AI drafts — we never claim to run a
business autonomously.

Product spec + architecture: `docs/COMPANY-STUDIO.md`.

**North-star metric:** activated builders → weekly Stripe net revenue once the Studio
monetizes.
**Proxy metrics:** companies created, waitlist signups per company page.

## Stack

- Next.js 16 App Router · React 19 · TypeScript · Tailwind 4 · shadcn/ui
- Convex — source of truth **and** agent runtime: pipeline steps run as Convex actions
  chained via the scheduler (`companies`, `agentRuns`, `agentEvents`, `companyAssets`,
  `waitlist`, `rateLimits`; legacy `purchases`).
- LLM calls go through **OpenRouter only** — never Vercel AI Gateway. `OPENROUTER_API_KEY`
  lives in Convex env (actions run there), never in the repo or client code.
- Clerk auth: users sign in to create companies; `/c/[slug]` pages are public.
- Legacy delivery: `/api/download/[token]` still serves past pack purchases and must keep
  working; the storefront itself is removed.
- Deployed on Vercel.

## Trust rules (binding for ALL copy and code — including generated pages)

- No fabricated stats, testimonials, ratings, or user counts — anywhere, ever, **including
  AI-generated company pages and launch kits** (agent prompts must forbid them).
- Every generated page and asset is honestly labeled as an AI draft.
- No "guaranteed results".
- Legacy pack purchase links must never break.

## Autopilot

The clawpilot loop is **PAUSED** (`autopilot-state/PAUSED`) — its guardrails/skills reference
deleted surfaces from earlier products. Do not resume until rewritten for the Studio product.

## Hard rules (apply to every Claude session in this repo)

1. **Never edit, print, or exfiltrate secrets.** `.env*`, Stripe keys, Convex deploy keys,
   `SERVER_SHARED_SECRET`, `OPENROUTER_API_KEY` are off-limits to display; manage via
   `vercel env` / `npx convex env set` with piped values only.
2. **Never push to `main` directly — but always ship.** Changes land via PR branches;
   once fully verified (typecheck, lint, tests, build, runtime e2e, review pass) merge the
   PR to main and deploy to production without asking (founder directive, 2026-07-13:
   "should always push to prod"). Vercel deploys prod from main; run `npx convex deploy`
   for backend changes. Unverified or failing work never ships.
3. **Never post to external platforms** (X, HN, Reddit, Discord, email) on the user's
   behalf, and never reveal the founder's identity. Marketing copy is generated into
   `marketing/` for the founder to fire manually. No astroturfing/sockpuppets, ever.
4. **Never move funds.** Refunds are executed by the founder in Stripe; code never refunds.
5. **One change per autopilot tick** (~400-line ceiling). Human-directed sessions may exceed
   with an explicit goal (declared in the PR).
6. **Kill the loop if things break.** On `npm run build`/`lint` failure during an autopilot
   tick, revert, graveyard, stop.
