# Clawmart distribution strategy

Clawmart is a storefront of premium **skill packs for OpenClaw** — the self-hosted personal
AI assistant (github.com/openclaw/openclaw). Four packs at $39 (AI SDR, E-Commerce Ops,
Personal Chief of Staff, Content Engine), an All-Access bundle at $99. Each pack is a curated
bundle of OpenClaw skills, built to the AgentSkills spec, delivered as a gated zip download
with a setup guide. 14-day refund on everything. Free à-la-carte skills already exist on
ClawHub; clawmart sells the *assembled, ready-to-run* layer.

Everything in this folder is a **DRAFT for the founder to fire manually.** Nothing here is
posted by any automation, on any platform, ever (repo hard rule #3). None of these assets
require the founder to reveal who he is — the most he ever says is "I built and curated this."

---

## The reality, stated plainly

Read this before you touch a single channel.

1. **Clawmart has no audience.** No list, no following, no inbound. `clawmart.co` is a
   new-ish domain with little to no authority. Traffic today is roughly zero.
2. **The founder will not post as himself.** No personal brand, no face, no name attached.
   That removes every channel that runs on a founder's reputation or relationships —
   which is most of the fast ones.
3. **The product is genuinely good but genuinely optional.** A buyer can assemble the same
   skills from the free ClawHub registry themselves. We're selling curation, assembly, and
   a setup guide — a real value, but a "nice shortcut," not a painkiller they're desperate for.

Put those together and the honest conclusion is: **there is no overnight-sale channel that
fits this product.** No growth hack survives contact with "no audience + anonymous founder +
a $39 convenience product." Anyone promising otherwise is selling you astroturfing, which we
will not do (repo hard rule #3; and it gets accounts and domains burned).

What *does* fit is a small set of slow, compounding, identity-free channels. That's the whole
game. If that's not acceptable, the honest move is to build an audience first (a channel the
founder is willing to attach some identity to) — but that's out of scope for these assets.

---

## What the market actually supports (the good news)

The pessimism above is about *distribution*, not *demand*. The demand is real and documented:

- OpenClaw is one of the fastest-growing open-source projects of 2026 — reported in the
  **200K–355K GitHub-stars** range across sources. That's an enormous, fast-growing base of
  people self-hosting an assistant and looking for skills to make it useful.
  [[repo]](https://github.com/openclaw/openclaw) [[guide]](https://medium.com/data-science-collective/355k-github-stars-in-5-months-17-defense-rate-the-complete-honest-guide-to-openclaw-28d2f59598e1)
- A real skill economy exists: builders reportedly make **$600–$20,000/month** selling
  OpenClaw skills, with premium skills priced **$10–$200**.
  [[ClawHub skill economy]](https://medium.com/@0xmega/the-clawhub-skill-economy-how-builders-are-making-600-20-000-month-selling-ai-agents-0b56d4aede5e)
  [[Superframeworks]](https://superframeworks.com/articles/openclaw-make-money-guide)
- The documented playbook that works is literally ours: **publish a free skill to ClawHub for
  installs and visibility, then sell the premium/assembled version off-platform** (Gumroad or a
  landing page). Sellers already run $49 / $99 tiers this way.
  [[Superframeworks]](https://superframeworks.com/articles/openclaw-make-money-guide)
  [[Gumroad example]](https://numbpilled.gumroad.com/l/masterclaw)

So the wedge is sound. The constraint is purely: *how does a no-audience, anonymous seller get
in front of that base honestly?* Three channels, below.

---

## The three channels that fit — ranked

Ranked by fit for *this* product under *these* constraints, not by generic effectiveness.

### 1. SEO / AEO for "openclaw ___" demand — the engine
**Fit: excellent. Effort: medium-high, front-loaded. Payoff: months, then compounds.**

The single largest identity-free channel. Hundreds of thousands of people are searching
"openclaw for sales," "how to make openclaw do X," "openclaw shopify," etc. Per-pack landing
pages plus a handful of "OpenClaw for [vertical]" and "how to make OpenClaw do [task]" guides
capture that intent. It needs no identity, no posting, no permission — just pages that answer
the question better than anything ranking today, structured so AI answer engines cite them too.
This is the only channel that keeps paying after you stop working. **See `seo-plan.md`.**
Realistic: near-zero for the first 4–8 weeks; meaningful organic clicks in month 2–4; a
compounding trickle by month 6+.

### 2. Genuine free-value contributions that funnel to the packs — the primer
**Fit: good, with rules. Effort: medium. Payoff: weeks to months.**

Publish 2–3 genuinely useful, standalone **free** skills to ClawHub (and, once they have real
installs, to the awesome-openclaw-skills list). This is the documented winning playbook, it's
identity-free (a GitHub account, not a face), and it seeds the SEO engine with real backlinks
and real users who discover the paid packs. The line to walk: these must be *real
contributions people are glad to install*, honestly labeled, never spam. **See
`free-lead-gen.md`** — including the explicit warning that commercial cross-promotion may
violate a given community's norms, and to check each one's rules first.

### 3. Product-led discovery — directories & listings — the trickle
**Fit: decent. Effort: low, one-time. Payoff: slow, evergreen.**

Submit the storefront to AI-tool and OpenClaw-ecosystem directories (allclaw.org,
aiagentsdirectory.com, There's An AI For That, Toolify, aiagentstore.ai) and consider a
Gumroad cross-listing where the buyers already are. Low effort, do-follow backlinks that also
help channel #1, and a steady dribble of intent traffic. Won't move the needle alone, but it's
cheap and compounds with the rest. **See `directories.md`.**

### The launch posts are a fourth, *optional*, non-repeatable channel
`launch-posts.md` holds Show HN / subreddit / X drafts. Treated separately because they are a
**one-shot spike, not an engine** — and posting in OpenClaw's own community (r/OpenClaw,
Discord) is bound by explicit anti-self-promo rules. Fire them only if/when the site is solid,
and only after reading each community's rules. They can seed the first backlinks and the first
handful of visitors, but they don't compound. Don't build the plan around them.

---

## Firing order

Front-load the compounding work; treat spikes as optional garnish.

**Week 0 — foundation (build once, benefits everything):**
1. Ship the per-pack landing pages and the first 2–3 "OpenClaw for X" / "how to make OpenClaw
   do X" guides (`seo-plan.md`). Confirm robots allow AI crawlers, sitemap is clean, JSON-LD
   is valid. Nothing else matters until pages exist to rank and to link to.
2. Author the 2–3 free skills (`free-lead-gen.md`) and publish them to ClawHub. Real, tested,
   genuinely useful. Each links back to a landing page in an honest, non-spammy way.

**Weeks 1–2 — seed discovery (low effort, evergreen):**
3. Submit to directories 1–2 per day, not in a dump (`directories.md`). Prioritize free +
   do-follow + OpenClaw-native ones first (allclaw.org).
4. Decide on the Gumroad cross-listing (`directories.md`) — it meets buyers where they already
   shop for OpenClaw packs.

**Weeks 2–6 — let it cook, keep publishing:**
5. Add one new SEO page or one new free skill per week. Consistency beats intensity here.
6. Watch which free skills get installs. Only once a free skill has *real, organic* adoption is
   it a candidate for the awesome-openclaw-skills PR (that list requires proven usage first).

**Optional, any time after the site is solid:**
7. If the founder wants a spike, fire ONE launch post (`launch-posts.md`) — most likely Show HN
   or a non-OpenClaw subreddit where self-promo is allowed with a value-first framing. Read the
   rules first. Do not spam the OpenClaw community.

**Ongoing:** publish, measure, double down on the pages/skills that get traffic. That's it.

---

## How the first sale actually happens (honest)

Not from a viral post. Here's the realistic path, and it's unglamorous:

> Someone self-hosting OpenClaw hits a wall — they want it to actually run their outbound, or
> their store ops. They search **"openclaw sdr"** or **"openclaw shopify"** (channel #1), OR
> they install your free `prospect-research` skill from ClawHub, like it, and read the note that
> it's one skill from a larger pack (channel #2), OR they find the storefront in an OpenClaw
> directory (channel #3). They land on a per-pack page, see the full skill list, read the free
> sample skill in full, see the honest "you *could* assemble this yourself from ClawHub, but
> here it's curated and ready + a setup guide," decide $39 is worth an afternoon saved, and buy.
> The 14-day refund removes the risk of clicking.

The first sale is most likely to come from **channel #2** (a free skill's install → landing page)
because it's the fastest of the three to produce a warm, qualified visitor. Channels #1 and #3
are what make the *tenth* and *hundredth* sales happen without more effort.

Expect the first sale in **weeks, not days**, and expect it to feel like it came from nowhere —
because compounding channels don't announce themselves. Judge the plan on the trend over
6–8 weeks (impressions, installs, sessions), not on day-one revenue.

---

## Non-negotiables (repeated so they don't get lost)

- **Never post on the founder's behalf.** Every file here is a draft he fires manually.
- **Never reveal his identity.** "I built/curated this" is the ceiling. No name, no face.
- **No astroturfing, no sockpuppets, no fake reviews/testimonials/logos, no fabricated stats.**
- **Nominative use of "OpenClaw" only; state non-affiliation** ("Clawmart is an independent
  storefront and is not affiliated with or endorsed by OpenClaw") anywhere we describe the product.
- **No "guaranteed results."** We sell a curated, ready-to-install bundle + setup guide, adapted
  to your stack, with a refund — not magic.
- **Community contributions must be genuine and honest.** If a community's rules forbid
  commercial cross-promotion, follow them — a burned reputation costs more than a sale.

---

## Files in this folder

| File | What it is |
|------|------------|
| `README.md` | This — the honest strategy, ranked channels, firing order, how the first sale happens |
| `seo-plan.md` | The SEO/AEO engine: target queries, page plan, on-page/AEO tactics, timeline |
| `free-lead-gen.md` | The legitimate free→paid funnel: which free skills to publish, honest listing text, norm warnings |
| `directories.md` | Submission-ready listings for AI-tool + OpenClaw directories; Gumroad cross-listing |
| `launch-posts.md` | Optional one-shot drafts: Show HN, a subreddit, X — identity-free, community-rules caveats |
| `positioning.md` | The one-pager: category, ICP per pack, the wedge vs free ClawHub, objection handling, pricing |

---

## Sources for market claims

- OpenClaw scale (200K–355K GitHub stars, 2026):
  [github.com/openclaw/openclaw](https://github.com/openclaw/openclaw),
  [Data Science Collective guide](https://medium.com/data-science-collective/355k-github-stars-in-5-months-17-defense-rate-the-complete-honest-guide-to-openclaw-28d2f59598e1),
  [dextralabs](https://dextralabs.com/blog/what-is-openclaw-self-hosted-ai-agent-2026/)
- Skill economy ($600–$20k/mo; premium skills $10–$200; free-then-paid playbook):
  [ClawHub skill economy (Medium)](https://medium.com/@0xmega/the-clawhub-skill-economy-how-builders-are-making-600-20-000-month-selling-ai-agents-0b56d4aede5e),
  [Superframeworks: how to make money with OpenClaw](https://superframeworks.com/articles/openclaw-make-money-guide)
- ClawHub is the free official registry:
  [clawhub.ai](https://clawhub.ai/),
  [github.com/openclaw/clawhub](https://github.com/openclaw/clawhub),
  [allclaw.org/entry/clawhub](https://allclaw.org/entry/clawhub)
- Competitor (managed hosting, not packs): [OneClaw ~$9.99/mo](https://www.oneclaw.net/blog/best-openclaw-hosting-2026)
- Gumroad OpenClaw packs at $49/$99 tiers:
  [numbpilled.gumroad.com/l/masterclaw](https://numbpilled.gumroad.com/l/masterclaw),
  [AI Haven monetization guide](https://aihaven.com/guides/how-to-make-money-with-openclaw/)

All star counts and revenue figures are *third-party reports*, cited as such — never restate
them as clawmart's own numbers or as guarantees.
</content>
</invoke>
