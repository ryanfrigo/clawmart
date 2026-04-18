# Tick 2 — 2026-04-17 — landing-demand-side

**Hypothesis:** H-001 — Agent developers scanning the homepage in <10s currently see "marketplace for AI skills" (supply-side framing) and bounce because it sounds like another crowded directory. Reframing as "the API your agent calls when it needs something done" (demand-side framing) should raise the `/api/catalog` fetch rate.

**Action:** Rewrote landing hero (badge, H1, subhead, primary CTA, trust strip), footer tagline, `layout.tsx` metadata (title/description/OG/Twitter), and the home JSON-LD descriptions. Primary CTA now points at `/api/catalog` directly — the one URL an agent developer should take away from the page.

- Branch: `autopilot/tick-2-20260418-001008-landing-demand-side`
- PR: https://github.com/ryanfrigo/clawmart/pull/1 (draft)
- Files touched: 3 (`src/app/page.tsx`, `src/app/layout.tsx`, `autopilot-state/metrics-history.jsonl`)
- Diff size: ~19 insertions / 17 deletions
- Lint: baseline (40 pre-existing errors on main, 0 introduced)
- Build: passing

**Expected signal:**
- Primary: `/api/catalog` request rate over the 48h window after PR merge ≥ baseline × 1.5
- Secondary: total catalog-skill `totalCalls` starts moving above zero for the first time
- Tertiary: any agent-developer-facing referrer (e.g. Twitter, HN) where people link clawmart now frames it correctly in the OG preview

**Observed so far:** Baseline set at tick 2:
- catalog_size = 6, total_calls_sum = 0, payment_address_configured = true (first tick where it's true)
- No prior experiments to evaluate

**Next:** Tick 3 should re-measure traction at ≥48h after PR merge. If `total_calls_sum` is still 0 AND catalog-fetch rate is flat, H-001 is dead — graveyard and lean into H-002 (well-known paths) to test distribution rather than positioning. If calls > 0 but catalog fetches flat, positioning worked but we need more skills agents actually want (revisit H-004 FX skill). Do NOT re-tune the landing copy in tick 3 — let the signal breathe.

**Guardrail notes:**
- No secrets touched. No env vars touched. No protected surfaces touched.
- PAYMENT_ADDRESS confirmed configured via `/api/catalog` before starting the tick.
- One change, one PR, one tick. PR is draft — human promotes.
