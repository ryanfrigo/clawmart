# X / Twitter — Clawmart

Drafts for Ryan to fire manually. Post the launch thread the morning of the PH launch.
Provider names plain-text, no logos, no banned phrases, no numeric-lift claims.

---

## Launch thread (9 tweets)

**1/**
Ask ChatGPT, Claude, or Perplexity "what's the best tool for [your category]?"

Does your brand come up?

Most founders have never checked. I built a free tool that does — and then hands you the
fixes, not just a score.

clawmart.co 🧵

**2/**
Every "AI visibility" tool I tried was a monitoring dashboard on a $30–$500/mo
subscription.

A number that goes up or down, and a bill to keep watching it.

I didn't want to watch a number. I wanted the fixes.

**3/**
So Clawmart's free check queries the models that power ChatGPT, Claude, and Perplexity —
via their APIs — across ~10 buyer-intent prompts, and gives you a straight tier:

Invisible · Faint · Mixed · Visible

No signup. Just a domain.

**4/**
The $49 one-time Fix Kit is where it earns its keep. ~40 prompts × 3 model families × 3
runs, then paste-ready artifacts:

• per-page JSON-LD
• answer-capsule rewrites
• robots.txt for AI crawlers
• FAQ draft
• comparison-page outline

**5/**
The part I'm proudest of: every score links to a timestamped transcript with the exact
model ID.

You never take my word for it. You check my work.

**6/**
Two honest limits, stated on the page next to every number:

→ I query the models via APIs. Real app answers differ (web search, memory,
personalization, routing). This estimates model behavior; it's not a recording of your
session.

**7/**
→ AEO/GEO is a young field. The evidence for these fixes is emerging, not proven.

So each fix is labeled with its mechanism and honest latency — "affects grounded answers,
weeks" vs "affects training, slow and not controllable."

No "guaranteed #1 in AI search." Ever.

**8/**
Stack, for the curious: Next.js 16, Convex for state + fulfillment, Stripe guest
checkout, Vercel AI Gateway. Whole funnel runs end-to-end in a deterministic mock mode
so I can test it without spending a cent on tokens.

**9/**
Free check, no signup: clawmart.co
$49 Fix Kit is one-time, per domain, 14-day refund.

Tell me where it's wrong — especially if you've bounced off the monitoring tools.

Not affiliated with OpenAI, Anthropic, or Perplexity. I just query their APIs.

---

## Standalone tweets

**A — the mental model (educational, evergreen)**
"AI visibility" is really two problems:

1. Search-grounded answers cite pages they can crawl *now* → fixable in weeks
2. Ungrounded answers pull from training memory → slow, not directly controllable

If a tool gives you one blended score, ask which one it's measuring. The fixes are
totally different.

**B — the robots.txt gotcha (useful, shareable)**
Quiet way brands go invisible to AI search: robots.txt.

A ton of sites block GPTBot / ClaudeBot / PerplexityBot without realizing it — a security
plugin or a copied "block AI scrapers" snippet did it.

Grep your own robots.txt for those user-agents. You might be hiding.

**C — the positioning jab (honest, not mean)**
Free AI-visibility graders stop at "here's your score."

Monitoring tools stop at "here's your score, monthly, for $99+."

The score was never the hard part. The fix is. That's the whole reason I built clawmart.co
— and why every claim in it links to a transcript.
