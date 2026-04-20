# Hypothesis backlog

Pending experiments for the autopilot's decide phase. Highest-scoring unblocked hypothesis wins per tick.

**⚠️ Pivot, 2026-04-20:** After 5 rounds of research + user deliberation, clawmart is pivoting from "skill marketplace" to **"marketplace for AI agent hires."** Users browse Clawmart, hire pre-built Hermes-based agents (SDR, exec-assistant, researcher, devops-monitor, customer-support) deployed on Modal/Daytona serverless, wired into their Slack/Discord via the OpenClaw Gateway. Agents talk to each other in a Discord server the buyer owns — a virtual office. Billing: Stripe subscription $49–$199/mo per agent + overage; optional USDC (x402) for autonomous buyers.

Previous hypotheses (H-001 through H-004) assumed the skill-marketplace frame — archived as stale in `graveyard.md`.

Entry format:

```markdown
## H-NNN: <short title>

- **Category:** landing-copy | catalog | hire-flow | infra | channel-integration | pricing | seo
- **Hypothesis:** <one falsifiable sentence>
- **Test:** <what ships> + <what we measure>
- **Effort:** <S ≤ 2h | M ≤ 6h | L > 6h>
- **Reversibility:** <high | med | low>
- **Expected signal window:** <48h | 1 week | 2 weeks>
- **Kill criteria:** <what graveyards this>
```

---

## H-005: v0 — Homepage rewrite: "Hire AI agents for your workforce"

- **Category:** landing-copy
- **Hypothesis:** The current homepage sells "agent skills marketplace" to agents — wrong audience, wrong product. If we reframe to "Hire pre-built AI agents for your team — $49/mo, live in 10 minutes," human buyers (SMBs, ops teams, solo founders) will convert to a waitlist/pre-auth Stripe checkout. Agent skills were never the thesis.
- **Test:** Full rewrite of `src/app/page.tsx`. Kill the current supply/demand dual-narrative. New hero: "Your AI workforce, off the shelf." New CTA: "Browse agents →" goes to `/agents`. Metrics: homepage → `/agents` click-through rate over 48h, and waitlist/pre-auth signups once H-006 lands.
- **Effort:** M
- **Reversibility:** high
- **Expected signal window:** 7 days
- **Kill criteria:** <2% of homepage visits click through to `/agents` after launch — positioning is wrong, try again.

## H-006: v0 — Agent catalog at `/agents` with 5 role templates

- **Category:** catalog
- **Hypothesis:** A scannable catalog of 5 well-priced, clearly-scoped AI roles is enough to make "Clawmart = hire agents" concrete. Source templates from `/Users/ryanfrigo/dev/openclaw-workforce/templates/` (executive-assistant, research-agent, devops-monitor) + 2 new (sales-SDR, customer-support).
- **Test:** New route `src/app/agents/page.tsx` with 5 cards — name, one-paragraph role description, sample output, monthly price, "Hire →" button. Replaces the old `/skills` catalog in nav.
- **Effort:** M
- **Reversibility:** high
- **Expected signal window:** 48h
- **Kill criteria:** <5 catalog views in first 48h post-launch of H-005 + H-006 → no demand signal, rethink positioning.
- **Pricing anchor:** Researcher $49, DevOps $79, Exec-Assistant $99, Customer-Support $129, Sales SDR $149.

## H-007: v0 — Hire flow: `/agents/[slug]/hire` with Stripe pre-auth

- **Category:** hire-flow
- **Hypothesis:** Putting a real Stripe checkout (pre-auth, not charged until v1 ships the actual agent) validates willingness-to-pay before we build. A card on file is worth 100× a form submission.
- **Test:** Clerk sign-up → Stripe Checkout session for subscription (status: `pending`, no agent provisioned yet) → "Agent will be ready in 7 days" confirmation + Discord invite for early-buyer feedback channel.
- **Effort:** L
- **Reversibility:** med (real charges if we forget to keep in pre-auth)
- **Expected signal window:** 14 days
- **Kill criteria:** <5 pre-auths in 14 days after H-005+H-006+H-007 are all live → kill this pivot, go to stack-repurpose.

## H-008: Sunset existing skill marketplace surfaces (not delete)

- **Category:** catalog
- **Hypothesis:** The 6 existing `/api/x402/*` routes + `/skills` pages now confuse the new positioning. Hiding them from headline navigation (while leaving routes live to avoid breaking the ~0 integrations) will not hurt traction metrics.
- **Test:** Remove `/skills` from main nav. Redirect `/skills` → `/agents`. Leave API routes live. Leave catalog API live but add `deprecated: true` flag.
- **Effort:** S
- **Reversibility:** high
- **Expected signal window:** 24h
- **Kill criteria:** N/A — this is hygiene, not a hypothesis.

## H-009: v1 — First working Hermes agent on Modal (exec-assistant)

- **Category:** infra
- **Hypothesis:** Shipping one real, working agent (exec-assistant, the simplest template) via Modal serverless — wired to a buyer's Slack via OpenClaw Gateway — will get us our first real USDC or Stripe revenue and prove the workforce architecture.
- **Test:** Provision flow: buyer signs up → Stripe charges → Modal workspace spins up Hermes with exec-assistant role + OpenClaw Slack gateway. Measure: time from hire to first-message-in-Slack ≤ 15 min.
- **Effort:** XL (multi-tick; split into sub-experiments in v1 planning)
- **Reversibility:** low (infra + external account)
- **Expected signal window:** 30 days
- **Kill criteria:** >4 weeks of build + <3 completed hire flows = architecture is wrong.

## H-010: v1 — Inter-agent Discord per buyer workforce

- **Category:** channel-integration
- **Hypothesis:** Buyers who hire 2+ agents want to see them coordinate. Auto-provisioning a Discord server per buyer (they get invited as owner, agents post updates/handoffs there) is the feature Lindy/11x/Artisan don't have and can't easily copy without rearchitecting.
- **Test:** After 2nd agent hired, auto-create Discord server, invite buyer as owner, wire all their agents' OpenClaw Gateways to post there. Measure: retention of 2+-agent buyers vs 1-agent.
- **Effort:** L
- **Reversibility:** med
- **Expected signal window:** 30 days post-launch
- **Kill criteria:** <10% of 2+-agent buyers read the Discord in week 1 → feature doesn't resonate.
