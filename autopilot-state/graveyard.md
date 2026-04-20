# Graveyard

Killed hypotheses. Do not re-propose unless the reason was "timing."

Format:

```markdown
## <id/title>

- **Killed on:** <tick N, date>
- **Ran for:** <N ticks>
- **Reason:** no-traction | doesn't-work | timing | guardrail-violation | build-broke | pivot
- **What we learned:** <one sentence>
```

---

## H-001: Landing copy — reposition as "buy-side for agents"

- **Killed on:** 2026-04-20, pre-pivot (shipped tick 2 as PR #1, merged)
- **Ran for:** ~2 days live
- **Reason:** pivot (the whole thesis it tested is now wrong)
- **What we learned:** The reframe landed cleanly as copy but didn't move catalog hits from 0. It wasn't a landing-copy problem — the whole "skills marketplace for agents" thesis was broken. Five rounds of research confirmed agent skills aren't monetizable at clawmart's shape.

## H-002: `/.well-known/x402-catalog` mirror

- **Killed on:** 2026-04-20, pre-build
- **Ran for:** 0 ticks (never shipped)
- **Reason:** pivot
- **What we learned:** Well-known paths only matter if the catalog is the product. Under the new "agent workforce" thesis, the catalog is at `/agents`, not an x402 catalog.

## H-003: Pricing experiment on the 6 skills

- **Killed on:** 2026-04-20, pre-build
- **Ran for:** 0 ticks
- **Reason:** pivot
- **What we learned:** Pricing can't fix a product no one wants. Research showed the 6 skills are thin LLM wrappers with no moat.

## H-004: New x402 FX-rates skill

- **Killed on:** 2026-04-20, pre-build
- **Ran for:** 0 ticks
- **Reason:** pivot
- **What we learned:** Adding more skills worsens the problem the pivot is fixing. Exa/Firecrawl/Bright Data already own agent-callable data APIs at scale; we'd be the 100th FX-rate wrapper.

---

## Strategic kill: "skill marketplace for AI agents" — entire thesis

- **Killed on:** 2026-04-20
- **Research rounds:** 5 parallel Trend Researcher agents + 1 MCP ecosystem scan
- **Headline evidence:**
  - x402 organic daily volume ≈ $28K, average tx $0.20, ~50% wash trades (CoinDesk, Mar 2026)
  - 6 skills × 34 days live = 0 totalCalls, 0 USDC received
  - Every adjacent lane owned by better-capitalized incumbents (Modal $1.1B, Fireworks $4B, Vapi $20M, Bridge→Stripe $1.1B, Composio $29M)
  - MCP (97M installs) commoditizing agent-tool distribution before x402 does
  - Pivots tried in-session: skill marketplace → physical-actions bridge → MCP starter pack → agent runtime → **agent workforce marketplace** (current)
- **What the failed thesis taught us:** The "Walmart for agents" brand only works if agents are the PRODUCT being sold, not the BUYER. Clawmart sells *agents* to humans building an AI workforce, not *skills* to agents. That's the pivot.
