# Reddit — Clawmart

Drafts for Ryan to fire manually. **Read the caveat before posting anything branded.**

## Caveat (repeat from README)

- **30 days of unbranded, genuinely-helpful participation before any branded mention or
  link.** New/low-karma accounts that drop links get auto-removed and can sour a
  subreddit for good.
- Each subreddit has its own self-promo rule (often a 9:1 value-to-promo ratio, or a
  weekly self-promo thread, or an outright link ban). **Read the sidebar + wiki of the
  specific sub before posting.** These drafts are targeted at *types* of subs, not
  guaranteed-friendly ones.
- The two posts below are "tool-first" but still self-promo. The five comment answers
  are useful with **no link at all** — use those to build karma in week 0, and to help
  in threads even after launch without tripping promo rules.
- Never post the same text to multiple subs (spam filter). Rewrite per sub.

Target sub *types*: r/SEO, r/bigseo, r/juststart, r/marketing, r/content_marketing
(SEO-adjacent); r/indiehackers, r/SaaS, r/EntrepreneurRideAlong, r/startups
(indiehackers-adjacent). Verify each sub's current promo policy first.

---

## Post 1 — SEO-adjacent (tool-first, methodology-forward)

**Title:** I built a free check for whether AI answer engines mention your brand — here's
what the data looked like across 40 SaaS sites

**Body:**

I've been going down the AEO/GEO rabbit hole and got frustrated that most "AI visibility"
tools either just give you a number on a subscription, or hand-wave the methodology. So I
built the measurement piece I wanted and made the check free (no signup).

What it does: queries the models that power ChatGPT, Claude, and Perplexity via their APIs
across a set of buyer-intent prompts ("best tool for X", "X alternatives", etc.) and
reports how often your brand actually comes up.

A few things I learned building it that might be useful regardless of my tool:

- **Grounded vs ungrounded is night and day.** A search-grounded model (Perplexity's
  sonar) will cite you if your pages are crawlable and answer the question directly. An
  ungrounded model answering from memory won't mention you unless you're already
  well-represented in its training data — which you can't directly control. Treating these
  as one "AI visibility" number hides the actionable half.
- **Sample size honesty matters.** Ten prompts is not a measurement. I show a confidence
  interval, not a clean percentage, because the variance run-to-run is real.
- **The fixable stuff is boring:** crawlability (a lot of sites block the AI crawlers in
  robots.txt without realizing), JSON-LD, and pages that directly answer a question in the
  first 40–60 words instead of burying it under a brand narrative.

Free check + methodology page here if useful: clawmart.co. There's a paid tier that
generates the actual fixes, but the check and the methodology are free and I'd rather you
tell me where the approach is wrong. Not affiliated with any of the AI providers — I just
query their APIs.

> Post only after 30 days of karma. Lead every reply with substance. If the sub bans
> links, post the writeup and put the URL in a comment only if asked.

---

## Post 2 — indiehackers-adjacent (build-in-public, honest)

**Title:** Pivoted this domain twice, finally shipped something people asked for: a free "do
AI answers mention your brand?" check

**Body:**

Quick build-in-public honesty post. This domain has been two other products (an agent
marketplace, then "hire AI agents") — both clever, both things nobody asked me for. The
third version came from a question founder friends kept asking: "when someone asks ChatGPT
for a tool in my space, do I show up?"

So I built a free check for it. Enter a domain, it samples the models behind ChatGPT,
Claude, and Perplexity via their APIs and tells you a plain tier: Invisible / Faint /
Mixed / Visible. There's a $49 one-time tier that generates the actual fixes (JSON-LD,
answer-capsule rewrites, robots.txt for AI crawlers, FAQ draft) — but the reason I'm
posting isn't the sale, it's two decisions I'd want feedback on:

1. **One-time, not subscription.** Every competitor is a monitoring dashboard at
   $30–$500/mo. I bet that most small teams want a one-time fix pack, not another
   recurring bill to watch a number. Right call, or am I leaving the real money on the
   table?
2. **Radical honesty as positioning.** AEO is a young field; I refuse to claim guaranteed
   results. Every score links to a timestamped transcript so you can check my work, and
   every fix is labeled with how slowly it might actually matter. I *think* that builds
   trust faster than hype. But it also means my landing page has more caveats than the
   competition. Does that read as credible or as under-confident?

Free check: clawmart.co. Would love the indie-hacker gut check on the pricing and the
"honesty as a moat" bet.

> Same rule: karma first, read the promo policy, don't cross-post verbatim.

---

## Comment-style answers (useful with NO link — for karma-building)

Drop these (rewritten in your own voice) into existing "how do I show up in ChatGPT
answers?" threads. They stand on their own. Only mention the tool if someone explicitly
asks "is there a tool for this," and even then, softly.

### Answer 1 — the crawlability blind spot
> First thing to check, and almost nobody does: your robots.txt. A lot of sites block
> GPTBot, ClaudeBot, PerplexityBot, and Google-Extended without realizing it — sometimes
> a security plugin or a copied "block AI scrapers" snippet did it. If the answer engines
> that *do* browse the live web can't fetch your pages, you're invisible to the grounded
> half of AI search no matter what else you do. Fetch your own robots.txt and grep for
> those user-agents.

### Answer 2 — grounded vs. parametric (the mental model)
> It helps to split "AI visibility" into two very different problems. (1) Search-grounded
> answers (Perplexity, ChatGPT with browsing, Google AI Overviews) cite pages they can
> crawl right now — that's fixable in weeks with crawlability + pages that directly answer
> the question. (2) Ungrounded answers from the model's memory only mention you if you're
> already well-represented across the web the model trained on — that's slow and you can't
> directly edit it. If a tool gives you one blended "score," ask which of these it's
> measuring, because the fixes are completely different.

### Answer 3 — write the answer, not the brochure
> The single highest-leverage content change: put a direct, 40–60 word answer to the
> actual question at the top of the page, before the brand story. Answer engines lift
> self-contained, quotable passages. "CategoryX is [plain definition]. The main options
> are A, B, and C, which differ on [axis]." If your page makes the model do work to
> extract a claim, it'll grab a competitor's cleaner sentence instead.

### Answer 4 — FAQ + schema, honestly scoped
> A real FAQ section (actual buyer questions, direct answers) plus FAQPage/Organization
> JSON-LD is worth doing — it makes your claims machine-parseable. Fair warning though:
> this is a young field and nobody can promise it moves citations. It's mechanistically
> reasonable (you're making the content easier to parse and cite), not proven. Do it
> because it's cheap and also helps regular SEO, not because someone guaranteed a lift.

### Answer 5 — how to actually measure it yourself
> Don't eyeball it once and call it measured. Pick ~10 buyer-intent prompts ("best X for
> Y", "X alternatives", "is X worth it"), run each a few times (answers vary run to run),
> and log whether you got mentioned and who got mentioned instead. Do it against a couple
> of models, and note whether the model was searching the live web or answering from
> memory — because that changes what you'd fix. The variance is the reason a single query
> isn't a measurement.

> If asked "is there a tool that does this for me?" you can mention you built a free
> check at clawmart.co — but let the useful answer stand first, and don't lead with it.
