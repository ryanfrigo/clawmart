/**
 * Clawmart pack catalog — premium, curated skill packs for OpenClaw.
 *
 * OpenClaw (github.com/openclaw/openclaw) is a self-hosted personal AI assistant
 * with a free public skill registry (ClawHub). Clawmart sells the *curated,
 * assembled, ready-to-run* layer: multi-skill packs for a specific job, built to
 * the AgentSkills spec, with a setup guide. Free à-la-carte skills exist on
 * ClawHub; clawmart is the "it just works for my use case" shortcut.
 *
 * Honesty: packs are curated, ready-to-install skill bundles built to the
 * OpenClaw AgentSkills spec with setup guides — not magic, and not tested
 * against your exact stack. 14-day refund on every pack. No fabricated numbers.
 *
 * This module is the single source of truth for the catalog (imported by both
 * the Next.js UI and the Convex checkout). Pack *file contents* live under
 * packs/<slug>/ and are compiled into src/lib/pack-contents.ts for gated
 * download.
 */

export interface PackSkill {
  name: string; // matches the skill folder / SKILL.md `name`
  summary: string; // one line — what this skill teaches the agent to do
}

export interface Pack {
  slug: string;
  title: string;
  emoji: string;
  tagline: string; // <= ~90 chars, buyer-facing
  vertical: string; // e.g. "Sales", "E-commerce"
  priceUsd: number; // whole dollars
  forWho: string; // one sentence: who buys this
  outcome: string; // one sentence: what changes after installing
  skills: PackSkill[]; // what's inside
  sampleSkillName: string; // which skill is shown free on the detail page
  seoKeywords: string[]; // for the per-pack landing page
}

export const BUNDLE = {
  slug: "all-access",
  title: "All-Access Bundle",
  emoji: "🦞",
  tagline: "Every pack, every future pack — one price.",
  priceUsd: 99,
};

export const PACKS: Pack[] = [
  {
    slug: "ai-sdr",
    title: "AI SDR Pack",
    emoji: "📈",
    tagline: "Turn your OpenClaw into an outbound sales rep that never sleeps.",
    vertical: "Sales",
    priceUsd: 39,
    forWho: "Founders and small sales teams running outbound without an SDR.",
    outcome:
      "Your assistant researches prospects, drafts personalized first-touch and follow-ups, logs replies, and books meetings on the channels you already use.",
    skills: [
      { name: "prospect-research", summary: "Enrich a lead from a domain or name — who they are, recent signals, angle to lead with." },
      { name: "cold-open", summary: "Draft a personalized, non-templated first-touch email or DM from the research." },
      { name: "followup-sequence", summary: "Generate and schedule a 4-touch follow-up cadence; stop on reply." },
      { name: "reply-triage", summary: "Classify inbound replies (interested / not now / objection / OOO) and draft the next move." },
      { name: "meeting-booker", summary: "Offer times, confirm, and drop a calendar hold when a prospect says yes." },
      { name: "pipeline-log", summary: "Keep a running deal log (stage, next step, last touch) the agent updates as things move." },
    ],
    sampleSkillName: "cold-open",
    seoKeywords: ["openclaw sales", "openclaw sdr", "openclaw outbound", "ai sdr openclaw", "openclaw cold email"],
  },
  {
    slug: "ecom-ops",
    title: "E-Commerce Ops Pack",
    emoji: "🛒",
    tagline: "Store operations on autopilot — inventory, orders, reviews, reorders.",
    vertical: "E-commerce",
    priceUsd: 39,
    forWho: "Shopify / DTC operators drowning in daily store ops.",
    outcome:
      "Your assistant watches inventory, triages orders and refunds, chases reviews, and flags reorders before you stock out.",
    skills: [
      { name: "inventory-watch", summary: "Alert when SKUs cross a low-stock threshold; surface velocity so you reorder in time." },
      { name: "order-triage", summary: "Summarize the day's orders, flag risky/fraud-signal ones, and draft responses." },
      { name: "refund-assistant", summary: "Draft policy-consistent refund/return replies and log the reason." },
      { name: "review-requests", summary: "Time and draft post-delivery review requests per customer." },
      { name: "reorder-logic", summary: "Given sales velocity + lead time, recommend reorder quantities and timing." },
      { name: "daily-store-brief", summary: "A morning brief: sales, stockouts, refunds, and the 3 things to handle today." },
    ],
    sampleSkillName: "reorder-logic",
    seoKeywords: ["openclaw shopify", "openclaw ecommerce", "openclaw inventory", "openclaw store ops", "shopify ai agent openclaw"],
  },
  {
    slug: "chief-of-staff",
    title: "Personal Chief of Staff Pack",
    emoji: "🗂️",
    tagline: "Inbox, calendar, and the day — handled before you wake up.",
    vertical: "Personal ops",
    priceUsd: 39,
    forWho: "Founders and busy operators who live across too many channels.",
    outcome:
      "Your assistant triages your inbox, protects your calendar, captures tasks from any channel, and delivers a real morning brief.",
    skills: [
      { name: "inbox-triage", summary: "Sort the inbox into urgent / reply / read-later / ignore and draft the replies you'd send." },
      { name: "calendar-guard", summary: "Flag conflicts and back-to-backs, propose reshuffles, and hold focus blocks." },
      { name: "daily-brief", summary: "A morning brief across mail, calendar, and messages: what matters, what's due, what to say no to." },
      { name: "task-capture", summary: "Turn any message ('remind me…', 'can you…') into a tracked task with a due date." },
      { name: "meeting-prep", summary: "Before each meeting, a one-pager: who, why, last thread, and your goal." },
      { name: "end-of-day", summary: "An evening wrap: what got done, what slipped, tomorrow's top 3." },
    ],
    sampleSkillName: "daily-brief",
    seoKeywords: ["openclaw assistant", "openclaw chief of staff", "openclaw inbox", "openclaw daily brief", "openclaw personal assistant setup"],
  },
  {
    slug: "content-engine",
    title: "Content Engine Pack",
    emoji: "🎬",
    tagline: "Transcript → show notes → clips → posts. One recording, a week of content.",
    vertical: "Content",
    priceUsd: 39,
    forWho: "Creators, podcasters, and marketers turning long-form into everything else.",
    outcome:
      "Your assistant takes a recording or transcript and produces show notes, chapters, social clips, and platform-ready posts on a schedule.",
    skills: [
      { name: "transcript-clean", summary: "Turn a raw transcript into clean, speaker-labeled, timestamped text." },
      { name: "show-notes", summary: "Generate titled show notes with chapters, key takeaways, and linked resources." },
      { name: "clip-finder", summary: "Surface the 5-8 most clippable moments with timestamps and a hook line each." },
      { name: "social-repurpose", summary: "Turn each clip/idea into platform-native posts (X thread, LinkedIn, shorts caption)." },
      { name: "newsletter-draft", summary: "Draft a newsletter issue from the episode with a subject line and CTA." },
      { name: "publish-checklist", summary: "A per-episode checklist the agent runs and reports on before you hit publish." },
    ],
    sampleSkillName: "clip-finder",
    seoKeywords: ["openclaw content", "openclaw podcast", "openclaw repurposing", "openclaw creator", "openclaw show notes"],
  },
];

export function getPack(slug: string): Pack | undefined {
  return PACKS.find((p) => p.slug === slug);
}

export function isBundle(slug: string): boolean {
  return slug === BUNDLE.slug;
}

/** Price in whole dollars for any purchasable slug (pack or bundle). */
export function priceForSlug(slug: string): number | null {
  if (slug === BUNDLE.slug) return BUNDLE.priceUsd;
  return getPack(slug)?.priceUsd ?? null;
}

export function titleForSlug(slug: string): string | null {
  if (slug === BUNDLE.slug) return BUNDLE.title;
  return getPack(slug)?.title ?? null;
}
