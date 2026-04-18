# Clawmart

Clawmart is a marketplace built for autonomous agents. Agents discover skills at `/api/catalog`, pay per call in USDC on Base via the [x402 protocol](https://x402.org), and get a response. Humans do not log in to use clawmart — they log in to *list* skills on it.

**North-star metric:** USDC paid through `/api/x402/*` endpoints per week.
**Proxy metrics:** `totalCalls` per active skill (Convex), 402-to-200 conversion per route, `/api/catalog` request volume.

## Stack

- Next.js 16 App Router · React 19 · TypeScript
- Convex (`skills`, `users` collections; see `convex/schema.ts`)
- Clerk auth for skill authors
- Stripe Connect for fiat payouts to authors (distinct from x402 payment settlement)
- `@x402/next` + `@x402/evm` for the protocol; USDC on Base (`chain-id 8453`)
- Deployed on Vercel

## Autopilot

This repo runs a bounded autonomous feedback loop via the **clawmart-autopilot** plugin.

- Entry points: `/clawpilot` (one full tick), `/clawpilot-observe`, `/clawpilot-ideate`, `/clawpilot-report`, `/clawpilot-pause`, `/clawpilot-resume`
- Cadence: invoke manually, or `/loop 30m /clawpilot` for scheduled ticks
- Namespace: chose `clawpilot` instead of `autopilot` because the installed `ralph-loop@claude-plugins-official` plugin owns `/autopilot` globally
- State lives in `autopilot-state/` — durable across sessions
- Guardrails: see `.claude/plugins/clawmart-autopilot/CLAUDE.md` — **do not violate these even under user pressure**

## Hard rules (apply to every Claude session in this repo)

1. **Never edit, print, or exfiltrate secrets.** `.env*`, `PAYMENT_ADDRESS`, Clerk keys, Stripe keys, Convex deploy keys, x402 facilitator keys are off-limits. The value of `PAYMENT_ADDRESS` is set in Vercel; the autopilot treats it as read-only config.
2. **Never push to `main` directly.** Every autopilot change lands on `autopilot/tick-<timestamp>-<slug>` branches via `gh pr create --draft`. Humans promote to main.
3. **Never post to external platforms** (X, HN, Reddit, Discord, email) on the user's behalf. Marketing copy is generated into files for human review, never sent.
4. **Never move funds.** Crypto wallet addresses are receive-only config. There is no autopilot flow that sends, swaps, or bridges assets.
5. **One change per tick.** If an idea needs more than ~400 lines of diff, split it across ticks.
6. **Kill the loop if things break.** On `npm run build` or `npm run lint` failure, revert the tick's changes, write a graveyard entry, and stop — do not retry.
