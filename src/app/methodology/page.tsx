import type { Metadata } from "next";
import Link from "next/link";
import {
  EMERGING_LINE,
  NON_AFFILIATION,
  SUPPORT_EMAIL,
} from "@/components/site/constants";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How Clawmart measures AI visibility: the prompt set, the exact models, the Wilson-interval scoring formula, tier thresholds, and the limitations we won't hide.",
  alternates: { canonical: "/methodology" },
};

const MODELS = [
  {
    id: "perplexity/sonar",
    mode: "Search-grounded",
    note: "Answers are backed by live web search; citations are recorded in every transcript.",
  },
  {
    id: "openai/gpt-5.1",
    mode: "Model knowledge, no live browsing",
    note: "Answers come from what the model learned in training — a proxy for its parametric knowledge of your category.",
  },
  {
    id: "anthropic/claude-sonnet-5",
    mode: "Model knowledge, no live browsing",
    note: "Same labeling. If a gateway search tool is ever verified for these models, the change will be listed in the changelog below.",
  },
];

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-14 font-display text-3xl tracking-tight">{children}</h2>
  );
}

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-6 sm:py-20">
      <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-lobster">
        Public methodology · prompt set v1
      </p>
      <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
        How we measure AI visibility
      </h1>
      <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
        Everything below is the whole method — the prompts, the models, the
        math, and the limitations. Every paid report also ships its full
        per-prompt transcripts so you can re-derive any number we show you.
      </p>

      <H2>What we sample</H2>
      <div className="mt-4 space-y-4 text-[14.5px] leading-relaxed text-muted-foreground">
        <p>
          For a given domain we crawl the homepage (respecting robots.txt),
          infer the brand name, category, and likely competitors — all labeled
          as inferred — and generate buyer-intent prompts for that category:
          the kinds of questions a buyer would actually ask, like
          recommendations, comparisons, and alternatives.
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-foreground">Free check:</strong> ~10
            prompts × 2 models × 1 run (≈20 sampled answers). Cached for 24
            hours per domain.
          </li>
          <li>
            <strong className="text-foreground">Paid Fix Kit:</strong> ~40
            prompts × 3 model families × 3 repeats (≈360 sampled answers).
          </li>
        </ul>
        <p>
          Repeats matter because model output is stochastic: one run is an
          anecdote, three runs per prompt per model starts to be a measurement.
          All calls use provider-default temperature — disclosed here, on
          purpose, because cherry-picking a low temperature would understate
          variance.
        </p>
      </div>

      <H2>The models</H2>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card/40">
        <table className="w-full min-w-[34rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-border">
              <th className="p-4 font-mono text-[11px] font-normal uppercase tracking-[0.14em] text-muted-foreground">
                Model ID (default)
              </th>
              <th className="p-4 font-mono text-[11px] font-normal uppercase tracking-[0.14em] text-muted-foreground">
                Mode
              </th>
              <th className="p-4 font-mono text-[11px] font-normal uppercase tracking-[0.14em] text-muted-foreground">
                Notes
              </th>
            </tr>
          </thead>
          <tbody>
            {MODELS.map((m) => (
              <tr key={m.id} className="border-b border-border/60 last:border-0 align-top">
                <td className="p-4 font-mono text-[12.5px]">{m.id}</td>
                <td className="p-4 text-[13px]">{m.mode}</td>
                <td className="p-4 text-[13px] text-muted-foreground">{m.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
        These are the current defaults, queried via their providers&apos; APIs
        through an AI gateway. Model catalogs drift; the exact model IDs used
        for <em>your</em> report are recorded in the report itself and in every
        transcript row. The free check uses the search-grounded model plus one
        model-knowledge model.
      </p>
      <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
        <strong className="text-foreground">
          Grounded vs. ungrounded matters:
        </strong>{" "}
        search-grounded answers depend on what&apos;s retrievable and citable
        about you right now (fixable in weeks); model-knowledge answers depend
        on training data (slow to change, not directly controllable). We score
        them separately and never blend the two into one number.
      </p>

      <H2>Scoring</H2>
      <div className="mt-4 space-y-4 text-[14.5px] leading-relaxed text-muted-foreground">
        <p>
          A sampled answer counts as a <em>mention</em> if it contains your
          brand name (word-boundary match, case-insensitive, allowing
          space/hyphen variants) or your domain. Competitor mentions are
          detected the same way. Mention rate is simply mentions ÷ samples.
        </p>
        <p>
          Every rate is reported with a 95% Wilson score interval rather than
          a bare number:
        </p>
        <pre className="overflow-x-auto rounded-xl border border-border bg-abyss/50 p-4 font-mono text-[12px] leading-relaxed text-foreground/90">
{`p̂ = mentions / n        z = 1.96

          p̂ + z²/2n ± z·√( p̂(1−p̂)/n + z²/4n² )
interval = ───────────────────────────────────────
                        1 + z²/n`}
        </pre>
        <p>
          The Wilson interval behaves sensibly at small n and at rates near 0
          or 1 — exactly where AI visibility measurements live. When you see
          “12% (5–24%)”, the honest reading is the band, not the point.
        </p>
        <p>
          The free check&apos;s ~20 samples are too few for a meaningful
          percentage, so it returns a tier instead, based on the
          search-grounded mention rate:
        </p>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card/40">
          <table className="w-full min-w-[20rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="p-3.5 font-mono text-[11px] font-normal uppercase tracking-[0.14em] text-muted-foreground">
                  Tier
                </th>
                <th className="p-3.5 font-mono text-[11px] font-normal uppercase tracking-[0.14em] text-muted-foreground">
                  Grounded mention rate
                </th>
              </tr>
            </thead>
            <tbody className="text-[13.5px]">
              <tr className="border-b border-border/60">
                <td className="p-3.5 text-destructive">Invisible</td>
                <td className="p-3.5 font-mono text-[12.5px]">0 mentions</td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="p-3.5 text-lobster">Faint</td>
                <td className="p-3.5 font-mono text-[12.5px]">under 20%</td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="p-3.5 text-sand">Mixed</td>
                <td className="p-3.5 font-mono text-[12.5px]">20–60%</td>
              </tr>
              <tr>
                <td className="p-3.5 text-kelp">Visible</td>
                <td className="p-3.5 font-mono text-[12.5px]">over 60%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <H2>Prompt set v1</H2>
      <div className="mt-4 space-y-4 text-[14.5px] leading-relaxed text-muted-foreground">
        <p>
          Prompts are generated per domain from the inferred brand, category,
          and competitors, across buyer-intent groups: “best tool for X”,
          direct comparisons, recommendations for a specific situation, and
          alternatives to a named competitor. The prompt set is versioned —
          your report states which version it used, and the full text of every
          prompt appears in the transcript appendix.
        </p>
      </div>

      <H2>Limitations</H2>
      <ul className="mt-4 list-disc space-y-2.5 pl-5 text-[14.5px] leading-relaxed text-muted-foreground">
        <li>
          <strong className="text-foreground">
            APIs are not consumer apps.
          </strong>{" "}
          Answers in the ChatGPT/Claude/Perplexity consumer apps can differ
          due to web search, memory, personalization, location, and model
          routing. Our results estimate model behavior; they are not a
          recording of any real user&apos;s session.
        </li>
        <li>
          <strong className="text-foreground">Sampling noise is real.</strong>{" "}
          That&apos;s why every score carries an interval and the free check
          only returns a tier.
        </li>
        <li>
          <strong className="text-foreground">
            Competitor inference can miss.
          </strong>{" "}
          Competitors are inferred from your homepage and category. The paid
          kit lets you see exactly which were used; a different set can change
          share-of-voice results.
        </li>
        <li>
          <strong className="text-foreground">
            Free checks are cached 24h per domain,
          </strong>{" "}
          so a repeat check inside a day returns the same measurement.
        </li>
        <li>
          <strong className="text-foreground">{EMERGING_LINE}</strong> We tag
          every fix with its mechanism and an honest timeline instead of
          promising outcomes.
        </li>
      </ul>

      <H2>Changelog</H2>
      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card/40">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-border p-4">
          <span className="font-mono text-[12px] text-lobster">v1</span>
          <span className="font-mono text-[12px] text-muted-foreground">
            2026-07-02
          </span>
          <span className="text-[13.5px] text-muted-foreground">
            Initial release: buyer-intent prompt generation (4 intent groups),
            3 default model families, Wilson 95% intervals, tier thresholds as
            above.
          </span>
        </div>
        <p className="p-4 text-[12.5px] text-muted-foreground">
          Any change to prompts, models, or scoring gets a new version listed
          here, so reports stay comparable within a version.
        </p>
      </div>

      <p className="mt-12 border-t border-border pt-6 text-[12.5px] leading-relaxed text-muted-foreground">
        Questions about the method — or think we got something wrong? Email{" "}
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=Methodology`}
          className="text-lobster underline underline-offset-4"
        >
          {SUPPORT_EMAIL}
        </a>
        . {NON_AFFILIATION}{" "}
        <Link href="/" className="underline underline-offset-4 hover:text-foreground">
          Run the free check →
        </Link>
      </p>
    </div>
  );
}
