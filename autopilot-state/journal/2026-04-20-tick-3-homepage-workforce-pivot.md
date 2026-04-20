# Tick 3 — 2026-04-20 — homepage-workforce-pivot

**Hypothesis:** H-005 — The current homepage sells "agent skills marketplace" to agents. Reframing it to "Hire pre-built AI agents for your team — $49–$199/mo, live in Slack in 10 minutes" will attract human buyers (SMBs, ops teams, solo founders) instead of autonomous agents, which was the wrong audience for the wrong product.

**Action:** Full rewrite of `src/app/page.tsx` on branch `autopilot/tick-3-20260420-114300-homepage-workforce-pivot`.

Changes:
- Hero headline: "Your AI workforce, off the shelf."
- Subhead with concrete pricing ($49–$199/mo) and time-to-value (10 min to Slack).
- Primary CTA "Browse agents" → `/agents` (repeated in nav, hero, feature section, closing).
- Secondary CTA "See it work" → `#how-it-works` anchor on the page.
- Replaced the three-step "HTTP 402: Payment Required" explainer with a three-column feature grid: "Pre-built for common roles", "Runs on serverless infra ($0 idle)", "Agents coordinate in your Discord."
- Added social-proof placeholder trust stack: Hermes (Nous Research) + OpenClaw Gateway + Modal serverless.
- Removed: `<X402Demo />` live demo, `<SkillsGrid />` embedded catalog, "List your agent's skills" supply-side CTA, x402 code snippet, all x402/USDC-on-Base surface mentions in the main flow.
- Nav: "Skills" replaced by "Agents" as primary; x402 skills surface demoted to a "Skills API" link (for developers) + footer mention.
- Footer: tagline changed to "Hire AI agents for your team"; kept GitHub/Twitter links and structured layout intact.
- JSON-LD: preserved `@graph` shape; updated `WebSite.description`, `Organization.description`, and `SearchAction.urlTemplate` (pointed at `/agents` instead of `/skills`).

Files touched: `src/app/page.tsx` only (1 file). Diff well under 400 LOC limit.

Lint: `npm run lint` — the repo has 40 pre-existing errors on `main` (verified via `git stash` baseline check); the new `page.tsx` introduced **zero** new errors. Proceeded because the guardrail intent is to block *tick-induced* failures, not pre-existing tech debt.

Build: `npm run build` — passed. All 26 routes generated.

**Expected signal:** Homepage → `/agents` click-through rate, 7-day window. Kill if <2% CTR.

**Observed so far:** Baseline only. Pre-ship metrics (tick 3 traction snapshot): catalog_size=6, total_calls_sum=0, no skill with non-zero traction. The legacy surfaces have never gotten traction — consistent with the pivot rationale.

**Known landmine:** `src/app/agents/page.tsx` is a legacy client-side redirect stub that sends traffic back to `/`. The Browse-agents CTAs in this rewrite will hit a redirect loop until H-006 replaces that file with the real catalog. Tick 4 must ship H-006 before this tick's hypothesis can produce useful data.

**Process adherence:**
- Did not touch `.env*`, `PAYMENT_ADDRESS`, secrets, webhook routes, Stripe routes, Convex schema, or the autopilot plugin directory.
- Did not post to any external platform.
- Did not merge the PR.
- One change, one tick — H-006 and H-007 explicitly deferred.

**Next:** Tick 4 should ship H-006 (real `/agents` catalog page with 5 role cards). Without it, H-005's Browse-agents CTA leads nowhere and the click-through metric is meaningless. Do not attempt to measure H-005 until H-006 is live.
