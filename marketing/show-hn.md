# Show HN — Clawmart

Draft for Ryan to fire manually. Weekday morning, US-Eastern. HN is one shot and the
crowd rewards technical honesty over polish. Be in the thread all day. No marketing
voice — write like an engineer explaining a build.

---

## Title

HN titles should describe, not sell. Options (pick one, ≤80 chars):

- **`Show HN: Free tool that checks your brand's AI visibility and ships the fixes`**
- `Show HN: I sampled the models behind ChatGPT/Claude/Perplexity to score brand mentions`
- `Show HN: AI visibility check with Wilson intervals and full transcripts`

> Avoid "guaranteed", numeric-lift, or "how ChatGPT sees you" phrasings — also just
> bad HN form. The first option is the safest.

---

## Body

I kept getting the same question from founder friends: "when someone asks ChatGPT for
a tool in my category, do I come up?" The tools that answer it are mostly monitoring
dashboards on a $99–$500/mo subscription. I wanted something that (a) gave a one-time
answer and (b) actually generated the fixes. So I built Clawmart.

**What it does.** You enter a domain. The free check queries the models that power
ChatGPT, Claude, and Perplexity — via their APIs, not the consumer apps — across ~10
buyer-intent prompts and reports a tier (Invisible / Faint / Mixed / Visible). The
paid tier ($49, one-time) runs ~40 prompts × 3 model families × 3 repeats (~360 calls),
scores mention rate with a confidence interval, and generates paste-ready artifacts:
per-page JSON-LD, answer-capsule rewrites, an AI-crawler robots.txt, an FAQ draft, and
a comparison-page outline.

**The methodology, since that's the interesting part for this crowd:**

- **Sampling.** perplexity/sonar (search-grounded, returns citations) + two ungrounded
  models (openai/gpt-5.1, anthropic/claude-sonnet-5) run through Vercel's AI Gateway.
  Grounded and ungrounded results are labeled separately and never averaged together —
  "does the live-search layer cite you" and "is your brand in the model's parametric
  memory" are different questions with different fixes.
- **Uncertainty is first-class.** 40 prompts is a sample. Mention rate is reported as a
  Wilson score interval (z=1.96), not a bare percentage, and the free check never shows
  an integer at n≈10 — just a tier. I got tired of tools implying three-significant-digit
  precision from a handful of queries.
- **Evidence, not vibes.** Every score links to the full transcript: prompt text, model
  ID, timestamp, raw answer, and which competitors got mentioned. Mention detection is a
  word-boundary match on brand-name variants + domain (in `convex/lib/pure.ts`,
  unit-tested against IDN/unicode and boundary cases).
- **Deterministic E2E.** There's an `LLM_MODE=mock` path with canned, hash-keyed answers
  (deterministically mentions the brand ~1/3 of the time) so the whole funnel — free
  check → Stripe checkout → async fulfillment pipeline → report render → transcript
  appendix — runs end to end in CI with zero network and zero LLM spend. Same code path
  as live; only the completion function swaps.
- **Fulfillment.** Convex actions, ~5 prompts per self-scheduling chunk with bounded
  retries and partial-result persistence; a watchdog cron marks anything stuck >45min as
  failed and flags it for an automatic refund. There's a hard daily LLM spend breaker
  that returns "at capacity" rather than running up a bill.

**What's honestly hard / unsolved:**

- **The API ≠ the app.** I'm measuring the models via APIs. Real ChatGPT/Claude/Perplexity
  answers vary with web search, memory, personalization, location, and routing. I can't
  reproduce a specific user's session and I don't pretend to — the report says so next to
  every number, and that's exactly why the transcripts are there.
- **The fixes are hypotheses.** AEO/GEO is a young field; the evidence that JSON-LD or
  answer-capsule rewrites change citation behavior is emerging, not proven. So each
  artifact is tagged with a mechanism (grounded vs parametric) and an honest latency note
  ("affects search-grounded answers — weeks" vs "affects training — slow, not
  controllable"). No "guaranteed lift" claims anywhere; I'd rather under-promise.
- **Ground truth is the open problem.** There's no clean label for "did this fix move the
  needle" because the target is a moving, non-deterministic system across vendors. Right
  now the honest deliverable is a well-sampled baseline + mechanistically-plausible fixes
  + the receipts to re-measure yourself. If you have ideas on measuring causal lift here
  without a controlled corpus, I'm genuinely interested.

Stack: Next.js 16 on Vercel, Convex as source of truth + fulfillment runtime, Stripe
Checkout (guest, webhook verified inside Convex), Vercel AI Gateway for the LLM calls.

Free check needs no signup: https://clawmart.co — happy to answer anything about the
sampling, the scoring, or the parts I got wrong. Not affiliated with OpenAI, Anthropic,
or Perplexity.

---

## Notes for the thread (don't post; for Ryan)

- Expect "isn't this just prompting ChatGPT in a loop?" — yes, structured: fixed
  versioned prompt set, repeats for variance, grounded/ungrounded split, intervals,
  transcripts, then artifacts. That structure *is* the product. Say that plainly.
- Expect "API doesn't reflect the app." Agree immediately and point to the disclaimer +
  transcripts. Conceding this honestly is more credible than defending it.
- Expect "does any of this actually work?" Don't overclaim. "Emerging, not proven; here's
  the mechanism; re-measure with the transcripts." That answer wins HN respect.
- Don't link the $49 in the post body — let people find pricing on the site. HN dislikes
  a hard sell in a Show HN.
