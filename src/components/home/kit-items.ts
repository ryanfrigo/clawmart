/** The Fix Kit deliverables — real contents only, each with its honest mechanism tag. */

export type KitItem = {
  title: string;
  detail: string;
  tag: string;
};

export const MECHANISM_TAGS = {
  grounded: "affects search-grounded answers · typically weeks",
  parametric: "affects model training data · slow, not controllable",
  evidence: "measurement, not a fix",
} as const;

export const KIT_ITEMS: KitItem[] = [
  {
    title: "Per-page JSON-LD structured data",
    detail:
      "Ready-to-paste schema blocks for your key pages, generated from your actual site — designed to make your pages easier for AI crawlers and answer engines to cite.",
    tag: MECHANISM_TAGS.grounded,
  },
  {
    title: "Answer-capsule copy for your top pages",
    detail:
      "Rewritten 40–60-word summaries an answer engine can lift verbatim, one per key page.",
    tag: MECHANISM_TAGS.grounded,
  },
  {
    title: "robots.txt AI-crawler configuration",
    detail:
      "An explicit allow/deny block for GPTBot, ClaudeBot, PerplexityBot, and Google-Extended, matched to your current file.",
    tag: MECHANISM_TAGS.grounded,
  },
  {
    title: "FAQ page draft",
    detail:
      "Question-form headings with concise answers, drafted from the buyer questions we sampled in your category.",
    tag: MECHANISM_TAGS.grounded,
  },
  {
    title: "Comparison-page outline",
    detail:
      "A structure for the “you vs. the competitors AI already names” page, built from your share-of-voice data.",
    tag: MECHANISM_TAGS.parametric,
  },
  {
    title: "The evidence layer",
    detail:
      "~360 sampled answers across 3 model families, mention rates with uncertainty bands, share of voice vs. competitors, and the full per-prompt transcript appendix.",
    tag: MECHANISM_TAGS.evidence,
  },
];
