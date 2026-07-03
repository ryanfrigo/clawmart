# SEO / AEO plan — the compounding engine

This is the primary channel (see `README.md`). It's the only one that fits an anonymous,
no-audience seller and keeps paying after the work stops. The bet: capture the enormous
"openclaw ___" search demand with pages that answer the question better than what ranks today,
structured so AI answer engines (ChatGPT, Perplexity, Claude, Google AI Overviews) cite us too.

**Honest timeline up front.** New-ish domain, low authority. Expect near-zero for weeks 1–8,
first meaningful organic clicks in **month 2–4**, a compounding trickle by **month 6+**. SEO is
a 3–6 month instrument, not a launch tactic. Nothing below changes that; it just makes the
eventual payoff bigger. Judge progress by *impressions and rankings trending up*, not by
month-1 revenue.

---

## Target queries

Grouped by intent. These are the "openclaw [vertical/task]" space — high-fit because searchers
already run OpenClaw and are looking to make it *do* something, which is exactly what a pack is.
Volumes aren't published for a term this new; prioritize by **intent match + how directly a pack
answers the query**, and validate/expand with a keyword tool (Ahrefs/Semrush/Google Search
Console) once pages are live. Treat this as the seed list, not the ceiling.

### A. Vertical / "OpenClaw for [who]" — commercial, maps 1:1 to a pack
1. `openclaw for sales` — I run OpenClaw, can it do outbound? → **AI SDR pack**
2. `openclaw sdr` / `openclaw ai sdr` — same intent, buyer language → AI SDR
3. `openclaw cold email` — narrower task, high intent → AI SDR
4. `openclaw for ecommerce` → **E-Commerce Ops pack**
5. `openclaw shopify` — very high fit; Shopify operators are a hot OpenClaw segment → E-Com Ops
6. `openclaw for founders` / `openclaw chief of staff` → **Personal Chief of Staff pack**
7. `openclaw personal assistant setup` — setup intent, warm → Chief of Staff
8. `openclaw for creators` / `openclaw for content` → **Content Engine pack**
9. `openclaw for podcasters` — narrow, underserved → Content Engine
10. `openclaw for marketers` — spans SDR + Content; route to whichever page is stronger

### B. Task / "how to make OpenClaw do X" — informational, top-of-funnel, huge volume
11. `how to make openclaw send cold emails`
12. `how to make openclaw manage my inbox`
13. `how to make openclaw triage orders` / `...handle refunds`
14. `openclaw daily brief` / `openclaw morning briefing`
15. `openclaw meeting prep`
16. `openclaw inventory alerts` / `openclaw low stock alert`
17. `openclaw transcript to show notes`
18. `openclaw repurpose content` / `openclaw podcast clips`
19. `openclaw follow up sequence`
20. `openclaw calendar management`

### C. Skill/registry-adjacent — people already shopping for skills
21. `best openclaw skills for sales` / `...for ecommerce` / `...for productivity`
22. `openclaw skill packs` / `openclaw skill bundle`
23. `premium openclaw skills`
24. `openclaw skills for shopify`

### D. Comparison / alternative — bottom-of-funnel, decision-stage
25. `clawhub vs premium skills` / `are clawhub skills free`
26. `openclaw skill packs vs clawhub`
27. `openclaw sdr skill` (branded-category, decision stage)
28. `clawmart` (brand defense once the name has any traction)

Groups A and D convert best (commercial + decision intent) and should be built first. Group B
is the top-of-funnel volume that feeds them via internal links. Group C sits between.

---

## Content-page plan

### Already on the site (verify + harden, don't rebuild)
- `/` — homepage. *Verify:* answer capsule near top, Organization + Product/OfferCatalog
  JSON-LD from real `packs.ts` data, links down to each pack.
- `/packs` — catalog. *Verify:* clean internal links to every pack + the bundle.
- `/packs/[slug]` — the four per-pack detail pages **are your money pages** and already exist.
  Each pack in `src/lib/packs.ts` already carries `seoKeywords`, `forWho`, `outcome`, and a
  full skills list — the raw material for on-page SEO. *Harden each:* unique title/meta built
  from those fields, an answer capsule, FAQ block + FAQ schema, the free sample skill shown in
  full (great for dwell time + AI extraction), Product JSON-LD.
- `/about` — carries the "what is OpenClaw / what is clawmart / non-affiliation" content;
  useful for entity/trust signals and the non-affiliation statement.
- `robots.ts` — **already allows GPTBot, PerplexityBot, ClaudeBot, Google-Extended.** Done.
- `sitemap.ts` — already emits the core routes. *Action:* add every new page below to it.

### Needs building — the SEO surface that doesn't exist yet
A lightweight `/guides` (or `/openclaw`) section of static MDX/RSC pages. Keep each page tightly
scoped to one query cluster, genuinely useful on its own, ending with a soft CTA to the relevant
pack. Suggested build order (highest-intent first):

1. **Vertical landing pages** (Group A) — one per pack, *distinct from* the `/packs/[slug]`
   product page. The product page sells; the vertical page *teaches and ranks*:
   - `/openclaw-for-sales` → deep "using OpenClaw for outbound" guide → AI SDR pack
   - `/openclaw-for-ecommerce` (and/or `/openclaw-shopify`) → E-Com Ops pack
   - `/openclaw-for-founders` (chief-of-staff angle) → Chief of Staff pack
   - `/openclaw-for-creators` → Content Engine pack
   Each: what OpenClaw can/can't do here, the manual way vs the pack, the skills involved, a
   genuinely helpful walkthrough, honest "assemble-it-yourself from ClawHub or buy it ready."
2. **"How to make OpenClaw do X" guides** (Group B) — one per high-intent task (11–20 above).
   These are real tutorials. Where the task is one of our skills, show a real, working approach
   and note "the polished, tested version is in the [pack]." Highest-volume, most linkable, and
   the natural home for the free skills from `free-lead-gen.md`.
3. **Comparison / decision pages** (Group D):
   - `/clawhub-vs-clawmart` or a section titled "Are ClawHub skills free? (yes — here's when a
     pack is worth it)" — the single most important honesty page. Concede the free option
     openly, then make the curation/assembly/setup-guide case. This page converts skeptics and
     is exactly what an AI answer engine will quote when asked "are OpenClaw skills free?"
   - `/best-openclaw-skills-for-[sales|ecommerce|productivity|content]` (Group C) — honest
     roundups that include free ClawHub skills *and* the pack, clearly labeled commercial.

Ship 2–3 pages in Week 0, then one per week. Consistency compounds; a big one-time dump doesn't.

---

## On-page & AEO tactics

Written for both classic SEO and AI answer engines (AEO), which increasingly send qualified,
decision-stage traffic.

- **Answer capsule near the top of every page.** A 40–60 word, self-contained answer to the
  page's query, in plain prose (not a header). This is what AI engines lift verbatim as a
  citation. Example for the ecom page: *"OpenClaw can run day-to-day store operations —
  low-stock alerts, order and refund triage, review requests, and reorder timing — once you
  install skills that teach it those tasks. You can assemble them free from ClawHub, or install
  the curated E-Commerce Ops pack, which bundles six store-ops skills with a setup guide."*
- **FAQ block + FAQPage JSON-LD** on every landing and comparison page. Use the real objection
  questions from `positioning.md` ("Isn't ClawHub free?", "Can't I write these myself?"). FAQ
  schema wins rich results and is heavily used by AI engines. **Only mark up Q&As actually
  visible on the page** (Google's rule) — no invisible schema.
- **Product / Offer JSON-LD** on `/packs/[slug]` with real price, currency (USD), and the
  14-day refund as `hasMerchantReturnPolicy`. **Organization JSON-LD** sitewide with the
  non-affiliation stated in the `description`. Never invent `aggregateRating` or `review` —
  we have no reviews yet, and fabricating them violates repo rules and schema policy.
- **AI crawlers: already allowed** in `robots.ts` (GPTBot, PerplexityBot, ClaudeBot,
  Google-Extended). Consider adding a `/llms.txt` that lists the packs and links — a low-cost,
  emerging AEO convention that some agents read. Keep `/purchase/` and `/api/` disallowed
  (already are).
- **Nominative "OpenClaw" usage, non-affiliation on every page** that names it. This is both a
  legal/honesty requirement and, usefully, clean entity language that helps AI engines
  understand what clawmart is relative to OpenClaw.
- **Internal linking:** Group B guides → Group A vertical pages → `/packs/[slug]` product page.
  Every free-skill guide links to its pack. This concentrates authority on the money pages.
- **Unique, specific titles/metas** built from `packs.ts` fields — never templated boilerplate.
  Lead the title with the query language a human would type ("OpenClaw for Sales: turn your
  assistant into an SDR").
- **Real depth over word count.** These pages rank because they're the best answer, not the
  longest. Show real config, real trigger phrases, honest limitations. Thin affiliate-style
  pages will not rank against an engaged OpenClaw community.
- **No fabricated stats, no "guaranteed to rank/convert" language** anywhere on-page.

---

## What "working" looks like, by month

- **Weeks 1–8:** pages indexed, appearing for a few long-tail terms (Group B/D), near-zero
  clicks. Normal. The job now is *publish and get indexed*, not convert.
- **Month 2–4:** first steady clicks on long-tail "how to make openclaw do X" and comparison
  queries; first AI-engine citations for the "are OpenClaw skills free?" page. First sales
  plausibly trace here or to the free-skill funnel.
- **Month 6+:** the vertical pages (Group A) start ranking for their head terms; the guide
  network cross-links itself into authority; organic becomes the largest steady channel.

Instrument it: Google Search Console from day one (impressions/positions are the leading
indicator months before clicks), plus simple pack-page → checkout conversion tracking. Double
down on whichever pages earn impressions; prune or merge the ones that don't after ~90 days.
</content>
