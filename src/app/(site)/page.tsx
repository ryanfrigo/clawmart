import type { Metadata } from "next";
import {
  Boxes,
  Compass,
  LayoutTemplate,
  Megaphone,
  Palette,
} from "lucide-react";
import { StudioLauncher } from "@/components/studio/studio-launcher";
import { SUPPORT_EMAIL } from "@/components/site/constants";

/* ---------------- content ---------------- */

const TEAM = [
  {
    icon: Compass,
    title: "Strategist",
    model: "claude-sonnet-4.6",
    blurb:
      "Positioning, problem and solution, ideal customers, business model, real risks, and a 90-day plan.",
  },
  {
    icon: Palette,
    title: "Brand Designer",
    model: "gemini-2.5-flash",
    blurb:
      "A company name, tagline, voice, and an accessible color palette for the page.",
  },
  {
    icon: Boxes,
    title: "Product Lead",
    model: "gemini-2.5-flash",
    blurb:
      "Core features, the MVP cut, later ideas, and plausible pricing tiers.",
  },
  {
    icon: LayoutTemplate,
    title: "Landing Page Engineer",
    model: "claude-sonnet-4.6",
    blurb:
      "The full content of the public company page — hero, features, pricing, FAQ.",
  },
  {
    icon: Megaphone,
    title: "Marketing Lead",
    model: "gemini-2.5-flash",
    blurb:
      "Launch tweets, a LinkedIn post, a cold email, and a launch-week checklist.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Describe the idea",
    body: "One honest paragraph is enough — the sharper the input, the sharper the build.",
  },
  {
    n: "2",
    title: "Watch five agents build it live",
    body: "The founding team works in sequence, streaming its thinking and output into a live feed.",
  },
  {
    n: "3",
    title: "Share the standalone company page",
    body: "Every company gets its own public landing page and a launch kit you can copy and fire.",
  },
];

const DISCLOSURES = [
  {
    title: "Drafts, not deliverables",
    body: "Everything the agents produce is AI-generated and unreviewed — a starting point to react to and edit, not a validated business.",
  },
  {
    title: "Public by design",
    body: "Each company gets a standalone page at clawmart.co/c/your-company that anyone with the link can see.",
  },
  {
    title: "Free while we validate demand",
    body: "Up to 3 companies per account. Limits may change as we learn what this should be.",
  },
  {
    title: "No guarantees",
    body: "Nothing here is business, legal, or financial advice, and no outcome is promised.",
  },
];

const BASE = "https://clawmart.co";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${BASE}/#organization`,
      name: "Clawmart",
      url: BASE,
      logo: `${BASE}/favicon.svg`,
      email: SUPPORT_EMAIL,
      description:
        "Clawmart builds Clawmart Studio — describe a company or SaaS idea and a founding team of AI agents drafts the plan, brand, product spec, public landing page, and launch kit.",
    },
    {
      "@type": "WebSite",
      "@id": `${BASE}/#website`,
      name: "Clawmart Studio",
      url: BASE,
      publisher: { "@id": `${BASE}/#organization` },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${BASE}/#studio`,
      name: "Clawmart Studio",
      url: BASE,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description:
        "Describe a company or SaaS idea and a founding team of five AI agents drafts it live: business plan, brand identity, product spec, a public landing page, and a launch kit. All outputs are AI-generated drafts.",
      publisher: { "@id": `${BASE}/#organization` },
    },
  ],
};

export const metadata: Metadata = {
  title: { absolute: "Clawmart Studio — your AI founding team" },
  description:
    "Describe a company or SaaS idea and a founding team of five AI agents drafts it live: business plan, brand, product spec, a public landing page, and a launch kit. Free while we validate demand.",
  alternates: { canonical: "/" },
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
        {/* ocean glow + sonar rings */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-lobster/[0.07] blur-[130px]" />
          <div className="absolute bottom-0 left-[12%] h-[380px] w-[380px] rounded-full bg-tide/[0.06] blur-[110px]" />
          <div className="absolute left-1/2 top-[62%] -translate-x-1/2 -translate-y-1/2">
            <div className="size-[46rem] rounded-full border border-foreground/[0.04]" />
            <div className="absolute inset-[5rem] rounded-full border border-foreground/[0.04]" />
            <div className="absolute inset-[10rem] rounded-full border border-foreground/[0.035]" />
            <div className="absolute inset-[15rem] rounded-full border border-foreground/[0.03]" />
          </div>
        </div>

        <div className="relative mx-auto max-w-4xl px-5 pb-12 pt-20 text-center sm:px-6 sm:pt-28">
          <p className="anim-rise font-mono text-[12px] uppercase tracking-[0.22em] text-lobster">
            Clawmart Studio
          </p>
          <h1
            className="anim-rise mt-5 text-balance font-display text-[clamp(2.6rem,7vw,5rem)] leading-[1.02] tracking-tight"
            style={{ animationDelay: "80ms" }}
          >
            Describe your company.{" "}
            <em className="italic text-lobster">
              Watch a founding team build it.
            </em>
          </h1>
          <p
            className="anim-rise mx-auto mt-6 max-w-2xl text-pretty text-[16px] leading-relaxed text-muted-foreground sm:text-[17px]"
            style={{ animationDelay: "160ms" }}
          >
            Type a company or SaaS idea and five AI agents — strategist, brand,
            product, landing page, marketing — draft the whole thing while you
            watch: a business plan, an identity, a product spec, a live public
            page, and a launch kit.
          </p>
        </div>
      </section>

      {/* ---------- Launcher ---------- */}
      <section className="relative pb-16 sm:pb-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-6">
          <StudioLauncher />
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how" className="scroll-mt-20 border-t border-border py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
            How it works
          </p>
          <h2 className="mt-3 max-w-xl font-display text-4xl tracking-tight sm:text-5xl">
            Idea in, company out.
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-border bg-card/40 p-6">
                <span className="inline-flex size-8 items-center justify-center rounded-lg border border-lobster/40 font-mono text-[13px] text-lobster">
                  {s.n}
                </span>
                <h3 className="mt-4 text-[15px] font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Founding team ---------- */}
      <section className="border-t border-border py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
            The founding team
          </p>
          <h2 className="mt-3 max-w-xl font-display text-4xl tracking-tight sm:text-5xl">
            Five agents, one company.
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            Each agent has one job and hands its output to the next. Two run on
            a premium model where quality compounds; the rest run on a fast
            one. No black box — you watch every step.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {TEAM.map((m) => (
              <div key={m.title} className="flex flex-col rounded-xl border border-border bg-card/40 p-5">
                <m.icon className="size-5 text-lobster" aria-hidden="true" />
                <p className="mt-3 text-[14px] font-medium tracking-tight">{m.title}</p>
                <p className="mt-1 font-mono text-[10.5px] text-muted-foreground">
                  {m.model}
                </p>
                <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
                  {m.blurb}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Honest disclosure ---------- */}
      <section className="border-t border-border py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <div className="rounded-2xl border border-border bg-card/40 p-8 sm:p-10">
            <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
              The honest fine print
            </p>
            <div className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-2">
              {DISCLOSURES.map((d) => (
                <div key={d.title}>
                  <h3 className="text-[14px] font-semibold tracking-tight">{d.title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
                    {d.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
