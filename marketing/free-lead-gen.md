# Free → paid funnel — genuine contributions, not shilling

This is the documented winning playbook for OpenClaw sellers: **publish a genuinely useful free
skill to ClawHub for installs and visibility, then sell the assembled/premium version
off-platform.** [[Superframeworks]](https://superframeworks.com/articles/openclaw-make-money-guide)
It's identity-free (a GitHub account, not a face), it seeds real users and real backlinks, and
it's honest — *if* the free skills are things people are genuinely glad to install.

The whole channel lives or dies on one rule: **the free skills must be real, standalone, and
good.** If someone installs one and it works and helps, we've earned the right to mention the
pack. If it's a crippled teaser designed only to upsell, it's spam, it gets flagged, and it
burns the domain and the GitHub account. Build the former.

---

## Read this before publishing anything: community norms

Different surfaces have different rules. Getting this wrong is expensive.

- **ClawHub (clawhub.ai) — the free official registry.** Open publishing: anyone with a GitHub
  account at least one week old can publish; no gatekeeping.
  [[ClawHub]](https://clawhub.ai/) [[github.com/openclaw/clawhub]](https://github.com/openclaw/clawhub)
  Every skill is security-scanned (SHA-256 → VirusTotal → Gemini Code Insight); suspicious
  skills get warned, malicious ones blocked — so ship clean, dependency-light skills.
  ClawHub's own guidelines **do not explicitly address** promotional/commercial text inside a
  skill's README. That's a gray area, not a green light — see the cross-promo section below.
- **awesome-openclaw-skills (VoltAgent) — the curated list.** Stricter, and **not an immediate
  channel.** Its CONTRIBUTING rules require: the skill is **already published on ClawHub**,
  tests pass and security status is clean, it shows **real community adoption / real-world usage**
  (brand-new skills are rejected), and the list description is **≤10 words**. It also currently
  **excludes crypto/blockchain/finance skills.**
  [[CONTRIBUTING]](https://github.com/VoltAgent/awesome-openclaw-skills/blob/main/CONTRIBUTING.md)
  Practical consequence: you can't PR a free skill here on day one. Publish to ClawHub, let it
  earn genuine installs over weeks, *then* submit — with a purely factual ≤10-word description
  and **zero** sales language in the PR. Never sneak a promo into the awesome list; it will be
  rejected and remembered.
- **OpenClaw's own community (r/OpenClaw, the Discord) is anti-self-promo.** Community guidance
  explicitly red-flags "no self-promo, no copy-paste replies, no link dropping without context."
  [[OpenClaw community]](https://github.com/openclaw/community)
  [[Reddit guide]](https://www.openclawplaybook.ai/guides/how-to-use-openclaw-with-reddit/)
  So the ClawHub publish is fine (that's the sanctioned place for skills), but **do not** go
  post "check out my skill + paid pack" in r/OpenClaw or the Discord. If you ever want to
  participate there, it's genuine help first, over weeks, and read the rules. (Launch-post
  drafts and this caveat are in `launch-posts.md`.)

**Bottom line: check each community's current rules at the moment you act.** They change, and a
rule you followed in one place does not transfer to another.

---

## Which free skills to publish (exactly 3)

Pick skills that are **(a) genuinely useful on their own, (b) broad-appeal / high-search, and
(c) obviously better as part of a full pack** — so giving one away creates desire for the rest
instead of cannibalizing it. Each is a real skill already in a pack (`src/lib/packs.ts`), given
away as the free "taste" of that pack. Ship them built to the exact SKILL.md spec in
`docs/PACKS-BUILD-CONTRACT.md`.

### 1. `prospect-research` — from the **AI SDR** pack
- **Why this one:** lead research is a complete, valuable job by itself, and it has real search
  demand ("openclaw lead research," "openclaw enrich lead"). Giving away *research* (not the
  outreach) shows quality and makes buyers want the cold-open / follow-up / booking skills that
  turn research into meetings. It advertises the pack without gutting it.
- **Funnels to:** `/openclaw-for-sales` → AI SDR pack.

### 2. `meeting-prep` — from the **Personal Chief of Staff** pack
- **Why this one:** near-universal appeal (everyone has meetings), fully standalone, and an
  excellent quality showcase — a good one-pager-before-every-meeting skill sells itself. The
  pack then adds the inbox/calendar/daily-brief system around it.
- **Funnels to:** `/openclaw-for-founders` → Chief of Staff pack.

### 3. `transcript-clean` — from the **Content Engine** pack
- **Why this one:** cleaning a raw transcript into speaker-labeled, timestamped text is an
  obvious, self-contained win with steady demand ("openclaw clean transcript"). It's step one of
  the content pipeline, so it naturally pulls people toward show-notes / clip-finder /
  repurpose — the rest of the pack.
- **Funnels to:** `/openclaw-for-creators` → Content Engine pack.

(These are deliberately *different* skills from the on-site free samples — cold-open,
reorder-logic, daily-brief, clip-finder — so a shopper can see **two** free skills per pack:
one on the product page, one on ClawHub. That's generous and trust-building. A fourth free
skill for E-Commerce Ops, e.g. `review-requests`, can follow once the first three prove out.)

---

## Honest listing text (drafts to fire manually)

Publish each with its real SKILL.md. Below is the *listing/description* copy. Keep it honest and
non-spammy. The commercial mention is **one line, clearly labeled, and truthful** — and only
where the surface's norms allow it (see the cross-promo warning). Strip the commercial line
entirely for any surface that forbids it, including the ≤10-word awesome-list entry.

**`prospect-research` — ClawHub description (full):**
> Enrich a lead from just a domain or a name: who they are, what they do, recent public signals,
> and the angle worth leading with. Give OpenClaw a company or person and get back a tight
> research brief you can act on. Free and standalone. It's the first of six skills in the AI SDR
> pack (research → outreach → follow-up → booking) at clawmart.co — but this skill is complete on
> its own and useful with nothing else installed.

**`meeting-prep` — ClawHub description (full):**
> Before any meeting, OpenClaw hands you a one-pager: who you're meeting and why, the last thread
> or context, and your goal for the call. Point it at a calendar event or paste the invite. Free
> and standalone. It's one skill from the Personal Chief of Staff pack (inbox, calendar, briefs)
> at clawmart.co — but it stands alone and needs nothing else to be useful.

**`transcript-clean` — ClawHub description (full):**
> Turn a raw, messy transcript into clean, speaker-labeled, timestamped text ready to publish or
> repurpose. Paste a transcript; get back readable, structured output. Free and standalone. It's
> the first step of the Content Engine pack (transcript → show notes → clips → posts) at
> clawmart.co — but this skill is complete on its own.

**awesome-openclaw-skills — ≤10-word description (no commercial line; use only after real installs):**
> `- [prospect-research](...) - Enrich a lead from a domain or name.`
> `- [meeting-prep](...) - One-page prep brief before every meeting.`
> `- [transcript-clean](...) - Clean, speaker-labeled, timestamped text from raw transcripts.`

The honest framing in every case: **"free, standalone, complete on its own — and it happens to
be part of a larger paid pack."** That's true, it respects the reader, and it converts better
than a teaser because the free thing actually works.

---

## The cross-promo honesty flag (read carefully)

Putting "…part of a paid pack at clawmart.co" inside a free ClawHub skill is a **genuine gray
area**. ClawHub's published rules don't forbid it, but they don't bless it either, and registry
norms can treat promotional README content as low-quality or spammy. Before you ship:

1. **Check ClawHub's current submission/quality guidelines** and skim how other multi-skill or
   commercial authors phrase their listings. Match the most conservative accepted norm.
2. **Keep the commercial mention to one honest line, clearly labeled, never repeated, never the
   lead.** The skill's value must dominate; the pack mention is a footnote.
3. **If in doubt, drop the commercial line from the skill itself** and rely on the funnel path:
   free skill → the SEO guide it's featured in (`seo-plan.md`) → the pack. The SEO guide is *our*
   surface, where commercial framing is fully fair game. That path stays clean even if a registry
   frowns on in-skill promotion.
4. **Never** post the skill-plus-pack pitch into r/OpenClaw or the Discord — those explicitly
   forbid self-promo. Publishing to ClawHub is the sanctioned distribution act; community posting
   is not.

When the norm is unclear, choose the version that's still obviously a genuine gift with a small
honest label. If removing the commercial line would make you nervous about the funnel, the
funnel was too dependent on the label and not enough on the skill — fix the skill.

---

## How this actually produces a sale

> A Shopify operator running OpenClaw installs `transcript-clean` or a sales founder installs
> `prospect-research` from ClawHub. It works. They read the one honest line — "this is one skill
> from the [pack]" — or they later find the SEO guide that features the same free skill. They
> click through to the pack page, see the full six-skill list plus a second free sample plus the
> honest "assemble-it-yourself-or-buy-it-ready" framing, and decide $39 for the finished,
> curated set + setup guide beats an afternoon of assembly. 14-day refund removes the risk.

This is the **fastest of the three channels to a first sale** because a free install is a warm,
qualified, self-selected visitor — far better than a cold directory click. But it only works if
the free skill is genuinely worth installing. Everything upstream of that is optional; the skill
quality is not.
</content>
