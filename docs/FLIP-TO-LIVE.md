# FLIP-TO-LIVE — Human Gate Checklist

Everything the code can't do for you. Work top to bottom; (d) and (f) are
prerequisites for everything else, so do them first if starting from zero.
Convex **prod** env vars are set with `npx convex env set <NAME> <value> --prod`;
Vercel env vars in the Vercel dashboard (Project → Settings → Environment
Variables) or `vercel env add`.

Reference env matrix: docs/BUILD-CONTRACT.md → "Environment matrix".

---

## (d) SERVER_SHARED_SECRET — do this first

The shared secret that guards the public Convex entry points (`checks.run`,
`reports.createPending`, `reports.attachStripeSession`). It must be the SAME
value in both places.

1. Generate: `openssl rand -hex 32`
2. Vercel → Environment Variables → add `SERVER_SHARED_SECRET` (Production;
   add to Preview too if you want preview deployments functional).
3. Convex prod: `npx convex env set SERVER_SHARED_SECRET <same value> --prod`
4. Redeploy the Vercel project so the new env is picked up.

Rotation: generate a new value, set it in both places, redeploy. In-flight
requests during the ~minute of skew will fail safely (500s), nothing worse.

## (f) DAILY_SPEND_LIMIT_USD — set before enabling live LLMs

Hard daily ceiling for the LLM circuit breaker. Spend is estimated flat at
$0.01/call; a $49 kit is ~360 calls ≈ $3.60 of budget, a free check ~20 calls
≈ $0.20.

```sh
npx convex env set DAILY_SPEND_LIMIT_USD 20 --prod
```

- `20` (default) ≈ ~5 kits + a healthy stream of free checks per day. Fine
  for launch.
- When the breaker trips, free checks return a graceful "at capacity" and
  paid pipelines pause (watchdog will refund-flag anything stuck > 45 min),
  so size it above your optimistic daily sales.
- Raise as sales grow (e.g. `50` after the first busy day). There is no
  auto-scale on purpose — this is the blast-radius cap on a runaway loop
  or a hug-of-death.

## (a) Vercel AI Gateway — unlock real LLM calls

1. **Add a payment card** in the Vercel dashboard → AI Gateway → Billing.
   This unlocks OIDC-authenticated gateway calls from the Vercel runtime
   (the free check's Next.js path needs nothing further).
2. **Create an API key**: AI Gateway → API Keys → create. This one is for
   the Convex fulfillment pipeline (OIDC doesn't exist there). Copy it once;
   don't paste it into files or chat.
3. Set it in Convex prod:
   ```sh
   npx convex env set AI_GATEWAY_API_KEY <key> --prod
   ```
4. Flip the pipeline to live mode:
   ```sh
   npx convex env set LLM_MODE live --prod
   ```
5. **Smoke-test the three contract models** (~6 tiny calls, cents at most):
   ```sh
   AI_GATEWAY_API_KEY=<key> node scripts/smoke-live-llm.mjs
   ```
   All three must print `ok`. If one fails with a 404-ish catalog error, the
   model id has drifted: pick the current equivalent in the gateway catalog
   and override via `npx convex env set MODEL_GROUNDED|MODEL_UNGROUNDED_1|MODEL_UNGROUNDED_2 <id> --prod`,
   then re-run the smoke script with the same overrides.

## (b) Stripe — live keys, live webhook, descriptor

1. **Live secret key** (Stripe dashboard, live mode → Developers → API keys):
   set `STRIPE_SECRET_KEY` = `sk_live_...` in Vercel (Production only —
   keep Preview on the test key). Redeploy.
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
   statement descriptor = `CLAWMART.CO` (the checkout code also sets it
   per-payment; the account-level value is the fallback shoppers' banks use).
5. Confirm the 14-day refund policy wording is live on the checkout page
   (it ships with the site; just eyeball it).

## (c) Resend — optional email delivery

Email is an enhancement, not a dependency — the success page shows the
tokened report URL prominently. Skip this at launch if you want.

1. Resend dashboard → Domains → add `clawmart.co`; add the SPF/DKIM DNS
   records it gives you at your DNS host; wait for "verified".
2. Create an API key, then:
   ```sh
   npx convex env set RESEND_API_KEY re_... --prod
   npx convex env set APP_URL https://clawmart.co --prod
   ```
3. Reports send from `reports@clawmart.co`. No key set = no emails sent,
   everything else works.

## (e) Post-flip verification

**Stage 1 — prod infrastructure, Stripe still in TEST mode.** Before step (b),
with `STRIPE_SECRET_KEY` still `sk_test_...` on Vercel prod and a test-mode
webhook endpoint pointed at the Convex prod `.convex.site` URL:

1. On https://clawmart.co: run a free check on a real domain → tier +
   findings render, disclaimer adjacent.
2. Buy the kit with test card `4242 4242 4242 4242` → redirected to
   `/report/<token>?paid=1` → progress → complete report with fix artifacts,
   transcripts, copy buttons.
3. Stripe dashboard (test mode) → Webhooks → endpoint shows the
   `checkout.session.completed` delivery with a **200**.

**Stage 2 — live mode, real money.** After step (b):

4. Self-purchase the $49 kit with a real card on clawmart.co.
5. Verify: payment appears in Stripe live mode; webhook delivery 200; report
   generates to `complete`; email arrives if (c) is done; bank statement
   descriptor will read CLAWMART.CO.
6. Refund yourself (Stripe dashboard → Payments → refund, full amount) and
   confirm the refund succeeds. This proves the refund path you're promising
   at checkout actually works end to end.
7. Check the Convex dashboard `spend` table recorded the run (~$3.60), and
   that the day's total is sanely below `DAILY_SPEND_LIMIT_USD`.

**Then:** fire the launch assets in `marketing/` (Ryan-only — the autopilot
never posts externally).
