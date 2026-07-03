/**
 * Free lead-magnet skills — three genuinely useful, standalone skills given
 * away on /free to demonstrate quality and funnel to the paid packs. Each is
 * one real skill pulled from a paid pack (honest "3 of N — get the full pack").
 *
 * These are served UNGATED (no purchase) as a single zip by /api/free-download.
 * The `packSlug` powers the upsell ("this is 1 of 6 in the AI SDR Pack").
 */

export interface FreeSkill {
  /** skill folder name under packs/<packSlug>/ — its SKILL.md is the content */
  name: string;
  title: string;
  summary: string;
  packSlug: string; // the paid pack this skill belongs to
}

export const FREE_SKILLS: FreeSkill[] = [
  {
    name: "prospect-research",
    title: "Prospect Research",
    summary:
      "Enrich a lead from a domain or name — who they are, recent signals, and the angle to lead with. One of 6 skills in the AI SDR Pack.",
    packSlug: "ai-sdr",
  },
  {
    name: "meeting-prep",
    title: "Meeting Prep",
    summary:
      "Before each meeting, a one-pager: who, why, the last thread, and your goal. One of 6 skills in the Personal Chief of Staff Pack.",
    packSlug: "chief-of-staff",
  },
  {
    name: "transcript-clean",
    title: "Transcript Clean",
    summary:
      "Turn a raw transcript into clean, speaker-labeled, timestamped text — the first step of any content workflow. One of 6 skills in the Content Engine Pack.",
    packSlug: "content-engine",
  },
];
