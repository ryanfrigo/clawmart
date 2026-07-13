# FLIP-TO-LIVE — Human Gate Checklist

Everything the code can't do for you to take clawmart from test mode to taking
real money. There is **no LLM pipeline** — a purchase is Stripe Checkout →
webhook → a gated pack download. So this checklist is just Stripe + the shared
secret, plus two optional niceties (reconcile + email).

Do (a) first — it's a prerequisite for checkout working at all. Then (b) is the
money step. (c) and (d) are optional. (e) verifies the whole thing.

- Convex **prod** env vars: `npx convex env set <NAME> <value> --prod`
- Vercel env vars: Vercel dashboard → Project → Settings → Environment
  Variables (or `vercel env add`), then redeploy so they're picked up.

---

## (a) SERVER_SHARED_SECRET — do this first

The shared secret that guards the public Convex entry points
(`purchases.createPending`, `purchases.attachStripeSession`). It must be the
**same** value in both Vercel and Convex, or checkout returns 500.

1. Generate: `openssl rand -hex 32`
2. Vercel → Environment Variables → add `SERVER_SHARED_SECRET` (Production; add
   to Preview too if you want preview deployments functional).
3. Convex prod: `npx convex env set SERVER_SHARED_SECRET <same value> --prod`
4. Redeploy the Vercel project so the new env is picked up.

Rotation: set a new value in both places, redeploy. In-flight requests during
the ~minute of skew fail safely (500s), nothing worse.

## (b) Stripe — live keys, live webhook, descriptor

1. **Live secret key** (Stripe dashboard, live mode → Developers → API keys):
   set `STRIPE_SECRET_KEY` = `sk_live_...` in Vercel (Production only — keep
   Preview on the test key). Redeploy.
2. **Live webhook endpoint** (Developers → Webhooks → Add endpoint), pointing
   at the **Convex prod** HTTP Actions URL — the `.convex.site` domain, NOT
   clawmart.co:
   - URL: `https://<prod-deployment>.convex.site/stripe/webhook`
     (Convex dashboard → prod deployment → Settings → URL & Deploy Key →
     "HTTP Actions URL")
   - Events — exactly these four:
     - `checkout.session.completed`
     - `checkout.session.async_payment_succeeded`
     - `checkout.session.async_payment_failed`
     - `checkout.session.expired`
3. Copy the endpoint's **signing secret** (`whsec_...`) and set it in Convex
   prod:
   ```sh
   npx convex env set STRIPE_WEBHOOK_SECRET whsec_... --prod
   ```
4. **Statement descriptor**: Stripe Settings → Business → Public details →
   statement descriptor = `CLAWMART.CO`. This account-level value is what
   shoppers' banks show — the checkout code intentionally does NOT set a
   per-payment descriptor (modern Stripe rejects it for card charges).
5. Confirm the 14-day refund policy wording is live on the site (it ships with
   the pack/checkout pages; just eyeball it).

## (c) Convex STRIPE_SECRET_KEY — optional reconcile backstop

Recommended. Set the live secret key in **Convex** prod too, so the reconcile
cron can recover any purchase whose webhook was lost (Stripe still retries for
~3 days, so this is belt-and-suspenders):

```sh
npx convex env set STRIPE_SECRET_KEY sk_live_... --prod
```

Without it, reconciliation is a no-op and you rely solely on Stripe's own
webhook retries. The webhook itself does **not** need this key — signature
verification only needs `STRIPE_WEBHOOK_SECRET`.

## (d) Resend — optional email delivery

Email is an enhancement, not a dependency — the success page shows the tokened
download URL prominently and tells the buyer to bookmark it. Skip at launch if
you want.

1. Resend dashboard → Domains → add `clawmart.co`; add the SPF/DKIM DNS records
   it gives you at your DNS host; wait for "verified".
2. Create an API key, then set it plus the app URL (used to build the link) in
   Convex prod:
   ```sh
   npx convex env set RESEND_API_KEY re_... --prod
   npx convex env set APP_URL https://clawmart.co --prod
   ```
3. No key set = no emails sent, everything else works.

## (e) Post-flip verification

**Stage 1 — prod infrastructure, Stripe still in TEST mode.** Before step (b),
with `STRIPE_SECRET_KEY` still `sk_test_...` on Vercel prod and a test-mode
webhook endpoint pointed at the Convex prod `.convex.site` URL:

1. On https://clawmart.co, open any pack → **Buy** → pay with test card
   `4242 4242 4242 4242` → redirected to `/purchase/<token>?paid=1`.
2. The purchase page flips to **paid**; click **Download** →
   `/api/download/<token>` serves `<slug>-clawmart.zip`. Unzip it and confirm
   the pack's skill folders + README are inside.
3. Confirm the gate: open `/api/download/<some-unpaid-or-bogus-token>` directly
   → it returns **403** (no zip). Paid links only.
4. Stripe dashboard (test mode) → Webhooks → endpoint shows the
   `checkout.session.completed` delivery with a **200**.

**Stage 2 — live mode, real money.** After step (b):

5. Self-purchase a pack with a real card on clawmart.co.
6. Verify: payment appears in Stripe live mode; webhook delivery 200; the
   purchase page flips to paid and the download works; email arrives if (d) is
   done; bank statement descriptor reads CLAWMART.CO.
7. Refund yourself (Stripe dashboard → Payments → refund, full amount) and
   confirm the refund succeeds. This proves the 14-day refund path you promise
   at checkout actually works end to end.

**Then:** fire the launch assets in `marketing/` (Ryan-only — the autopilot
never posts externally).
