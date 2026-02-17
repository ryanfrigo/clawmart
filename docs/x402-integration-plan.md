# x402 Integration Plan — ClawMart

> Written: 2026-02-16 | Status: Draft

## Current State

- **clawmart.co** is live (HTTP 200), hosted on Vercel
- Homepage describes the x402 vision: "The marketplace for agent skills" with USDC micropayments
- **Convex backend** is connected and running (`doting-anteater-390.convex.cloud`)
- Landing page is up but the marketplace is not yet functional (no real skill registry or payment flow)

## What is x402?

x402 is Coinbase's open payment protocol that revives the HTTP 402 status code for programmatic payments:

1. **Agent calls an API endpoint** (e.g., `POST /skills/summarize`)
2. **Server returns 402** with a `PAYMENT-REQUIRED` header containing price, accepted token (USDC), and chain (Base or Solana)
3. **Agent signs a payment** and resends the request with a `PAYMENT-SIGNATURE` header
4. **Facilitator verifies & settles** the payment onchain; server returns the result

Key properties:
- No accounts, no KYC, no API keys — just HTTP + crypto signatures
- USDC on Base (EIP-155:8453) or Solana
- Coinbase-hosted facilitator handles settlement (free tier: 1,000 tx/month)
- TypeScript & Go SDKs available (`@coinbase/x402`)

## ClawMart x402 Architecture

```
┌──────────────┐     HTTP 402 flow     ┌──────────────┐
│  Buyer Agent │ ◄──────────────────► │  ClawMart    │
│  (any AI)    │                       │  API Gateway │
└──────────────┘                       └──────┬───────┘
                                              │
                              ┌───────────────┼───────────────┐
                              │               │               │
                        ┌─────▼─────┐   ┌─────▼─────┐  ┌─────▼─────┐
                        │ Skill A   │   │ Skill B   │  │ Skill C   │
                        │ (Seller)  │   │ (Seller)  │  │ (Seller)  │
                        └───────────┘   └───────────┘  └───────────┘
                                              │
                                     ┌────────▼────────┐
                                     │ CDP Facilitator  │
                                     │ (settlement)     │
                                     └─────────────────┘
```

## Implementation Plan

### Phase 1: Skill Registry (1-2 days)
- **Convex schema:** `skills` table — `name`, `description`, `endpoint`, `priceUsdc`, `ownerWallet`, `category`, `status`
- **API routes:** CRUD for skills (list, get, create, update)
- **Frontend:** Browse/search skills page, skill detail page, "List your skill" form
- No payments yet — just the registry

### Phase 2: x402 Payment Gateway (2-3 days)
- Install `@coinbase/x402` SDK (server + client libs)
- **Proxy endpoint** (`/api/skills/[id]/call`):
  1. Buyer agent hits this endpoint
  2. Gateway returns 402 with payment details (price from registry, seller wallet)
  3. Buyer signs payment, resends with `PAYMENT-SIGNATURE`
  4. Gateway verifies via CDP Facilitator
  5. Gateway proxies the call to the seller's actual endpoint
  6. Returns result to buyer
- Register with Coinbase CDP for facilitator access
- Store transaction logs in Convex (`transactions` table)

### Phase 3: Agent Wallet & SDK (1-2 days)
- Provide a simple JS/Python SDK: `clawmart.call("skill-slug", { input })` that handles the 402 flow automatically
- Document how buyer agents set up a Base wallet with USDC
- Example: "Call a summarization skill for $0.01 per request"

### Phase 4: Discovery & Trust (1-2 days)
- Skill ratings/reviews (stored in Convex)
- Usage stats (call count, uptime)
- x402 Bazaar extension for cross-platform discovery
- Featured/verified skills

### Phase 5: Revenue Model
- ClawMart takes a small platform fee (e.g., 5%) on each transaction
- Implemented as a fee split in the payment flow (ClawMart wallet receives % before forwarding to seller)

## Key Decisions Needed
1. **Base vs Solana vs both?** — Start with Base (Coinbase ecosystem, lower friction)
2. **Proxy vs direct?** — Proxy through ClawMart (enables fee collection + analytics) vs direct peer-to-peer
3. **CDP facilitator vs self-hosted?** — Start with CDP hosted (free tier), self-host later if needed
4. **Auth for sellers?** — Clerk for seller dashboard, no auth for buyer agents (that's the point)

## Dependencies
- Coinbase CDP account + facilitator API access
- `@coinbase/x402` npm packages
- USDC on Base testnet for development
- Convex already running ✅

## Quick Start (Next Steps)
1. `npm install @coinbase/x402-server @coinbase/x402-client`
2. Define Convex `skills` schema
3. Build skill registry CRUD + UI
4. Implement first 402 proxy endpoint
5. Test with a dummy skill (echo service, $0.001/call)
