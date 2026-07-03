/**
 * Shared brand + wording constants for Track B (web UI).
 *
 * Honesty is binding (docs/PACKS-BUILD-CONTRACT.md "Wording"):
 * - "OpenClaw" is used nominatively only; state non-affiliation in the footer.
 * - No fabricated stats, testimonials, ratings, or counters.
 * - A pack is a curated, ready-to-install bundle of skills built to the
 *   OpenClaw AgentSkills spec, with a setup guide — not turnkey magic.
 * - Every pack carries a 14-day refund.
 * Do not reword NON_AFFILIATION.
 */

export const SUPPORT_EMAIL = "support@clawmart.co";

/** OpenClaw is the self-hosted personal AI assistant this store builds for. */
export const OPENCLAW_URL = "https://github.com/openclaw/openclaw";

/** Where skills are installed on the user's machine. */
export const SKILLS_PATH = "~/.openclaw/skills";

/** Binding footer line — do not reword. */
export const NON_AFFILIATION =
  "Clawmart is an independent storefront and is not affiliated with or endorsed by OpenClaw.";

export const REFUND_LINE = "14-day refund on every pack — no questions asked.";

/** One honest line about how packs relate to the free registry. */
export const CLAWHUB_LINE =
  "OpenClaw's ClawHub registry is free and à-la-carte. Clawmart sells the assembled, curated layer: multi-skill packs for one job, with a setup guide.";
