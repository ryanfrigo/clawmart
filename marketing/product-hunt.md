# Product Hunt launch — Clawmart

Draft for Ryan to fire manually. Launch at 00:01 PT. Be in the comments all day.

---

## Name
**Clawmart — AI Visibility Fix Kit**

## Tagline (≤60 chars)
Primary (54): **Is your brand invisible to AI? Check free, then fix it**

Alternates:
- (52) `Check your brand's AI visibility, then ship the fixes`
- (57) `Free AI visibility check that hands you the fixes, not a score`
- (49) `See if AI answers mention you — then fix the gaps`

> Wording check: all four are question/observation form, no banned phrases, no
> "how ChatGPT sees you" declarative.

## Topics / categories
Marketing, SEO, Artificial Intelligence, Growth Hacking, Developer Tools (pick the
3 PH allows; lead with SEO + Artificial Intelligence).

## Links
- Website: `https://clawmart.co`
- Pricing: free check, then **$49 one-time** Fix Kit (no subscription)

---

## Description (the listing body)

Ask ChatGPT, Claude, or Perplexity "what's the best tool for [your category]?" and
your brand might not come up at all. Clawmart checks whether it does — then hands you
the fixes.

**Free AI Visibility Check** (no signup): enter your domain. We query the AI models
that power ChatGPT, Claude, and Perplexity via their APIs across ~10 buyer-intent
prompts, and give you a plain tier — Invisible, Faint, Mixed, or Visible — plus a
couple of real findings.

**$49 AI Visibility Fix Kit** (one-time, per domain): ~40 prompts × 3 model families
× 3 runs. You get mention-rate scores *with uncertainty bands*, share-of-voice vs
competitors, and — the actual point — **ready-to-paste fixes**: per-page JSON-LD,
rewritten answer-capsule copy, an AI-crawler robots.txt config, an FAQ page draft,
and a comparison-page outline. Every score links to a **timestamped transcript** with
the exact model IDs, so you can check our work.

Most AI-visibility tools stop at a dashboard. This one ships the fixes and shows its
receipts. AI visibility is a young field and the evidence for these practices is
emerging, not proven — so every artifact is labeled with its mechanism and honest
latency (search-grounded = weeks; model-training = slow and not directly controllable).

14-day no-questions refund. Not affiliated with OpenAI, Anthropic, or Perplexity.

> One-line disclaimer to keep visible in the gallery/first comment: estimates model
> behavior via provider APIs on a measured date; consumer-app answers differ due to
> web search, memory, personalization, and routing.

---

## First maker comment (honest founder story)

Hey Product Hunt 👋 I'm Ryan, solo on this.

Clawmart is the third thing this domain has been. It started as a marketplace for
autonomous agents, pivoted to "hire pre-built AI agents," and both times I was
building a clever thing nobody had asked me for. This version started from a question
I actually kept getting asked: *"how do I show up when someone asks ChatGPT for a
recommendation?"*

Most tools that answer that question sell you a monitoring dashboard — a number that
goes up or down and a $99–$500/mo subscription to keep watching it. I didn't want to
watch a number. I wanted the fixes. So Clawmart samples the models behind ChatGPT,
Claude, and Perplexity through their APIs, scores how often your brand comes up (with
a Wilson confidence interval, because 40 prompts is a sample, not a truth), and then
generates the boring, high-leverage stuff: JSON-LD, answer-capsule rewrites, a
robots.txt that lets the AI crawlers in, an FAQ draft. Paste-ready.

Two things I want to be upfront about, because they're the reason I built it this way:

1. **This is an estimate, not a wiretap.** We query the models via APIs. Real answers
   in the ChatGPT/Claude/Perplexity apps differ because of web search, memory,
   personalization, and routing. So every claim in the report links to the actual
   timestamped transcript with the model ID. You never have to take my word for it.
2. **This field is young.** The evidence for AEO/GEO tactics is emerging, not proven.
   I label every fix with its mechanism and how fast (or slow) it could plausibly
   matter. I'd rather tell you "this affects model training, which is slow and not
   controllable" than sell you certainty I don't have.

Free check needs no signup. The $49 Fix Kit is one-time, per domain, guest checkout,
14-day refund. Would genuinely love to hear where it's wrong — especially from anyone
who's tried the monitoring tools and bounced off the price or the "now what?" problem.

— Ryan

---

## Gallery copy suggestions (image captions / what to show)

Order the gallery so the *fixes* land before the score — the fixes are the differentiator.

1. **Hero / first tile** — the free check in action: domain input → tier result
   ("Faint") with two teaser findings. Caption: *"Free check, no signup. Enter a
   domain, get a straight answer: Invisible, Faint, Mixed, or Visible."*
2. **A fix artifact, up close** — the ready-to-paste JSON-LD with a copy button.
   Caption: *"The point isn't the score. It's the paste-ready fix — per-page JSON-LD,
   answer-capsule rewrites, robots.txt for AI crawlers, FAQ draft."*
3. **The evidence layer** — a score with its Wilson interval + "view transcript" link
   expanded to a real prompt/answer with model ID + timestamp. Caption: *"Every claim
   links to a timestamped transcript. Check our work."*
4. **Share-of-voice** — you vs competitors bar. Caption: *"See who the models mention
   instead of you (editable — we infer competitors, you correct them)."*
5. **Honesty tile** — a screenshot of the mechanism/latency label + the "emerging, not
   proven" line. Caption: *"We label what each fix actually does, and how slow it is.
   No 'guaranteed #1 in AI search.'"*
6. **Methodology** — the /methodology page. Caption: *"Public prompt set, scoring
   formula, model list, and limitations. Versioned."*

Keep provider names as plain text in screenshots. No OpenAI/Anthropic/Perplexity logos.

---

## Launch-day checklist

**Night before**
- [ ] Confirm funnel works in prod (free check → checkout with Stripe test card 4242 →
      report completes → artifacts render). Screenshot proof.
- [ ] `/methodology`, `/terms`, `/privacy` live. Non-affiliation line in footer.
- [ ] Gallery assets exported, captions pasted, tagline + description final.
- [ ] First maker comment drafted in a notes app, ready to paste at 00:01.
- [ ] Waitlist warm-up email sent the day before: "we're on PH tomorrow, here's the link."
- [ ] Hunter lined up (or self-hunt). Do NOT ask for upvotes in the copy (PH rule).

**00:01 PT**
- [ ] Product goes live. Paste the first maker comment immediately.
- [ ] Post the X launch thread (`x-thread.md`) with the PH link.

**Through the day**
- [ ] Reply to every comment within ~30 min. Answer skeptics with the transcript link,
      not with hype.
- [ ] Post a "how it actually works" comment mid-morning (methodology, mock-mode E2E).
- [ ] If someone asks "isn't this just asking ChatGPT?" → the systematic-sampling +
      repeats + transcripts answer from `positioning.md`.
- [ ] Do not buy upvotes, do not run vote rings — a mid-tier honest launch beats a
      flagged one.

**After**
- [ ] Add the PH badge to the site.
- [ ] Follow up with listicle authors (`listicle-outreach.md`): "we launched on PH today."
- [ ] Note conversion: visits → free checks → kits. Feed it back into the funnel math.
