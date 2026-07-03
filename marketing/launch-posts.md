# Launch posts — optional one-shot spikes (DRAFTS to fire manually)

These are **drafts for the founder to post himself, if and when he chooses.** Nothing here is
posted by any automation (repo hard rule #3). None require revealing his identity — the ceiling
is "I built and curated this."

**Set expectations honestly:** launch posts are a **one-shot spike, not an engine** (see
`README.md`). They can seed the first few backlinks and the first handful of visitors, but they
don't compound. Don't build the plan around them, and don't fire them until the site is solid
(pages load, checkout works, the free sample skills are live and good). A weak launch is a shot
you don't get back.

> ### ⚠️ Community self-promo caveat — read before posting anywhere OpenClaw-native
> OpenClaw's own community (r/OpenClaw, the Discord) is **explicitly anti-self-promo** — its
> guidance red-flags "no self-promo, no copy-paste replies, no link dropping without context."
> [[OpenClaw community]](https://github.com/openclaw/community)
> [[Reddit guide]](https://www.openclawplaybook.ai/guides/how-to-use-openclaw-with-reddit/)
> **Do not drop a promo post in r/OpenClaw or the Discord.** The sanctioned way to reach that
> audience is publishing genuinely useful free skills to ClawHub (`free-lead-gen.md`) and letting
> people find the packs. For every subreddit below, **read its current rules and pinned
> self-promo policy before posting** — many require a value-first framing or a posting-history
> ratio, and new accounts that drop links get shadow-removed.

---

## 1. Show HN (Hacker News)

HN tolerates "Show HN" for things you made, but the audience is allergic to hype and marketing
voice. Lead with what it is, be honest that it's commercial, invite critique. Post on a weekday
morning US-Eastern and be in the thread all day to answer.

**Title (≤80 chars):**
> `Show HN: Clawmart – curated skill packs for OpenClaw, the self-hosted AI assistant`

**Body:**
> OpenClaw is the self-hosted personal AI assistant that blew up on GitHub this year. Its skills
> are just folders with a SKILL.md, and the free registry (ClawHub) has thousands of them —
> à la carte. The friction I kept hitting: to make OpenClaw actually *do a job* (run outbound,
> handle store ops, manage my inbox), you have to find, assemble, and wire up half a dozen
> skills yourself.
>
> So I built Clawmart: curated packs of ~6 skills each, built for one job, delivered as a zip
> with a setup guide. Four packs at $39 (AI SDR, E-Commerce Ops, Personal Chief of Staff,
> Content Engine) and an all-access bundle at $99. Every pack shows one full skill free so you
> can judge the quality before buying, and there are free standalone skills on ClawHub too.
>
> I want to be straight about what this is and isn't: you can absolutely assemble equivalent
> skills yourself from ClawHub for free — clawmart sells the curation, the assembly, and the
> setup guide. They're instruction bundles built to OpenClaw's AgentSkills spec, adapted to your
> stack, not turnkey magic. 14-day refund on everything. I'm not affiliated with OpenClaw.
>
> Stack: Next.js, Convex, Stripe Checkout, zip-on-purchase delivery. Happy to talk about the
> pack-authoring format or the honest "is this worth paying for vs. free" question — that's the
> interesting part. Feedback welcome, including "this should be free."
>
> https://clawmart.co

*Notes:* the self-deprecating "including 'this should be free'" invites the obvious HN objection
instead of getting ambushed by it — and answering it honestly (see `positioning.md`) is how you
win the thread. Don't argue; concede the free option and explain the value.

---

## 2. Subreddit (self-promo-friendly subs only)

**Recommended sub: r/SideProject** (built for exactly this) — or r/EntrepreneurRideAlong /
r/SaaS. **Not r/OpenClaw** (see caveat above). Read the target sub's rules first; frame as a
build story, not an ad.

**Title:**
> `I built a storefront of curated skill packs for OpenClaw (the self-hosted AI assistant)`

**Body:**
> Quick build-story + an honest question for people who use OpenClaw.
>
> OpenClaw skills are folders with a SKILL.md, and the free ClawHub registry has thousands of
> them. But to get OpenClaw to actually run a *workflow* — outbound sales, store ops, an
> inbox/calendar chief-of-staff, a content pipeline — you end up hunting down and stitching
> together ~6 skills. I kept doing that by hand, so I packaged it.
>
> Clawmart is curated packs of skills built for one job each, delivered as a zip + a setup guide.
> $39 a pack, $99 for all of them, one free sample skill per pack, 14-day refund. I'm not
> affiliated with OpenClaw — nominative use only.
>
> The honest tension I'd love takes on: everything in a pack *could* be assembled free from
> ClawHub. My bet is that "curated + assembled + a setup guide" is worth $39 to someone who'd
> rather not spend an afternoon wiring it up. Is that a real value to you, or would you always
> just build it yourself? Genuinely want to know.
>
> Link in a comment (or: clawmart.co) — mods, happy to follow the self-promo rules, tell me if
> this belongs elsewhere.

*Notes:* leading with the honest "would you just build it yourself?" question makes it a
discussion, not a pitch — which is what these subs reward and what keeps it from reading as spam.
Put the link in a comment if the sub prefers that.

---

## 3. X / Twitter (single post or short thread)

Identity-free. No thread-bait, no fake numbers. One honest post is fine; a 3-tweet version below
if he wants it.

**Single post:**
> Built Clawmart: curated skill packs for OpenClaw, the self-hosted AI assistant. 🦞
>
> Each pack = ~6 skills for one job (sales / e-commerce ops / chief of staff / content),
> delivered as a zip + setup guide. $39/pack, $99 all-access, one free sample skill each,
> 14-day refund.
>
> You can assemble the same from free ClawHub skills — this just does the curation + setup for
> you. Not affiliated w/ OpenClaw.
>
> clawmart.co

**3-tweet version:**
> 1/ OpenClaw skills are folders with a SKILL.md, and the free ClawHub registry has thousands.
> But making OpenClaw actually *run a job* means finding + wiring up ~6 of them yourself. I got
> tired of doing that by hand.
>
> 2/ So I built Clawmart 🦞 — curated packs of skills for one job each: an AI SDR, e-commerce
> ops, a personal chief of staff, a content engine. Zip + setup guide, built to OpenClaw's
> AgentSkills spec. $39/pack, $99 for all. One free sample skill per pack.
>
> 3/ Straight version: you can assemble equivalent skills free from ClawHub. Clawmart sells the
> curation, assembly, and setup guide, with a 14-day refund. Not affiliated with OpenClaw. If
> you run OpenClaw, I'd love feedback: clawmart.co

---

## Firing checklist

- [ ] Site is solid: pages load, `/api/checkout` works end-to-end (test a real purchase), the
      free sample skills render in full, 14-day-refund is stated at checkout.
- [ ] The 2–3 free ClawHub skills (`free-lead-gen.md`) are published and installable — so a
      post that mentions "free skills" is actually true.
- [ ] Read the target community's current self-promo rules. **Skip r/OpenClaw / the Discord.**
- [ ] Pick ONE platform to start; don't blast all three the same hour (looks coordinated).
- [ ] Be present to reply for the first several hours. The honest answer to "isn't this free on
      ClawHub?" (from `positioning.md`) is the whole game — concede it, then make the value case.
- [ ] No fabricated numbers, no "guaranteed," no OpenClaw logos, no name required.
</content>
