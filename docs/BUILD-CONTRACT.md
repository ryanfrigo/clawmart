# Build Contract — Clawmart AI Visibility Fix Kit

Binding interface contract for the relaunch build. Three build tracks own DISJOINT paths.
If you need something outside your territory, code against this contract — do not edit
another track's files. The spec (product/trust/wording rules) is in docs/RELAUNCH-SPEC.md
and is binding; read it first.

## Territories

- **Track A (convex backend):** `convex/**` (schema.ts is already written — do not change
  field shapes; additive-only if truly needed)
- **Track B (web UI):** `src/app/**` EXCEPT `src/app/api/**`; plus `src/components/**`
- **Track C (glue/tests/docs):** `src/app/api/**`, `src/lib/**`, `tests/**`, `scripts/**`,
  `docs/FLIP-TO-LIVE.md`, package.json (vitest deps + scripts), vitest.config.ts

## Shared constants

- Product: "AI Visibility Fix Kit", **$4900 cents**, currency usd, per domain.
- Prompt set version: `"v1"`. Paid audit: 40 prompts x 3 models x 3 runs. Free check:
  10 prompts x 2 models x 1 run.
- Models (via Vercel AI Gateway `https://ai-gateway.vercel.sh/v1/chat/completions`).
  Defaults live in ONE constants block in `convex/llm.ts`, each overridable by Convex env
  (`MODEL_GROUNDED`, `MODEL_UNGROUNDED_1`, `MODEL_UNGROUNDED_2`) because gateway catalog
  drift is expected — scripts/smoke-live-llm.mjs verifies them:
  - `perplexity/sonar` → grounded: true (verified live on gateway)
  - `openai/gpt-5.1` → grounded: false (label "model knowledge, no live browsing")
  - `anthropic/claude-sonnet-5` → grounded: false (same label)
  - Free check uses the grounded model + MODEL_UNGROUNDED_1.
- Free-check tiers by grounded mention rate: 0 mentions → `invisible`; <20% → `faint`;
  20-60% → `mixed`; >60% → `visible`.
- Cost accounting (approx, for the circuit breaker): $0.01 per LLM call flat estimate.

## Environment matrix

Next.js (Vercel): `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_APP_URL`, `STRIPE_SECRET_KEY`,
`SERVER_SHARED_SECRET`.
Convex: `AI_GATEWAY_API_KEY`, `LLM_MODE` ("mock" | "live"), `STRIPE_WEBHOOK_SECRET`,
`SERVER_SHARED_SECRET`, `DAILY_SPEND_LIMIT_USD` (default "20"), `RESEND_API_KEY` (optional),
`APP_URL` (for links in emails).

## Convex public API (Track A implements; Tracks B/C consume)

All other functions MUST be `internal*`. Public surface is exactly:

```ts
// ACTION api.checks.run
// Guarded: args.secret must equal process.env.SERVER_SHARED_SECRET.
// Normalizes domain; returns cached checkId if fresh (<24h). Enforces per-IP
// (ipHash arg) and per-domain rate limits and the daily spend breaker.
// Kicks off crawl + sampling inline (single action, ~10 prompts x 2 models x 1 run),
// writes `checks` row progressively. Errors → status "failed" with safe message.
api.checks.run({ domain: string, ipHash: string, secret: string })
  => { checkId: Id<"checks">, cached: boolean } // or throws ConvexError("rate_limited" | "at_capacity" | "invalid_domain")

// QUERY api.checks.get — public read of a check row (safe fields only).
api.checks.get({ checkId: Id<"checks"> })
  => { status, tier?, brandName?, category?, competitors?, findings?, sampleCount?, mentionCount?, modelsUsed?, error?, createdAt } | null

// MUTATION api.reports.createPending
// Guarded by secret. Pre-creates the report BEFORE Stripe session creation.
// Copies brand/category/competitors from a fresh check when checkId given, else
// stores placeholders inferred later during generation. Generates 32-hex-char token
// (crypto.getRandomValues). prompts: [] at this stage; chunksTotal 0.
api.reports.createPending({ domain: string, checkId?: Id<"checks">, secret: string })
  => { reportId: Id<"reports">, token: string }

// MUTATION api.reports.attachStripeSession — guarded by secret; called by Next
// checkout route right after stripe session create.
api.reports.attachStripeSession({ reportId: Id<"reports">, stripeSessionId: string, secret: string }) => null

// QUERY api.reports.getByToken — the report page's data source. Returns null for
// unknown token. NEVER include stripe ids or email in the return.
api.reports.getByToken({ token: string })
  => { status, domain, brandName, category, competitors, promptSetVersion,
       chunksTotal, chunksDone, result?, createdAt, paidAt?, completedAt? } | null

// QUERY api.reports.samplesByToken — paginated transcript appendix.
api.reports.samplesByToken({ token: string, cursor?: string })
  => { page: Array<{ promptId, promptText, model, grounded, run, answer, brandMentioned, competitorsMentioned, citedUrls, createdAt }>, isDone: boolean, continueCursor: string }

// MUTATION api.waitlist.join — public; validates email format; dedupes by email.
api.waitlist.join({ email: string, source: string, domain?: string }) => { ok: true }
```

### HTTP router (Track A, convex/http.ts)

`POST /stripe/webhook` httpAction:
- Verify with `stripe.webhooks.constructEventAsync(body, sig, process.env.STRIPE_WEBHOOK_SECRET)`
  (async variant — required in Convex's runtime; import Stripe from "stripe" works in httpActions).
- `checkout.session.completed` (payment_status === "paid") and
  `checkout.session.async_payment_succeeded`: look up report by
  metadata.reportId; if status is "pending_payment" (idempotency: any other status → 200 no-op),
  set status "paid", store email + paymentIntent, then schedule
  `internal.pipeline.start(reportId)` via ctx.scheduler.runAfter(0, ...).
- `checkout.session.async_payment_failed` / `checkout.session.expired`: mark failed.
- Always 200 on handled/ignored types; 400 only on bad signature.

### Pipeline (Track A, internal)

- `internal.pipeline.start`: crawl domain ("use node" action; SSRF guard from lib/pure.ts;
  respect robots.txt; timeout 10s; cap 500KB, strip to text ≤ 20K chars). Infer
  brand/category/competitors + generate 40 prompts (LLM, or deterministic fixtures in mock
  mode). Persist prompts, chunksTotal = 40, status "generating". Schedule processPrompt(0).
- `internal.pipeline.processPrompt(reportId, promptIndex)`: run that prompt across
  3 models x 3 runs (9 calls, parallel Promise.allSettled), write `samples` rows
  (mention detection via lib/pure.ts), increment chunksDone, record spend, schedule next
  prompt. On chunk error: attempts += 1; retry same chunk up to 3 times (delay 30s);
  after 3 → status "failed" + error.
- `internal.pipeline.finalize`: compute scores (Wilson intervals via lib/pure.ts),
  share-of-voice, generate fix-kit artifacts (LLM: JSON-LD per key page from crawl,
  answer-capsule rewrites, robots.txt block, FAQ draft, comparison-page outline —
  each artifact: { id, title, mechanism: "grounded" | "parametric", latencyNote, body,
  pasteTarget }), write result, status "complete", send email if RESEND_API_KEY set
  (fetch to https://api.resend.com/emails, from "reports@clawmart.co").
- `crons.ts`: every 15 min — reports stuck in "paid"/"generating" > 45 min → status
  "refund_flagged" + error; daily spend row cleanup (keep 30 days).

### LLM client (Track A, convex/llm.ts)

`llmComplete({ model, prompt, maxTokens })` → { text, citedUrls: string[] }.
- LLM_MODE=mock: deterministic canned answers keyed by hash(prompt+model) — MUST mention
  the brand for ~1/3 of prompts (deterministically) so E2E scores are non-trivial; includes
  fake citations for sonar. NO network.
- live: fetch gateway with AI_GATEWAY_API_KEY; for perplexity/sonar collect citations from
  the response (`citations` field or annotations); 60s timeout; throw typed errors.
- Every call: `internal.spend.record` (mutation) with $0.01; check breaker BEFORE batches,
  not per-call.

## Pure logic (Track A writes at `convex/lib/pure.ts`; Track C unit-tests it)

Plain TypeScript, NO convex imports, so vitest can import directly:
- `normalizeDomain(input: string): string | null` — accepts URL or bare domain; lowercases,
  strips scheme/path/www; rejects invalid/localhost/IP-literals; returns apex+sub as given
  (keep subdomain if provided, just strip www).
- `isSafeUrl(url: string): boolean` — http/https only; hostname not localhost/.local/
  .internal; not IP-literal in private/link-local/loopback ranges (v4 + v6).
- `detectMention(answer: string, brandName: string, domain: string): boolean` — word-boundary
  match on brand name (case-insensitive, allow spaces/hyphens variants) OR domain mention.
- `detectCompetitors(answer: string, competitors: string[]): string[]`
- `wilsonInterval(successes: number, n: number): { low: number, high: number, point: number }`
  (z=1.96, returns 0..1 floats)
- `tierFor(mentions: number, samples: number): "invisible"|"faint"|"mixed"|"visible"`
- `checksumToken(): string` — 32 hex chars via crypto.getRandomValues.
- Types: `CrawlResult`, `ReportResult`, `FixArtifact`, `ScoreBlock` — export from here;
  Tracks B/C import types from `convex/lib/pure.ts`.

`ReportResult` shape (binding for Track B rendering):
```ts
{
  promptSetVersion: string,
  measuredAt: number,
  models: Array<{ id: string, grounded: boolean, samples: number, mentions: number,
                  interval: { low: number, high: number, point: number } }>,
  overall: { grounded: ScoreBlock, ungrounded: ScoreBlock }, // ScoreBlock = { samples, mentions, interval }
  shareOfVoice: Array<{ name: string, mentions: number, isYou: boolean }>,
  topFindings: string[],           // 3-6 plain-english findings
  fixes: FixArtifact[],            // ordered by priority
  aeoAudit: Array<{ id: string, label: string, pass: boolean, detail: string }>,
  methodologyNote: string,         // the binding disclaimer text w/ model ids + date
}
// FixArtifact = { id, title, mechanism: "grounded"|"parametric", latencyNote, body, pasteTarget, priority: number }
```

## Next.js API (Track C)

- `POST /api/check` { domain } → per-IP hash (sha256 of ip + salt SERVER_SHARED_SECRET),
  call api.checks.run via ConvexHttpClient. 200 { checkId } | 429 { error:"rate_limited" } |
  503 { error:"at_capacity" } | 400 { error:"invalid_domain" }.
- `POST /api/checkout` { domain, checkId? } → reports.createPending → stripe
  checkout.sessions.create({ mode:"payment", payment_method_types:["card"],
  customer_creation:"always", line_items:[{ price_data:{ currency:"usd",
  product_data:{ name:"AI Visibility Fix Kit — <domain>" }, unit_amount:4900 }, quantity:1 }],
  metadata:{ reportId, token }, payment_intent_data:{ statement_descriptor:"CLAWMART.CO" },
  success_url:`${APP_URL}/report/${token}?paid=1`, cancel_url:`${APP_URL}/?canceled=1` })
  → attachStripeSession → 200 { url }.
  NOTE success_url goes STRAIGHT to the tokened report page (it renders pending state).
- `src/lib/convex-server.ts`: ConvexHttpClient factory reading NEXT_PUBLIC_CONVEX_URL.
- `src/lib/stripe.ts`: rewrite to just the client (keep apiVersion "2026-01-28.clover").

## UI routes (Track B)

- `/` — hero: "Is your brand invisible to AI?" + domain input → POST /api/check → live
  progress (Convex useQuery on checks.get) → tier result + teaser findings + locked fix-kit
  preview + $49 buy CTA (POST /api/checkout) + waitlist capture. Include the adjacent
  disclaimer under the tier result (spec wording). Pricing section, how-it-works, honest FAQ.
- `/report/[token]` — client component w/ useQuery(reports.getByToken): pending_payment /
  paid / generating (progress bar chunksDone/chunksTotal) / complete (full report: scores w/
  intervals + disclaimer adjacent, share-of-voice table, fix artifacts w/ copy buttons,
  AEO audit checklist, transcript appendix via samplesByToken w/ load-more, methodology
  link, waitlist box, refund note) / failed|refund_flagged (apology + "we've flagged an
  automatic refund" + support mailto). noindex via metadata + X-Robots-Tag.
- `/methodology` — public: scoring formula, prompt-set v1 description + changelog, model
  list, limitations, the "emerging, not proven" line.
- `/terms`, `/privacy` — plain, honest, solo-founder-appropriate.
- Layout: strip ClerkProvider (guest-only v1); keep ConvexProvider (needed for useQuery);
  nav: logo, Methodology, Pricing (#pricing), footer with non-affiliation line.
  Delete src/proxy.ts (no middleware needed).
- Redirects for dead routes in next.config.ts: /skills, /docs, /credits, /agents/:path*,
  /categories/:path*, /dashboard/:path*, /onboard, /sign-in, /sign-up → "/" (permanent:false).
- robots.ts: allow all incl. GPTBot/PerplexityBot/ClaudeBot explicitly; disallow /report/.
  sitemap.ts: /, /methodology, /terms, /privacy only.
- SEO/AEO: 40-60-word answer capsule at top of /, FAQPage + Organization JSON-LD (REAL data
  only), question-form H2s. NO fabricated stats/logos/testimonials anywhere.
- Design: keep the existing dark theme + shadcn components (src/components/ui/*). Distinctive,
  production-grade; avoid generic AI-slop layouts. Brand: Clawmart 🦞 — the claw grabs your
  brand out of the AI ocean; tasteful, not clownish.

## Wording (binding, both tracks)

Follow docs/RELAUNCH-SPEC.md "Trust & wording". The mandatory disclaimer template:
"Measured {date} via provider APIs using {model ids}, {N} runs per prompt. Answers in the
ChatGPT/Claude/Perplexity consumer apps can differ due to web search, memory,
personalization, location, and model routing. This estimates model behavior; it is not a
recording of any real user's session."
Banned phrases: "guaranteed", "will improve", "get recommended by ChatGPT", numeric lift
claims, "rank #1 in AI search". Nominative use only; no provider logos.

## Tests (Track C)

- vitest for convex/lib/pure.ts (all functions, edge cases: IDN/unicode domains, IPv6
  literals, redirect-target checks are Track A's runtime concern), webhook idempotency
  decision table (pure helper if Track A exposes one), tier boundaries, Wilson known values.
- scripts/e2e-local.md: step-by-step runbook (npx convex dev; LLM_MODE=mock in Convex dev env;
  stripe listen --forward-to <convex-site-url>/stripe/webhook; npm run dev; browser steps;
  stripe trigger checkout.session.completed replay for idempotency test).
- scripts/smoke-live-llm.mjs: 2-prompt real-gateway sanity check (reads AI_GATEWAY_API_KEY
  from env; NEVER prints it).
