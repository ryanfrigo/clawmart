import Link from "next/link";
import { Globe, MessageSquareText, Ruler } from "lucide-react";
import { FreeCheck } from "@/components/home/free-check";
import { PricingBuyForm } from "@/components/home/checkout";
import { WaitlistForm } from "@/components/home/waitlist-form";
import { KIT_ITEMS } from "@/components/home/kit-items";
import {
  EMERGING_LINE,
  NON_AFFILIATION,
  ONE_LINE_DISCLAIMER,
  SUPPORT_EMAIL,
} from "@/components/site/constants";

/* ---------------- content ---------------- */

const ANSWER_CAPSULE =
  "Clawmart runs your domain through the AI models that power ChatGPT, Claude, and Perplexity — via their APIs — and measures whether they mention your brand when buyers ask for recommendations. The free check returns a visibility tier; the $49 Fix Kit ships ready-to-paste schema, answer copy, crawler config, and the full transcripts.";

const HOW_STEPS = [
  {
    icon: Globe,
    title: "We read your homepage",
    body: "The crawler fetches your homepage (respecting robots.txt), then infers your brand, category, and likely competitors. Everything inferred is labeled as inferred — and editable in the paid kit.",
  },
  {
    icon: MessageSquareText,
    title: "We ask the models",
    body: "Ten buyer-intent prompts for your category go to two models via their APIs — one search-grounded, one answering from model knowledge with no live browsing. Each is labeled. One run each; the paid kit runs 40 prompts × 3 model families × 3 repeats.",
  },
  {
    icon: Ruler,
    title: "We count, honestly",
    body: "We measure how often answers mention your brand versus competitors. At free-check sample size a 0–100 score would be noise, so you get a tier — Invisible, Faint, Mixed, or Visible — plus the raw counts.",
  },
];

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "How do you measure AI visibility?",
    a: "We query the AI models that power ChatGPT, Claude, and Perplexity through their APIs with buyer-intent prompts for your category, and count how often each answer mentions your brand versus competitors. Paid scores are mention rates with a 95% confidence interval — never a made-up 0–100 grade. The method, prompt set, and scoring formula are public on our methodology page.",
  },
  {
    q: "Is this what ChatGPT users actually see?",
    a: "Not exactly, and we won't pretend otherwise. Consumer apps add web search, memory, personalization, location, and model routing on top of the base models, so any single user's answer can differ. Our checks estimate model behavior via the providers' APIs — and every report states its exact model IDs, measurement date, and run counts, with full transcripts attached.",
  },
  {
    q: "Will the fixes get my brand cited by AI?",
    a: "No one can honestly promise that, and we don't. The fixes are designed to make your pages easier for AI crawlers and answer engines to cite — structured data, answer-ready copy, crawler access. AI visibility optimization is a young field; evidence for these practices is emerging, not proven. That's why every kit ships the raw evidence and carries a 14-day refund.",
  },
  {
    q: "What exactly is in the $49 Fix Kit?",
    a: "Ready-to-paste JSON-LD for your key pages, rewritten answer-capsule copy, a robots.txt AI-crawler configuration, a FAQ page draft, and a comparison-page outline — plus the evidence layer: roughly 360 sampled answers across three model families, mention rates with uncertainty bands, share of voice versus competitors, and the complete per-prompt transcripts.",
  },
  {
    q: "Why a one-time $49 instead of a subscription?",
    a: "Because v1 should earn trust first. A kit is a concrete deliverable: pay once per domain, get the fixes and the evidence. If enough buyers want ongoing re-audits, we'll build monthly fix drops — there's a waitlist below, and we'll only build it if enough people join.",
  },
  {
    q: "What's the refund policy?",
    a: `14 days, no questions asked — reply to your Stripe receipt or email ${SUPPORT_EMAIL}. And if report generation ever fails or your report doesn't arrive within 24 hours, we flag the purchase for an automatic refund without you having to ask.`,
  },
  {
    q: "What do you do with my data?",
    a: "We store the domain you check, a hashed IP for rate limiting, and — if you buy — the email Stripe collects at checkout, used only to deliver your report. No ad trackers, no selling data, no marketing email unless you explicitly join the waitlist. Details are in the privacy policy.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://clawmart.co/#organization",
      name: "Clawmart",
      url: "https://clawmart.co",
      logo: "https://clawmart.co/favicon.svg",
      email: SUPPORT_EMAIL,
      description:
        "Clawmart measures how the AI models that power ChatGPT, Claude, and Perplexity answer buyer questions in a brand's category, then ships fixes: JSON-LD, answer copy, and AI-crawler configuration.",
    },
    {
      "@type": "WebSite",
      "@id": "https://clawmart.co/#website",
      name: "Clawmart",
      url: "https://clawmart.co",
      publisher: { "@id": "https://clawmart.co/#organization" },
    },
    {
      "@type": "FAQPage",
      "@id": "https://clawmart.co/#faq",
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

/* ---------------- page ---------------- */

export default function HomePage() {
  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden">
        {/* ocean glow */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-lobster/[0.07] blur-[130px]" />
          <div className="absolute bottom-0 left-[12%] h-[380px] w-[380px] rounded-full bg-tide/[0.06] blur-[110px]" />
          {/* sonar rings */}
          <div className="absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2">
            <div className="size-[46rem] rounded-full border border-foreground/[0.04]" />
            <div className="absolute inset-[5rem] rounded-full border border-foreground/[0.04]" />
            <div className="absolute inset-[10rem] rounded-full border border-foreground/[0.035]" />
            <div className="absolute inset-[15rem] rounded-full border border-foreground/[0.03]" />
          </div>
        </div>

        <div className="relative mx-auto max-w-4xl px-5 pb-20 pt-20 text-center sm:px-6 sm:pt-28">
          <p className="anim-rise font-mono text-[12px] uppercase tracking-[0.22em] text-lobster">
            Free AI visibility check · no signup
          </p>
          <h1
            className="anim-rise mt-5 text-balance font-display text-[clamp(2.75rem,7vw,5rem)] leading-[1.02] tracking-tight"
            style={{ animationDelay: "80ms" }}
          >
            Is your brand{" "}
            <em className="italic text-lobster">invisible</em> to AI?
          </h1>
          <p
            className="anim-rise mx-auto mt-6 max-w-2xl text-pretty text-[16px] leading-relaxed text-muted-foreground sm:text-[17px]"
            style={{ animationDelay: "160ms" }}
          >
            Buyers now ask ChatGPT, Claude, and Perplexity what to use. We
            query the AI models that power them — via their APIs — and measure
            whether they mention you, or your competitors. Then we ship the
            fixes, not just a score.
          </p>
          <div className="anim-rise mt-10" style={{ animationDelay: "240ms" }}>
            <FreeCheck />
          </div>
        </div>
      </section>

      {/* ---------- Answer capsule (we practice what we sell) ---------- */}
      <section className="mx-auto max-w-3xl px-5 pb-20 sm:px-6">
        <figure className="relative rounded-2xl border border-lobster/25 bg-card/50 p-6 sm:p-8">
          <figcaption className="absolute -top-3 left-6 bg-background px-2 font-mono text-[11px] uppercase tracking-[0.18em] text-lobster">
            The 40–60-word answer
          </figcaption>
          <p className="text-[15px] leading-relaxed text-foreground/90">
            {ANSWER_CAPSULE}
          </p>
          <p className="mt-4 font-mono text-[11px] text-muted-foreground">
            ↑ an answer capsule — a summary an answer engine can lift verbatim.
            Your key pages get one each, in the kit.
          </p>
        </figure>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="border-t border-border py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
            Method, in the open
          </p>
          <h2 className="mt-3 max-w-xl font-display text-4xl tracking-tight sm:text-5xl">
            How does the check work?
          </h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
            {HOW_STEPS.map((s, i) => (
              <div key={s.title} className="bg-background p-7 sm:p-8">
                <div className="flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-card">
                    <s.icon className="size-4.5 text-lobster" aria-hidden="true" />
                  </div>
                  <span className="font-mono text-[12px] text-muted-foreground/60">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-[15px] font-semibold tracking-tight">
                  {s.title}
                </h3>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[13px] text-muted-foreground">
            Full scoring formula, prompt set, and limitations:{" "}
            <Link
              href="/methodology"
              className="text-foreground underline underline-offset-4 hover:text-lobster"
            >
              the methodology page
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ---------- What's in the kit ---------- */}
      <section className="border-t border-border py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
            Deliverables, not vibes
          </p>
          <h2 className="mt-3 max-w-xl font-display text-4xl tracking-tight sm:text-5xl">
            What&apos;s in the Fix Kit?
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            Every fix is tagged with its mechanism and an honest timeline —
            because “paste this and wait weeks” is the truth, and you deserve
            to know it before paying.
          </p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {KIT_ITEMS.map((item) => (
              <div
                key={item.title}
                className="flex flex-col rounded-2xl border border-border bg-card/50 p-6"
              >
                <h3 className="text-[15px] font-semibold tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-2.5 flex-1 text-[13.5px] leading-relaxed text-muted-foreground">
                  {item.detail}
                </p>
                <p className="mt-4 inline-flex w-fit rounded-full border border-border bg-background/60 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
                  {item.tag}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-8 rounded-xl border border-border bg-card/40 p-4 text-[13px] leading-relaxed text-muted-foreground">
            {EMERGING_LINE} We&apos;d rather tell you that on the homepage than
            have you find out after paying.
          </p>
        </div>
      </section>

      {/* ---------- Pricing ---------- */}
      <section id="pricing" className="scroll-mt-20 border-t border-border py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
            Pricing
          </p>
          <h2 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
            How much does it cost?
          </h2>
          <div className="mt-12 grid gap-4 lg:grid-cols-5">
            {/* Free */}
            <div className="rounded-2xl border border-border bg-card/40 p-7 lg:col-span-2 sm:p-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Free check
              </p>
              <p className="mt-3 font-display text-5xl">$0</p>
              <ul className="mt-6 space-y-2.5 text-[13.5px] text-muted-foreground">
                <li>10 buyer-intent prompts × 2 models × 1 run</li>
                <li>Visibility tier + raw mention counts</li>
                <li>2–3 findings, competitors inferred</li>
                <li>No signup, no email required</li>
                <li>Cached 24h per domain</li>
              </ul>
              <Link
                href="/#check"
                className="mt-8 inline-flex h-10 items-center rounded-lg border border-border px-4 text-[13px] font-medium transition-colors hover:bg-accent"
              >
                Run the free check
              </Link>
            </div>
            {/* Kit */}
            <div className="relative overflow-hidden rounded-2xl border border-lobster/35 bg-card/70 p-7 lg:col-span-3 sm:p-8">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-lobster/10 blur-[80px]"
              />
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-lobster">
                AI Visibility Fix Kit
              </p>
              <p className="mt-3 font-display text-5xl">
                $49{" "}
                <span className="text-[15px] font-sans text-muted-foreground">
                  one-time · per domain
                </span>
              </p>
              <ul className="mt-6 grid gap-2.5 text-[13.5px] text-muted-foreground sm:grid-cols-2">
                <li>40 prompts × 3 model families × 3 runs (~360 samples)</li>
                <li>Mention rates with 95% uncertainty bands</li>
                <li>Share of voice vs. competitors (editable)</li>
                <li>Ready-to-paste JSON-LD + answer capsules</li>
                <li>robots.txt config, FAQ draft, comparison outline</li>
                <li>Full transcript appendix, versioned prompt set</li>
                <li>Guest checkout — no account needed</li>
                <li>14-day no-questions refund</li>
              </ul>
              <PricingBuyForm />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Waitlist ---------- */}
      <section className="border-t border-border py-16">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-lg">
            <h2 className="font-display text-3xl tracking-tight">
              Want this monthly?
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              We&apos;re considering monthly re-checks and fresh fix drops.
              We&apos;ll only build it if enough people ask — this list is the
              vote, and the only thing we&apos;ll email you about.
            </p>
          </div>
          <WaitlistForm source="home" />
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section id="faq" className="scroll-mt-20 border-t border-border py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-5 sm:px-6">
          <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
            Honest FAQ
          </p>
          <div className="mt-8 space-y-10">
            {FAQ.map((f) => (
              <div key={f.q}>
                <h2 className="font-display text-2xl tracking-tight sm:text-[1.75rem]">
                  {f.q}
                </h2>
                <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">
                  {f.a}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-12 border-t border-border pt-6 text-[12px] leading-relaxed text-muted-foreground">
            {ONE_LINE_DISCLAIMER} {NON_AFFILIATION}
          </p>
        </div>
      </section>
    </div>
  );
}
