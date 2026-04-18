# clawmart-autopilot — guardrails

These guardrails apply **every tick**. A tick that violates any of them must abort and record the violation in `autopilot-state/graveyard.md`.

## Protected surfaces (never modify in an autopilot tick)

- Any file matching `.env*`
- `convex/auth.config.js|ts` (Clerk wiring)
- `src/middleware.ts` (auth middleware)
- `src/app/api/stripe/**` (fiat payouts to skill authors)
- `src/app/api/webhooks/**` (signature verification lives here)
- Any line containing a string that looks like a secret: `sk_`, `pk_`, `clerk_`, `whsec_`, `rk_`, or a raw 40-char hex address
- `.claude/plugins/clawmart-autopilot/**` (don't let the loop rewrite itself mid-flight; that's a separate authorized human task)
- `CLAUDE.md` at repo root (human-owned)

## Allowed surfaces

- `src/app/api/x402/**` — adding new skill routes, updating pricing, improving responses
- `src/app/skills/**`, `src/app/page.tsx`, `src/app/docs/**` — marketing / discovery surfaces
- `convex/schema.ts` — schema extensions only (never destructive migrations)
- New files anywhere outside protected surfaces
- `public/` — SEO assets, sitemap inputs
- `autopilot-state/**` — state updates every tick

## Payment address handling

- Read `PAYMENT_ADDRESS` only to display / confirm it's non-zero. If it's still `0x0000...0000`, the tick must flag this in the journal and **not** deploy new x402 routes (they'd be unpayable).
- Never write to `.env*`. If an address change is needed, write a journal entry asking the user to update Vercel env vars.

## Tick hard limits

- Max diff per tick: 400 lines added/changed
- Max files touched per tick: 8
- Max duration of an autopilot command: 20 minutes (Claude Code clock)
- Max consecutive ticks with no traction delta: 5 → auto-pause and require human review

## Auto-pause triggers

The tick **must** write `autopilot-state/PAUSED` (containing a reason) and exit if any of:

- `npm run build` fails on `main` before the tick starts (someone else broke it — don't stack)
- More than 5 open draft PRs from `autopilot/tick-*` branches (we're building faster than humans review)
- Git working tree has uncommitted changes that aren't autopilot state files
- `.claude/plugins/clawmart-autopilot/` has been modified since last tick (self-modification attempt)

A paused loop is resumed only by `/clawpilot-resume` (which deletes `PAUSED` after the user confirms).

## Success / kill criteria per experiment

- **Win**: x402 payments on the changed surface in the 48h window after the PR merges ≥ baseline × 1.5, OR catalog hits for the affected skill ≥ baseline × 2
- **Kill**: 5 ticks after landing with no positive metric delta → graveyard with the reason "no traction"
- **Neutral**: keep running for up to 10 ticks, then graveyard

## Product-space permissions

The autopilot **is** allowed to pivot clawmart's product positioning within these rails:

- It may add/remove x402 skills freely
- It may change landing copy, SEO, and docs
- It may prototype new product categories (data resale, API proxy, agent-infra tools) as new routes
- It **may not** change the payment protocol (x402/USDC/Base) without an explicit approved hypothesis in the backlog with `protocol-change: true`
- It **may not** rename the product or domain

If in doubt about whether a change is in-scope: journal the question, skip the change this tick, and ask the human.
