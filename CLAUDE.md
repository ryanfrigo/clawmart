# Clawmart

Clawmart sells **AI visibility fixes**. The free AI Visibility Check at clawmart.co samples
how the AI models that power ChatGPT, Claude, and Perplexity answer buyer-intent questions
about a brand; the **$49 one-time AI Visibility Fix Kit** ships ready-to-paste fixes
(JSON-LD, answer-capsule rewrites, robots.txt AI-crawler config, FAQ drafts) with a
verifiable transcript appendix. Guest checkout — no accounts in v1.

Product spec (binding, red-teamed): `docs/RELAUNCH-SPEC.md`. Cross-module API contract:
`docs/BUILD-CONTRACT.md`. Go-live checklist: `docs/FLIP-TO-LIVE.md`.

**North-star metric:** weekly Stripe net revenue (kit sales; later, fix-drop subscriptions).
**Proxy metrics:** free checks run, check→purchase conversion, waitlist signups.
(The pre-2026-07 x402/USDC north star is dead — see `autopilot-state/graveyard.md`.)

## Stack

- Next.js 16 App Router · React 19 · TypeScript · Tailwind 4 · shadcn/ui
- Convex — source of truth (`reports`, `samples`, `checks`, `rateLimits`, `spend`,
  `waitlist`); the report pipeline runs as chunked self-scheduling Convex actions;
  the Stripe webhook is a Convex httpAction (`/stripe/webhook` on the `.site` URL)
- Stripe Checkout, one-time payment, guest-friendly (`customer_creation: "always"`)
- LLM via Vercel AI Gateway (`AI_GATEWAY_API_KEY` in Convex env; `LLM_MODE=mock` for
  deterministic local E2E). Clerk is currently unused (guest-only v1) but deps remain
  for a future accounts/subscription tier.
- Deployed on Vercel

## Trust rules (binding for ALL copy and code in this repo)

- Claim only "the AI models that power ChatGPT/Claude/Perplexity, queried via their APIs" —
  never "how ChatGPT sees you" declaratives.
- Scores always carry the adjacent methodology disclaimer + uncertainty band. Free check
  shows tier labels, never bare integers.
- Banned phrases: "guaranteed", "will improve", "get recommended by ChatGPT", numeric lift
  claims, "rank #1 in AI search".
- No fabricated stats, logos, testimonials, or usage counters — anywhere, ever.

## Autopilot

The clawpilot loop is **PAUSED** (`autopilot-state/PAUSED`) — its guardrails and skills
still reference deleted x402 surfaces. Do not resume until
`.claude/plugins/clawmart-autopilot/CLAUDE.md` and `.claude/skills/clawmart-*` are rewritten
for the Fix Kit product. Entry points: `/clawpilot*` commands.

## Hard rules (apply to every Claude session in this repo)

1. **Never edit, print, or exfiltrate secrets.** `.env*`, Stripe keys, Convex deploy keys,
   `AI_GATEWAY_API_KEY`, `SERVER_SHARED_SECRET` are off-limits to display; manage via
   `vercel env` / `npx convex env set` with piped values only.
2. **Never push to `main` directly.** Changes land via PR branches. Autopilot ticks use
   `autopilot/tick-*` draft PRs; humans (or an explicitly human-directed session) promote.
3. **Never post to external platforms** (X, HN, Reddit, Discord, email) on the user's
   behalf. Marketing copy is generated into files (`marketing/`) for human review, never sent.
4. **Never move funds.** Stripe refunds for failed generations are flagged
   (`refund_flagged`) for Ryan to execute — code never issues refunds autonomously.
5. **One change per autopilot tick** (~400-line ceiling). Human-directed sessions may exceed
   with an explicit goal (as the 2026-07-02 relaunch did — declared in the PR description).
6. **Kill the loop if things break.** On `npm run build` / `npm run lint` failure during an
   autopilot tick, revert, graveyard, stop.
