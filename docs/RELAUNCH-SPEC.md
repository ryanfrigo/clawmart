# Clawmart Relaunch Spec v2 — AI Visibility Fix Kit

Date: 2026-07-02. Owner: Ryan (solo). Builder: Claude. Status: FINAL after 3-skeptic red team.
Supersedes v1 (killed: $79 report-only SKU, $49/mo re-audit sub, dual ICP, storefront abstraction).

## Product

**clawmart.co — "Get your brand cited by AI."** We check how a brand shows up in
AI answers, then ship the actual fixes — not just a score.

**ICP (one):** founders / indie SaaS / marketers who can paste a snippet. Self-serve only.

### SKUs

1. **Free — AI Visibility Check** (no signup)
   - Input: domain. We infer brand/category/competitors (labeled "inferred", editable in paid).
   - Sampling: ~10 buyer-intent prompts; `perplexity/sonar` (search-grounded) + 1 ungrounded
     model, labeled. 1 run each. Crawl homepage for AEO basics (SSRF-safe, robots.txt-respecting).
   - Output: **tier label** (Invisible / Faint / Mixed / Visible) — NEVER a bare integer at this
     sample size. 2-3 teaser findings + locked fix-kit preview. 24h cache per normalized domain.
2. **$49 one-time — AI Visibility Fix Kit** (per domain; guest checkout, no account required)
   - ~40 prompts × 3 model families (perplexity/sonar grounded; openai + anthropic labeled
     "model knowledge, no live browsing" unless gateway search-tool passthrough verified)
     × **3 repeats** (~360 calls, COGS ~$3-6).
   - Deliverables (the point): ready-to-paste per-page JSON-LD; rewritten answer-capsule copy
     for top pages; robots.txt AI-crawler config; FAQ page draft; comparison-page outline —
     each fix tagged with mechanism + honest latency ("affects search-grounded answers —
     weeks" vs "affects model training — slow, not controllable").
   - Evidence layer: mention-rate scores WITH uncertainty band (Wilson interval); share-of-voice
     vs competitors (editable); full per-prompt transcript appendix with model IDs + timestamps;
     versioned prompt set ("Prompt Set v1"). Provider-default temperature, disclosed.
   - Web report at tokened URL (128-bit random, noindex), copy buttons, printable.
   - 14-day no-questions refund, stated at checkout. Statement descriptor "CLAWMART.CO".
3. **Recurring (NOT built in v1):** "Monthly fix drops" waitlist email capture on the report
   page. Build only after ≥25 waitlist signups or ≥10 kit sales.

## Trust & wording (binding, from red team)

- Claim ONLY: "the AI models that power ChatGPT, Claude, and Perplexity, queried via their APIs."
  NEVER "how ChatGPT sees you" declaratives. Question-form headlines OK.
- Mandatory disclaimer ADJACENT to every score (not linked): measured date, exact model IDs,
  N runs, "answers in consumer apps can differ due to web search, memory, personalization,
  location, and model routing. This estimates model behavior; it is not a recording of any
  real user's session." One-line version visible before Stripe payment.
- Banned everywhere: "guaranteed", "will improve", "get recommended by ChatGPT", numeric lift
  claims, "rank #1 in AI search". Permitted: "designed to", "makes your pages easier for AI
  crawlers and answer engines to cite".
- Report includes: "AI visibility optimization is a young field; evidence for these practices
  is emerging, not proven." (Differentiator, not weakness.)
- Footer: "Clawmart is not affiliated with or endorsed by OpenAI, Anthropic, or Perplexity."
  Plain-text names only, no provider logos.
- Public methodology page: scoring formula, prompt-set changelog, versioned.
- Auto-refund policy: generation failed/undelivered >24h → flag for immediate refund.
- Terms + Privacy pages ship in v1 (guest emails collected). Transactional email only.

## Architecture (binding, from red team)

- **Next.js 16** (Vercel): marketing pages, free-check UI + route handler (LLM via AI Gateway
  **OIDC** — Vercel runtime only), checkout API route, report/success pages. Free check rate
  limit: per-IP counter in Convex + domain normalization + 24h cache; WAF rule documented.
- **Convex**: source of truth. New schema: `reports` (status machine: pending_payment → paid →
  generating → complete | failed; token; domain; email; chunk progress; results), `spend`
  (daily LLM budget circuit breaker — hard stop, graceful "at capacity"), `checks` (free-check
  cache + rate counters), `waitlist`. ALL mutations internal except token-keyed report query
  + narrowly-scoped public entry points. Fulfillment pipeline: **Convex actions**, ~5 prompts
  per chunk, self-scheduling via ctx.scheduler, bounded retries, partial results persisted,
  **watchdog cron** marks stuck reports failed + refund-flagged.
- **LLM auth**: Convex actions use `AI_GATEWAY_API_KEY` from Convex env (OIDC is impossible
  there). `LLM_MODE=mock` env for deterministic local E2E; identical code path otherwise.
- **Stripe**: Checkout Session (mode=payment, card only, customer_creation=always). Report doc
  pre-created BEFORE session; reportId+token in metadata AND success_url. Webhook = **Convex
  httpAction** (signature verified in Convex, STRIPE_WEBHOOK_SECRET in Convex env, idempotent
  by session.id, internalMutation only). Handle async_payment_succeeded/failed. Next.js
  webhook route deleted.
- **Crawler**: http/https only, resolve + reject private/link-local IPs incl. redirects,
  timeout + byte cap, robots.txt respected, capped text to LLM.
- **Email**: abstraction w/ Resend, env-gated; success page shows report URL prominently
  ("bookmark this") so email is enhancement, not dependency. Documented human gate.

## What dies (same PR)

/skills /docs(x402) /credits /categories /onboard /admin /dashboard(workforce) /agents/* ;
/api/x402/* /api/skills/* /api/catalog /api/payments/* /api/stripe/checkout /api/agents/hire ;
Convex tables: skills, reviews, transactions, templates, workforces, agents, messages,
creditBalances, creditTransactions (data cleared first — Convex can't drop non-empty tables);
components: live-demo, x402-demo, skill-reviews, skills-grid; libs: agents.ts, x402.ts,
agent-templates.ts. vercel.json x402 rewrite. Dead routes → redirect to /.
Security fixes on the way out: delete unverified Clerk webhook (or add Svix), no public
money mutations, no `startsWith("user_2")` admin gate, no fabricated ratings/counts anywhere.
Clerk stays installed but OFF the purchase path (guest checkout); sign-in kept only if a
surface needs it (v1: none — remove middleware gating accordingly).
Update autopilot skills/state so the loop doesn't measure deleted endpoints (/api/catalog).

## Funnel math (stated, honest)

Launch channels (Ryan fires): PH + TAAFT + Reddit + HN ≈ 700-6,000 visits wks 1-4.
Assume 15% run free check, 2-5% of checks → $49 kit ⇒ first-month revenue ≈ $100-1,300.
This validates, it does not pay rent. Growth = compounding SEO/AEO pages + directories +
(if validated) monthly fix-drop sub + agency/white-label tier later. $100k/mo = 12-24mo
goal contingent on later tiers; v1's job is first organic dollars + funnel data.
Brand risk accepted explicitly: clawmart.co is the test domain; rename decision deferred
until the funnel shows conversion (migration cost budgeted then, not now).

## Test plan (binding)

- Unit (vitest): scoring/Wilson, mention detection, domain normalization, SSRF guard, prompt
  chunking, webhook idempotency (pure parts).
- E2E local: Convex dev deployment in LLM_MODE=mock; `stripe listen --forward-to <convex
  dev site>/stripe/webhook` with project test key; browser-drive: home → free check → result
  → buy → Stripe test card 4242 → success → report completes → artifacts render. Refund path
  + idempotent-replay (stripe CLI resend) tested.
- npm run build + lint green.
- Prod (Stripe test mode): same funnel on clawmart.co after deploy.

## Human gates (documented in FLIP-TO-LIVE.md, not blockers)

1. Vercel AI Gateway: add card (unlocks OIDC free check) + create AI_GATEWAY_API_KEY → set in
   Convex prod env (unlocks paid pipeline). Then run the 5-min real-LLM smoke script.
2. Stripe: flip to live keys in Vercel env + create live webhook endpoint pointing at Convex
   prod httpAction; set statement descriptor.
3. Resend (optional): domain DNS + key → set in Convex env.
4. Fire launch assets (files in marketing/).
