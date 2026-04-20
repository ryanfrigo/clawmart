# Tick 4 — 2026-04-20 — agents-catalog (H-006)

**Hypothesis:** H-006 — The homepage CTA "See the catalog → /agents" (shipped in PR #2) currently dead-ends on a client-side redirect back to `/`, forcing anyone who clicks through to bounce. Replacing the stub with a real scannable catalog of 5 pre-built AI-agent roles — each with a role name, description, monthly price, sample output, and Hire CTA — converts the click into either a hire attempt or an email reply ("build role X next"). Without this page, the entire pivoted homepage loops and we have no surface to measure willingness-to-pay against.

**Action:** Deleted the `/agents` redirect stub. Shipped a real catalog page at `src/app/agents/page.tsx` (server component, statically rendered) rendering 5 role cards from a new `src/lib/agent-templates.ts` constant — Executive Assistant ($99), Research Agent ($49), Sales SDR ($149), Content Writer ($79), DevOps Monitor ($79). Cards are a responsive 1/2/3-column grid with hover-glow on the card border and arrow-translate on the Hire link, sample-output block in italic quote style, dark aesthetic matched to the homepage (same `bg-[#09090b]`, same nav + footer chrome, same badge/h1/subhead hierarchy). Subheader "5 roles live. More coming weekly." sets expectation. Each card links to `/agents/<slug>` (the hire-flow surface tick 5 will build — not touched this tick). Nav's "List a Skill" CTA replaced with "Hire an agent" to match the pivot. Added an `mailto:hello@clawmart.co` fallback at the bottom of the grid so roles-we-don't-have-yet still generate demand signal.

- Branch: `autopilot/tick-4-20260420-114853-agents-catalog`
- PR: (draft, opened after commit)
- Files touched: 2 (`src/app/agents/page.tsx` rewritten, `src/lib/agent-templates.ts` new) + 2 autopilot-state files (metrics + this journal + active-experiments)
- Diff size: ~180 lines added / ~22 lines deleted (well under 400-line ceiling)
- Lint: 40 pre-existing errors unchanged, 0 new errors or warnings in my new files
- Build: passing. `/agents` is now statically rendered (was dynamic client redirect)

**Expected signal:**
- Primary: once PR #2 + PR #3 both merge, the homepage → `/agents` click stops looping. Measurable as `/agents` request volume > 0 in Vercel analytics over the 14-day v0 validation window.
- Secondary: any click on a "Hire →" button lands on `/agents/<slug>` (a 404 today — tick 5's job). If the logs show 5+ hits on `/agents/<slug>` before tick 5 ships, we have pull and should prioritize the hire flow over anything else.
- Tertiary: any `mailto:` click-through generating a demand email for a role we don't offer yet — signals which 6th role to build.
- Kill: per the pivot commit-discipline, if v0 gets <5 Stripe pre-auths in 14 days after the full flow launches (tick 5 ships hire form), the agent-marketplace thesis dies entirely.

**Observed so far:** Baseline still flat at tick 4:
- catalog_size = 6 (unchanged — the old x402 skills stay live but demoted)
- total_calls_sum = 0 (unchanged since bootstrap)
- payment_address_configured = true (0x116c...0984)
- PR #1 (H-001 landing demand-side) never merged; superseded by the 2026-04-20 pivot. Recommend closing #1 as "superseded — pivot."
- PR #2 (homepage rewrite) open and draft. This tick's PR #3 depends on #2's framing being live for the click-through funnel to make sense, but the page is self-contained and correct even if #2 never merges.

**Next:**
- Tick 5 should ship H-007 — the `/agents/[slug]` hire page with Stripe pre-auth. Until then, every card here 404s.
- After tick 5, the v0 flow is complete. Start the 14-day willingness-to-pay clock. Do NOT ship more agent-catalog iterations until that clock expires and we have data. The temptation will be to add a 6th role, redesign the cards, add a filter bar — resist.
- If before tick 5 we see organic `/agents` traffic (Vercel analytics), note it. That would already be a stronger signal than anything we've measured to date.

**Guardrail notes:**
- No secrets read or written. No `.env*` touched.
- No protected surfaces touched (no auth, no Stripe, no webhooks, no x402 routes, no Convex schema).
- Did not touch `src/app/agents/[id]/page.tsx` (tick 5's surface) per the brief.
- Did not touch `src/app/page.tsx` (PR #2's surface).
- Branch from main, draft PR, one change one tick. Human promotes.
