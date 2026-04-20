# Tick 5 — 2026-04-20 — hire-flow (H-007)

**Hypothesis:** Humans who click a role card on `/agents` will actually fill out a Stripe Checkout and submit a card when the hire button offers a 30-day free trial with no immediate charge — the classic "waitlist with a card on file" pattern. Without this endpoint, the pivot has no willingness-to-pay signal and PR #2 / PR #3 dead-end on a "Coming soon."

**Action:** Shipped the full `/agents/<slug>/hire` Stripe pre-auth flow.

- Branch: `autopilot/tick-5-20260420-115448-hire-flow`
- PR: (see summary below)
- Files touched (5, within 8-file limit):
  - `src/app/api/agents/hire/route.ts` — new POST handler, Clerk auth, Stripe subscription + 30-day trial, inline `price_data` so no pre-created Stripe prices are needed
  - `src/app/agents/[id]/hire/page.tsx` — new server page, looks up agent template by slug, renders role / price / sample output / CTA
  - `src/app/agents/[id]/hire/hire-cta.tsx` — new client CTA wrapper (ClerkProvider + SignedIn/SignedOut), POSTs to `/api/agents/hire` and forwards to Stripe's hosted checkout URL
  - `src/app/agents/[id]/hire/success/page.tsx` — new server page, reads `session_id`, shows "you're on the list" + placeholder early-buyers Discord copy (not a real Discord — per spec)
  - `src/app/agents/[id]/page.tsx` — stub converted from client-side redirect-to-`/` into a server `redirect(/agents/<id>/hire)`
- Also: preparatory commit cherry-picking `src/lib/agent-templates.ts` from the still-draft PR #3 (`autopilot/tick-4-*-agents-catalog`), so this branch compiles standalone.

Diff size: 389 insertions / 19 deletions across the 5 files (under the 400-LOC ceiling). Build and lint both green — no new errors introduced.

**Reference implementation followed:** `src/app/api/payments/checkout/route.ts`. Same `auth()` pattern, same inline `price_data`, same stripe client. Differences: `mode: "subscription"` instead of `"payment"`, `subscription_data.trial_period_days: 30`, `payment_method_collection: "always"` so the card is captured even though there's no charge today.

**Expected signal:** Stripe Checkout sessions created against `/api/agents/hire` in the 14-day window after the final piece of v0 merges (PRs #2 + #3 + this one). Baseline = 0. Target = ≥ 5 sessions = workforce pivot is validated. < 5 = kill the pivot and stack-repurpose (per the 2026-04-20 pivot note).

**v0 completion:** After this PR merges alongside PR #2 (homepage) and PR #3 (catalog), the full funnel is live end-to-end:

```
Homepage (PR #2) → "View agents" → /agents catalog (PR #3) → "Hire →"
  → /agents/<slug>/hire (this PR) → Stripe Checkout (subscription + 30-day trial)
  → /agents/<slug>/hire/success
```

No agent is actually provisioned (that's v1). The v0 bet is pure willingness-to-pay: does anyone hand over a card for a 30-day free trial of an agent we haven't built yet? 14 days of data decides whether we build v1 or stack-repurpose.

**14-day kill criteria (starts ticking from the last of PRs #2/#3/#5 to merge):**
- `< 5` Stripe Checkout sessions against `/api/agents/hire` → **kill workforce pivot**. Pivot note commits to this — no more pivots, stack-repurpose.
- `5–20` sessions → continue to v1 (build first Hermes agent on Modal, Slack-wired, for whichever role got the most hires).
- `> 20` sessions → strong pull signal; parallel-track v1 across top-2 roles.

**Observed so far:** baseline only. No Stripe sessions ever created against this endpoint (it's new). x402 metrics unchanged: 6 skills, 0 total calls, 0 observable USDC. The pivot note treats pre-pivot x402 metrics as legacy baseline — they're not the primary metric anymore.

**Next tick (tick 6) should:**
1. Check whether the 3 draft PRs have merged. If yes, start the 14-day clock in `active-experiments.md`.
2. If yes and at least 1 checkout session has fired (check Stripe Dashboard manually — there's no automated pull), promote H-007 to "Win in progress."
3. If all 3 PRs are still draft: do NOT ship more product surfaces; write a journal entry asking the user to review + merge. Stacking more draft PRs on an unvalidated flow burns the 8-file/400-LOC budget with no feedback loop.
4. If some PRs are merged but the hire flow returns 500s in prod (auth misconfig, missing `NEXT_PUBLIC_APP_URL`, etc.), revert to diagnostics before shipping new features.

**Things this tick deliberately did NOT do (guardrail adherence):**
- No Convex schema changes — Stripe subscription metadata is source of truth for v0.
- No edits to `src/app/api/stripe/**`, `src/app/api/payments/**`, `src/app/api/webhooks/**`.
- No env var reads/writes. Used `process.env.NEXT_PUBLIC_APP_URL` at request time only.
- No touches to `src/proxy.ts` / middleware — relied on the same un-middleware'd `auth()` pattern as `/api/payments/checkout`.
- No real Discord server created — the "early-buyers Discord" copy is explicitly a placeholder that ships in the welcome email.
- No PR merged by the autopilot; PR stays draft for human review.
