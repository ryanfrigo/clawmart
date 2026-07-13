# Build Contract — Clawmart v2: Premium OpenClaw Skill Packs

Pivot from the AI-visibility product to **a curated storefront of premium skill packs for
OpenClaw** (the self-hosted personal AI assistant, github.com/openclaw/openclaw). Validated
market: builders make $600–$20k/mo selling OpenClaw skills; premium skills sell $10–$200;
the moat is vertical domain expertise. ClawHub is the free à-la-carte registry; clawmart
sells the assembled, ready-to-run, curated packs.

Catalog is pinned in `src/lib/packs.ts` (source of truth — do NOT change its shape). This
product has **no LLM pipeline** — a purchase is Stripe Checkout → webhook → deliver a gated
download. Much simpler than the prior build. Reuse the existing Stripe/Convex/Next patterns.

## Territories (disjoint — parallel tracks)

- **Track PACKS-{1..4}**: author `packs/<slug>/**` real skill-bundle content (one agent per pack)
- **Track A (backend)**: `convex/**`
- **Track B (UI)**: `src/app/**` except `src/app/api/**`; `src/components/**`; `next.config.ts`
- **Track C (glue/tests)**: `src/app/api/**`, `src/lib/**` (except packs.ts), `tests/**`, `scripts/**`, `docs/FLIP-TO-LIVE.md`, package.json

## Shared constants

- Currency USD. Prices from `src/lib/packs.ts` (`priceForSlug`). Bundle slug `all-access` $99; packs $39.
- Stripe apiVersion "2026-01-28.clover". Statement descriptor: account-level only (never per-PaymentIntent).
- Env (unchanged names where possible): Next.js — `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_APP_URL`,
  `STRIPE_SECRET_KEY`, `SERVER_SHARED_SECRET`. Convex — `STRIPE_WEBHOOK_SECRET`, `SERVER_SHARED_SECRET`,
  `APP_URL`, `RESEND_API_KEY` (optional). No AI_GATEWAY needed.

## Pack authoring (Tracks PACKS-1..4) — REAL, honest content

For each pack in `src/lib/packs.ts`, create `packs/<slug>/` containing:
- One folder per skill listed in the pack, each with a `SKILL.md` built to the OpenClaw
  AgentSkills format (see below). The skill folder name = the skill's `name`.
- A `README.md` — the setup guide: what the pack does, how to install (copy the skill folders
  into `~/.openclaw/skills` or `<workspace>/skills`, then start a new OpenClaw session),
  what to configure (channels, any tool creds the skills reference), and a short "how to use"
  with example trigger phrases. Honest tone: these are curated instruction bundles you adapt
  to your stack, not turnkey magic.
- An `openclaw.json.example` snippet if the pack benefits from config (optional).

**SKILL.md format (exact — from real OpenClaw skills):**
```markdown
---
name: <kebab-name matching the folder and packs.ts>
description: <one line, what it does + when to use>
metadata: { "openclaw": { "emoji": "<emoji>" } }
---

# <Skill Title>

<1-2 sentence what/why.>

## When to use (trigger phrases)

Use this skill when the user says:
- "<phrase>"
- "<phrase>"

## How it works

<Numbered steps the agent follows. Be specific and genuinely useful — this is the product.>

## Output

<What the agent returns / does. Include a concrete example.>

## Notes

<Caveats, what to configure, safety. Honest about external tools/creds the user must set up.>
```
Frontmatter parser requires **single-line** `metadata` JSON. Keep it valid.
Quality bar: each SKILL.md must be genuinely useful, specific, and coherent — real domain
expertise, not filler. This is what people pay for. ~80-200 lines each is right.

After authoring, Track C compiles `packs/<slug>/**` into `src/lib/pack-contents.ts` via
`scripts/build-pack-contents.mjs` (a map `{ [slug]: Array<{ path, content }> }`) so the
download route can serve a gated zip without exposing files publicly.

## Convex backend (Track A)

New schema (replace the reports/samples/checks/spend tables; keep `rateLimits`, `waitlist`):
```
purchases: {
  token: string,            // 32-hex, the delivery URL key (index by_token)
  slug: string,             // pack slug or "all-access"
  email?: string,
  status: "pending_payment" | "paid" | "failed",
  stripeSessionId?: string, // index by_stripe_session; idempotency
  stripePaymentIntentId?: string,
  amountUsd: number,
  createdAt: number, paidAt?: number,
}
```
Public API (all money mutations internal; only these public):
- `mutation reports? NO`. Instead:
  - `api.purchases.createPending({ slug, ipHash?, secret }) => { purchaseId, token }` — secret-guarded (SERVER_SHARED_SECRET), validates slug against a passed-in price? No — Track A cannot import src/lib/packs.ts (different tsconfig). So pass `amountUsd` and `title` from the Next.js checkout route (which imports packs.ts) INTO createPending; Convex stores them. Validate amountUsd is one of the allowed values [39, 99] to prevent tampering.
  - `api.purchases.attachStripeSession({ purchaseId, stripeSessionId, secret })`
  - `query api.purchases.getByToken({ token }) => { status, slug, amountUsd, createdAt, paidAt } | null` (never email/stripe ids)
  - `api.waitlist.join(...)` (keep as-is)
- HTTP router `convex/http.ts`: `POST /stripe/webhook` httpAction — verify with
  `constructEventAsync` + SubtleCrypto provider, `STRIPE_WEBHOOK_SECRET` from Convex env,
  idempotent by purchase status (pending_payment → paid only), handle
  `checkout.session.completed` (payment_status "paid") + `async_payment_succeeded` → markPaid;
  `async_payment_failed`/`expired` → markFailed. On markPaid, optionally send a Resend email
  with the delivery link (env-gated). Reuse the prior webhook structure.
- Add a rate-limit guard inside createPending keyed by ipHash (12/hr), like the prior build.
- `convex/crons.ts`: optional reconcile of stale pending_payment against Stripe (reuse prior
  pattern) if STRIPE_SECRET_KEY is set in Convex env; else no-op. Watchdog not needed (no pipeline).
- DELETE the AI-visibility Convex modules: checks.ts, crawler.ts, llm.ts, pipeline.ts, spend.ts,
  reports.ts, and convex/lib/pure.ts's report-specific exports (keep normalizeDomain? not needed —
  keep only what purchases/waitlist use; you may slim pure.ts to token + email + ip helpers).
  Update convex/http.ts, crons.ts accordingly. Run `npx convex codegen` if possible.

## Next.js API (Track C)

- `POST /api/checkout` { slug }: import packs.ts, resolve title+price (reject unknown slug 400),
  compute ipHash = sha256(ip + SERVER_SHARED_SECRET), `api.purchases.createPending({ slug,
  amountUsd, title, ipHash, secret })`, create Stripe Checkout Session (mode payment, card only,
  customer_creation always, line_items price_data unit_amount = amountUsd*100, name = title,
  metadata { purchaseId, token }, success_url `${APP}/purchase/${token}?paid=1`,
  cancel_url `${APP}/packs/${slug}?canceled=1`), attachStripeSession, return { url }. Map
  ConvexError rate_limited → 429.
- `GET /api/download/[token]`: query `api.purchases.getByToken`; if status !== "paid" → 402/403
  JSON. Else build a zip from `src/lib/pack-contents.ts` (use `jszip`) for the purchased slug
  (bundle "all-access" → all packs), stream with `Content-Disposition: attachment; filename="<slug>-clawmart.zip"`.
  noindex header. (Import pack-contents.ts, which Track C generates from packs/ — if it doesn't
  exist yet at build time, create a stub export `{}` so the build passes; the real one is generated.)
- `src/lib/stripe.ts` (keep the client), `src/lib/convex-server.ts` (keep). Add `jszip` dep.
- `scripts/build-pack-contents.mjs`: read `packs/<slug>/**` (all files), emit
  `src/lib/pack-contents.ts` exporting `PACK_FILES: Record<string, {path:string,content:string}[]>`.
  Add an npm `prebuild` script so it runs before `next build`. Make it tolerant of missing packs dir.
- Tests (vitest): slug/price validation, amount tampering guard, ipHash determinism, zip
  contains expected paths for a pack (using a small fixture), webhook idempotency helper.
- Update `docs/FLIP-TO-LIVE.md`: same Stripe steps (live keys + webhook at Convex .site) but
  drop all AI-gateway steps (no LLM). Add "Convex STRIPE_SECRET_KEY (optional, for reconcile)".

## UI (Track B)

FIRST invoke Skill `frontend-design`. Keep the dark theme + shadcn. Brand: clawmart 🦞, the
premium pack shop for OpenClaw. Reuse the existing `src/components/site/*` (nav, footer, logo)
and `src/components/ui/*`. Delete AI-visibility components/pages (report/*, home free-check,
methodology's AI-visibility content, etc.).

Pages:
- `/` homepage: hero — "Premium skill packs for OpenClaw. Make your assistant actually do the
  job." Sub: name OpenClaw (nominative; not affiliated), explain packs vs free ClawHub honestly.
  Featured pack grid (map PACKS), the All-Access bundle CTA, "how it works" (buy → download →
  drop into ~/.openclaw/skills → new session), honest FAQ (incl. "Isn't ClawHub free?" and
  "Can't I just write these myself?" — yes, but these are assembled, curated, and ready; 14-day
  refund), Organization + Product/OfferCatalog JSON-LD (REAL data from packs.ts only), a 40-60
  word answer capsule near top. A waitlist capture for "new packs" (api.waitlist.join).
- `/packs` catalog (all packs + bundle).
- `/packs/[slug]`: pack detail — outcome, who it's for, full skills list (what's inside), the
  free sample skill shown in full (from pack-contents if available, else a note), price, Buy
  button (POST /api/checkout), 14-day refund note, install-how-it-works. Product JSON-LD.
- `/purchase/[token]`: client, useQuery(api.purchases.getByToken). States: pending_payment
  ("payment processing…"), paid (Download button → /api/download/<token>, install instructions,
  "bookmark this link — it's your permanent download", waitlist), failed (this order didn't
  complete, nothing charged, link back). noindex.
- `/about` (what is OpenClaw + what clawmart is + non-affiliation), `/terms`, `/privacy`
  (adapt existing; guest email for delivery only). Keep/settle `/methodology`? Replace with
  `/about`. Update nav (Packs, Pricing anchor, About) + footer (non-affiliation:
  "Clawmart is an independent storefront and is not affiliated with or endorsed by OpenClaw.").
- next.config.ts redirects: old AI-visibility routes (/report/:path*, /methodology) → "/".
  robots.ts (allow AI bots; disallow /purchase/), sitemap.ts (/, /packs, each /packs/[slug],
  /about, /terms, /privacy).

## Wording (binding)

- Nominative use of "OpenClaw" only; state non-affiliation in the footer. No OpenClaw logos.
- No fabricated stats, testimonials, ratings, or counters. No "guaranteed results".
- Honest about what a pack is: curated, ready-to-install skill bundles built to the AgentSkills
  spec, with a setup guide; adapt to your stack; 14-day refund.
