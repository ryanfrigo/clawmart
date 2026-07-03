# Clawmart

Clawmart is a storefront of **premium skill packs for [OpenClaw](https://github.com/openclaw/openclaw)** —
the self-hosted personal AI assistant. OpenClaw's free registry (ClawHub) offers à-la-carte
skills; clawmart sells the **curated, assembled, ready-to-run** layer: multi-skill packs for
one job (AI SDR, E-Commerce Ops, Personal Chief of Staff, Content Engine), built to the
OpenClaw AgentSkills spec, delivered as a gated zip download. Guest checkout, 14-day refund.

Product spec + architecture: `docs/PACKS-BUILD-CONTRACT.md`. Go-live: `docs/FLIP-TO-LIVE.md`.
Catalog source of truth: `src/lib/packs.ts`. Distribution: `marketing/`.

**North-star metric:** weekly Stripe net revenue (pack sales; later, more packs / a bundle sub).
**Proxy metrics:** pack-page views, page→checkout conversion, waitlist signups.

## Stack

- Next.js 16 App Router · React 19 · TypeScript · Tailwind 4 · shadcn/ui
- Convex — source of truth (`purchases`, `rateLimits`, `waitlist`). A purchase is Stripe
  Checkout → a signature-verified idempotent Convex httpAction webhook (`/stripe/webhook` on
  the `.site` URL) → `paid` → gated download. **No LLM pipeline.**
- Stripe Checkout, one-time payment, guest (`customer_creation: "always"`).
- Pack file contents live under `packs/<slug>/**`, compiled into `src/lib/pack-contents.ts`
  by `scripts/build-pack-contents.mjs` (runs via `prebuild`); `/api/download/[token]` serves
  a jszip gated by purchase status.
- Deployed on Vercel. Clerk is installed but unused (guest-only v1).

## Trust rules (binding for ALL copy and code)

- Nominative use of "OpenClaw" only; state non-affiliation in the footer; no OpenClaw logos.
- Honest about what a pack is: curated, ready-to-install skill bundles built to the
  AgentSkills spec, with a setup guide — adapt to your stack; not tested against your exact
  environment. 14-day refund.
- No fabricated stats, testimonials, ratings, or counters — anywhere, ever.
- No "guaranteed results".

## Autopilot

The clawpilot loop is **PAUSED** (`autopilot-state/PAUSED`) — its guardrails/skills reference
deleted surfaces from earlier products. Do not resume until rewritten for the packs product.

## Hard rules (apply to every Claude session in this repo)

1. **Never edit, print, or exfiltrate secrets.** `.env*`, Stripe keys, Convex deploy keys,
   `SERVER_SHARED_SECRET` are off-limits to display; manage via `vercel env` /
   `npx convex env set` with piped values only.
2. **Never push to `main` directly.** Changes land via PR branches; humans promote to main.
   Human-directed sessions may deploy a branch to Vercel prod (as this build did) while main
   stays clean until merge.
3. **Never post to external platforms** (X, HN, Reddit, Discord, ClawHub, email) on the
   user's behalf, and never reveal the founder's identity. Marketing copy is generated into
   `marketing/` for the founder to fire manually. No astroturfing/sockpuppets, ever.
4. **Never move funds.** Refunds are executed by the founder in Stripe; code never refunds.
5. **One change per autopilot tick** (~400-line ceiling). Human-directed sessions may exceed
   with an explicit goal (declared in the PR).
6. **Kill the loop if things break.** On `npm run build`/`lint` failure during an autopilot
   tick, revert, graveyard, stop.
