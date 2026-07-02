# Relaunch — 2026-07-02 — AI Visibility Fix Kit

**Type:** human-directed relaunch (not an autopilot tick). Session goal: "build clawmart
into a fully working SLC profitable thing… test everything… set up Stripe… don't ask."

**Killed:** the "hire pre-built AI agents" v0 (H-005/6/7) — 0 Stripe sessions in 73 days,
prod stuck in TEST mode, distribution never fired. See graveyard strategic kill #2.

**Shipped:** clawmart.co is now a storefront for AI-visibility fixes.
- Free AI Visibility Check (no signup) → **$49 one-time AI Visibility Fix Kit** (guest
  checkout): ready-to-paste JSON-LD, answer-capsule rewrites, robots.txt AI-crawler config,
  FAQ drafts, Wilson-interval mention scores, full timestamped transcript appendix.
- "Monthly fix drops" recurring SKU deferred behind a waitlist gate (≥25 signups or ≥10
  sales in 14 days) — do NOT build it before that validates.

**Decision process:** 5 research agents (market/competitive/distribution/site/codebase) +
3-skeptic red team on the spec before a line was written. The red team killed the original
$79 report-only SKU and the $49/mo monitoring sub (both dominated by HubSpot's free grader
/ Otterly); the survivor is the *fix layer*, which free tools don't ship. Binding spec:
`docs/RELAUNCH-SPEC.md`; architecture contract: `docs/BUILD-CONTRACT.md`.

**Build:** 3 parallel tracks (Convex backend / web UI / glue+tests) against a pinned schema
+ API contract. Then a high-effort multi-agent code review found 10 confirmed issues (money-
path stranding, SSRF TOCTOU, missing rate limits, wall-clock watchdog) — all fixed and
re-verified.

**Testing:** 42 unit tests; full paid funnel driven E2E in a real browser with Stripe test
card 4242 — locally AND on the live prod site: check → checkout → payment → Convex-httpAction
webhook → 40-chunk pipeline → rendered report; idempotent webhook replay confirmed as a
no-op.

**Deploy:** Vercel prod (from the branch) + Convex prod (honorable-guanaco-406, new schema,
legacy tables cleared). Stripe in TEST mode — no real charges until `docs/FLIP-TO-LIVE.md`
is followed. PR #5 open (draft) for human merge to main. Instant Vercel rollback available.

**Trust posture (binding):** no "how ChatGPT sees you" declaratives; methodology disclaimer
adjacent to every score; no fabricated stats/logos/testimonials; provider names nominative
only; refund-on-failure flow (`refund_flagged` state → human executes the Stripe refund,
code never refunds autonomously).

**Autopilot:** PAUSED. Its guardrails/skills still reference deleted x402 surfaces
(/api/catalog, /api/x402/*). Rewrite `.claude/plugins/clawmart-autopilot/` and
`.claude/skills/clawmart-*` for the Fix Kit metric (Stripe net revenue) before resuming.
