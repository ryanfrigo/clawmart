# Local E2E Runbook — Free Check → $49 Fix Kit → Report

End-to-end test of the full funnel on your machine with **mock LLMs** (no
AI Gateway spend) and **Stripe test mode**. Everything below stays local
except the Convex dev deployment and Stripe test-mode API.

Prereqs: Node 20+, `npm install` done, [Stripe CLI](https://stripe.com/docs/stripe-cli)
installed and logged in to this project's Stripe account (`stripe login`),
Convex project linked (`npx convex dev` has run at least once).

## 1. Start Convex dev and set its env

Terminal 1:

```sh
npx convex dev
```

Leave it running (it also regenerates `convex/_generated` on change).

Terminal 2 — configure the dev deployment:

```sh
# Deterministic mock LLM path — identical code path, no network, no key needed.
npx convex env set LLM_MODE mock

# Shared secret guarding the public Convex entry points. Any value works
# locally, but it must MATCH the Next.js value in step 3.
npx convex env set SERVER_SHARED_SECRET dev-secret-123

# Generous local spend ceiling so the breaker doesn't trip mid-test.
npx convex env set DAILY_SPEND_LIMIT_USD 20
```

## 2. Forward Stripe webhooks to the Convex dev deployment

The webhook is a Convex **httpAction**, so events must go to the deployment's
**.convex.site** URL — not localhost, not the Next.js app.

Find the URL: take `NEXT_PUBLIC_CONVEX_URL` from `.env.local` (e.g.
`https://happy-otter-123.convex.cloud`) and replace `.convex.cloud` with
`.convex.site`. (Also shown in the Convex dashboard → Settings → URL & Deploy Key
as "HTTP Actions URL".)

Terminal 2:

```sh
stripe listen --forward-to https://<your-deployment>.convex.site/stripe/webhook
```

It prints a signing secret (`whsec_...`). Set it on the Convex dev deployment
(new terminal, or Ctrl-Z/bg dance):

```sh
npx convex env set STRIPE_WEBHOOK_SECRET whsec_...
```

Keep `stripe listen` running — its log of event ids is also how you'll do the
idempotency replay in step 6.

## 3. Start Next.js

`.env.local` needs:

```sh
NEXT_PUBLIC_CONVEX_URL=https://<your-deployment>.convex.cloud
NEXT_PUBLIC_APP_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_...        # test-mode key for this project
SERVER_SHARED_SECRET=dev-secret-123  # must match step 1
```

Terminal 3:

```sh
npm run dev
```

## 4. Browser flow — free check

1. Open http://localhost:3000.
2. Enter a real domain you don't mind crawling (e.g. your own) and run the
   free check.
3. Watch the live progress; expect a tier result (invisible / faint / mixed /
   visible), 2–3 teaser findings, the locked fix-kit preview, and the
   disclaimer adjacent to the tier.
4. Re-submit the same domain — it should return instantly (24h cache).
5. Rapid-fire different domains from the same browser until you see the
   rate-limit error (per-IP limit) — confirms the counter works.

## 5. Browser flow — purchase

1. Click the $49 buy CTA. You should land on Stripe Checkout (test mode).
   Confirm the one-line disclaimer and 14-day refund note appeared before
   this point.
2. Pay with the standard test card:
   - Card: `4242 4242 4242 4242`
   - Expiry: any future date · CVC: any 3 digits · ZIP: any
   - Email: an address you can check (or a throwaway)
3. You are redirected to `/report/<token>?paid=1`. The page should render
   the paid/generating state, then a progress bar advancing chunk by chunk
   (40 prompts; fast in mock mode).
4. When complete, verify the report renders: tier/scores with uncertainty
   bands and adjacent disclaimer, share-of-voice table, fix artifacts with
   working copy buttons, AEO audit checklist, and the transcript appendix
   (load more works; mock answers mention the brand ~1/3 of the time so
   scores are non-trivial).
5. In `stripe listen` output, confirm `checkout.session.completed` was
   forwarded and got a **200** from the Convex endpoint.

## 6. Idempotency replay

Grab the `checkout.session.completed` event id (`evt_...`) from the
`stripe listen` log, then resend it:

```sh
stripe events resend evt_...
```

Expected: the webhook returns 200 again, but nothing changes — in the Convex
dashboard the report is still `complete` (not restarted), `chunksDone` doesn't
reset, and no duplicate `samples` rows appear. The handler treats any
non-`pending_payment` status as a no-op.

You can also fire a synthetic event with no matching report — it must still
get a 200 (ignored), never a 5xx:

```sh
stripe trigger checkout.session.completed
```

## 7. Refund path

1. Force a failure: set the spend breaker to zero, then buy again
   (steps 5.1–5.2) for a *different* domain:

   ```sh
   npx convex env set DAILY_SPEND_LIMIT_USD 0
   ```

2. The pipeline should halt; either immediately (`failed`) or via the 15-min
   watchdog cron (`refund_flagged` for reports stuck > 45 min). To avoid
   waiting, you can also set the report's status by hand in the Convex
   dashboard to simulate the watchdog.
3. The report page must show the apology state: "we've flagged an automatic
   refund" + support mailto. No score fragments, no broken UI.
4. Issue the actual refund in the Stripe test dashboard (Payments → refund)
   and confirm it succeeds.
5. Reset the breaker: `npx convex env set DAILY_SPEND_LIMIT_USD 20`.

## 8. Wrap up

- `npm run test` (unit tests), `npm run lint`, `npm run build` — all green.
- Kill the three terminals. Dev-deployment env changes don't touch prod.
