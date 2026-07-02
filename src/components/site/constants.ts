/**
 * Shared brand + wording constants for Track B (web UI).
 *
 * The disclaimer template is BINDING per docs/RELAUNCH-SPEC.md "Trust & wording"
 * and docs/BUILD-CONTRACT.md "Wording". Do not reword it.
 */

export const SUPPORT_EMAIL = "support@clawmart.co";

export const NON_AFFILIATION =
  "Clawmart is not affiliated with or endorsed by OpenAI, Anthropic, or Perplexity.";

/** One-line disclaimer shown before any payment step (spec requirement). */
export const ONE_LINE_DISCLAIMER =
  "Scores estimate model behavior measured via provider APIs; answers in the ChatGPT/Claude/Perplexity consumer apps can differ.";

export const EMERGING_LINE =
  "AI visibility optimization is a young field; evidence for these practices is emerging, not proven.";

export const REFUND_LINE =
  "14-day no-questions refund. If generation ever fails, the purchase is flagged for an automatic refund.";

/**
 * The mandatory score-adjacent disclaimer, built from real measurement facts.
 * Template text is binding — only the interpolated values vary.
 */
export function buildDisclaimer(opts: {
  measuredAt: number;
  modelIds: string[];
  runsPerPrompt: number;
}): string {
  const date = new Date(opts.measuredAt).toISOString().slice(0, 10);
  const models = opts.modelIds.length > 0 ? opts.modelIds.join(", ") : "the configured models";
  const runs = opts.runsPerPrompt === 1 ? "1 run" : `${opts.runsPerPrompt} runs`;
  return `Measured ${date} via provider APIs using ${models}, ${runs} per prompt. Answers in the ChatGPT/Claude/Perplexity consumer apps can differ due to web search, memory, personalization, location, and model routing. This estimates model behavior; it is not a recording of any real user's session.`;
}

export function formatPct(x: number): string {
  return `${Math.round(x * 100)}%`;
}
