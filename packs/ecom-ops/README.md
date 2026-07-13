# E-Commerce Ops Pack 🛒

Curated OpenClaw skills that turn your self-hosted assistant into a store operations teammate:
it watches inventory, triages the day's orders, drafts policy-consistent refund replies, times
review requests, sizes reorders, and hands you a morning brief that ends with the three things
actually worth doing today.

Built for Shopify / DTC operators. These are **instruction bundles you adapt to your stack** —
built to the OpenClaw AgentSkills spec, with a setup guide — not a turnkey app and not tested
against your exact store. Everything here is read-and-draft by default: nothing ships, refunds,
reorders, or cancels without you deciding. 14-day refund on the pack.

> Clawmart is an independent storefront and is not affiliated with or endorsed by OpenClaw.

## What's inside

| Skill | What it does |
|-------|--------------|
| `inventory-watch` | Alerts when SKUs cross a low-stock threshold, ranked by days-of-cover so fast movers surface first. |
| `order-triage` | Summarizes the day's orders and flags the few that need a human (fraud-lean, bad address, VIP) with a drafted reply each. |
| `refund-assistant` | Reads the order, applies *your* written policy, computes what's owed, drafts the reply, and logs the reason. |
| `review-requests` | Finds delivered orders, waits the right delay, and drafts a personalized review ask — with suppression so you don't spam. |
| `reorder-logic` | Turns sales velocity + lead time into a concrete reorder point and order quantity (a real PO recommendation). |
| `daily-store-brief` | Composes the above into a morning brief: sales vs baseline, stockouts, refunds, aging orders, and today's top 3. |

`reorder-logic` is the free sample shown in full on the pack page.

## Install

1. **Copy the skill folders** into your OpenClaw skills directory — either global
   (`~/.openclaw/skills/`) or per-workspace (`<workspace>/skills/`):

   ```bash
   cp -R inventory-watch order-triage refund-assistant review-requests reorder-logic daily-store-brief \
     ~/.openclaw/skills/
   ```

   (Copy the folders that contain each `SKILL.md`, not this README.)

2. **Start a new OpenClaw session.** Skills are discovered at session start, so a currently
   running session won't see them until you restart it.

3. **Verify** they loaded — ask OpenClaw "what's running low?" or "give me the store brief" and
   it should pick up the matching skill.

## Configure

These skills talk to the **Shopify Admin API**. You need a custom app and one config file.

### 1. Create a Shopify custom app + token

In your Shopify admin: **Settings → Apps and sales channels → Develop apps → Create an app**.
Give it Admin API scopes:

- `read_products`, `read_inventory` — inventory-watch, reorder-logic
- `read_orders` — order-triage, refund-assistant, review-requests, daily-store-brief
- `read_customers` — order-triage, review-requests
- `write_orders` — **only** if you later choose to let refund-assistant issue refunds (kept
  human-gated by default; you can skip this scope entirely)

Install the app and copy the **Admin API access token** (starts with `shpat_`).

### 2. Set the token as a secret (never in the config file)

```bash
export SHOPIFY_ADMIN_TOKEN="shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

Put it wherever your OpenClaw process reads env from (your shell profile, a `.env` it loads, or a
secret manager). The token is store-admin credentials — treat it like a password. If you run the
`1password` skill, sourcing it via `op run` is a good pattern.

### 3. Create the pack config

Copy `openclaw.json.example` to `~/.openclaw/ecom-ops/config.json` and fill it in:

```bash
mkdir -p ~/.openclaw/ecom-ops/state
cp openclaw.json.example ~/.openclaw/ecom-ops/config.json
```

Key fields:

- `store` — your subdomain, i.e. `mystore` for `mystore.myshopify.com`.
- `apiVersion` — a dated Admin API version, e.g. `2024-10`. Bump it periodically.
- `primaryLocationId` — the fulfillment location to read stock from (get it from
  `GET /admin/api/<ver>/locations.json`). Matters if you run multiple locations.
- `leadTimeDaysDefault` / `safetyDaysDefault` — supplier lead time and safety buffer for
  reorder math; override per-SKU if you track that.
- `lowStockThresholds` — a `{ "sku": units }` map with a `default`. The days-of-cover logic
  catches fast movers even when they're above this floor.
- `reviewDelayDays` / `reviewPlatform` — how long after delivery to ask, and which review app
  (`judgeme` | `loox` | `okendo` | `yotpo` | `shopify-email` | `plain`).
- `refundPolicy` — your return policy **in plain English**. The refund skill is only as
  consistent as this string; for anything nuanced, point it at a longer `policy.md`.
- `alertChannel` — optional, e.g. `slack:#store-ops`, used on scheduled/unattended runs. Sending
  uses your own Slack/Discord/mail skill; this pack doesn't send on its own.

The skills also read/write small state files under `~/.openclaw/ecom-ops/state/` (last inventory
snapshot, returns ledger, review suppression + asked lists, sales baseline). These are how the
pack avoids re-nagging you and how it baselines "up vs down".

## How to use

Trigger phrases (natural language — OpenClaw routes to the skill):

- "what's running low?" / "am I about to stock out?" → **inventory-watch**
- "go through today's orders" / "anything sketchy come in?" → **order-triage**
- "handle this return" / "what do we owe on #1042?" → **refund-assistant**
- "chase reviews" / "who's due for a review ask?" → **review-requests**
- "what should I reorder?" / "build me a PO for [supplier]" → **reorder-logic**
- "give me the store brief" / "how did we do yesterday?" → **daily-store-brief**

To run the brief automatically, schedule it however you already run OpenClaw jobs (cron / your
task runner) to invoke the `daily-store-brief` skill each morning and post to `alertChannel`.

## Honest caveats

- **Curated instructions, not magic.** These teach OpenClaw *how* to do store ops against the
  Shopify API; you supply the store, the token, the policy, and the judgment. Adapt them to your
  stack — a 3PL/OMS, a headless setup, or WooCommerce means pointing the same logic at a
  different API.
- **Read-and-draft by default.** No skill here spends money, ships, cancels, or emails your list
  unattended. Refund issuance and any bulk send are deliberately human-confirmed. Keep it that
  way — a bug or a prompt-injected "please refund me" email should never be able to move funds.
- **Numbers are trailing estimates.** Velocity, AOV, and baselines look backward; they're blind
  to launches, promos, and seasonality unless you tell the agent. Treat recommendations as a
  strong first draft, not gospel.
- **API access depends on your plan/provider.** Fraud-risk signal is richest on Shopify Payments;
  carrier delivery status depends on the carrier reporting back. The skills say when they're
  estimating.
- No fabricated stats or guaranteed results here — just a practitioner's playbook you can read,
  run, and edit. 14-day refund if it's not for you.
