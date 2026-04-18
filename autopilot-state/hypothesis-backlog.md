# Hypothesis backlog

Pending ideas the autopilot can pick from in the decide phase. Highest-scoring unblocked hypothesis wins. After a hypothesis ships, move it to `active-experiments.md`. After it's resolved, move it to `journal/` (win) or `graveyard.md` (kill).

Entry format:

```markdown
## H-NNN: <short title>

- **Category:** new-skill | pricing-change | landing-copy | seo | product-pivot | schema
- **Hypothesis:** <one falsifiable sentence>
- **Source:** <what research input generated this>
- **Test:** <change that ships> + <metric watched>
- **Effort:** <S ≤ 2h | M ≤ 6h | L > 6h>
- **Reversibility:** <high | med | low>
- **Expected signal window:** <48h | 1 week | 2 weeks>
- **Kill criteria:** <what result graveyards this>
```

---

## H-001: Landing copy — reposition as "buy-side for agents", not "skill marketplace"

- **Category:** landing-copy
- **Hypothesis:** Agent developers scanning the homepage in < 10s currently see "marketplace for AI skills" and bounce because it sounds crowded. If the headline reframes clawmart as "the API your agent uses when it needs something", catalog-fetch rate increases.
- **Source:** self-audit — current `src/app/page.tsx` leads with supply-side framing, but all 5 shipped skills + `/api/catalog` are demand-side.
- **Test:** Rewrite H1 + subhead on `src/app/page.tsx`. Watch `/api/catalog` request rate (Vercel logs) over 48h vs prior 48h.
- **Effort:** S
- **Reversibility:** high
- **Expected signal window:** 48h
- **Kill criteria:** catalog-fetch rate flat or down after 48h → reframe differently next tick

## H-002: Add `/api/catalog.json` mirror at a conventional path

- **Category:** seo
- **Hypothesis:** Agents discovering marketplaces often try `/.well-known/x402-catalog` or `/catalog.json` before `/api/catalog`. A static mirror at conventional paths increases discovery by crawler-style agents.
- **Source:** x402 spec convention + MCP `.well-known/mcp.json` analogy.
- **Test:** Add `src/app/.well-known/x402-catalog/route.ts` and `src/app/catalog.json/route.ts` that re-export `/api/catalog`. Watch for hits in the next 2 weeks.
- **Effort:** S
- **Reversibility:** high
- **Expected signal window:** 2 weeks
- **Kill criteria:** zero hits after 2 weeks → agents don't use well-known paths for this; remove.

## H-003: Price experiment — 2x the cheapest skill, halve the most expensive

- **Category:** pricing-change
- **Hypothesis:** Current prices (0.001–0.01 USDC) were chosen intuitively, not empirically. Pricing is the easiest-to-reverse traction lever. Bidirectional test: find the elasticity.
- **Source:** self-audit — no pricing iteration since launch.
- **Test:** Pick the current lowest-priced skill and 2x it; pick the current highest-priced skill and halve it. Watch `totalCalls` deltas over 7 days.
- **Effort:** S
- **Reversibility:** high (single-line change per route + Convex `pricePerCall` update)
- **Expected signal window:** 1 week
- **Kill criteria:** if the 2x'd skill drops > 50% AND the halved skill doesn't at least 1.5x, pricing isn't the lever — graveyard the whole pricing-axis for this quarter

## H-004: New x402 skill — real-time FX rates (proxy over exchangerate.host)

- **Category:** new-skill
- **Hypothesis:** Agents doing cross-border commerce, travel bookings, or payment routing need live FX rates. public-apis lists multiple free FX sources. We proxy with x402 billing — agents avoid key management, pay per lookup.
- **Source:** `/Users/ryanfrigo/dev/public-apis` — "Currency Exchange" category has 10+ free APIs, none with built-in x402.
- **Test:** Add `/api/x402/fx-rates` at $0.001/call. Watch for any paid calls in 7 days.
- **Effort:** M
- **Reversibility:** med (new route, new Convex doc)
- **Expected signal window:** 1 week
- **Kill criteria:** < 5 paid calls in the first 14 days → agents don't pay for this; graveyard.
