import type { Metadata } from "next";
import Link from "next/link";
import { MyCompanies, StudioLauncher } from "@/components/studio/studio-launcher";
import { PipelineFigure, SystemSpecs } from "@/components/site/pipeline-figure";
import { SUPPORT_EMAIL } from "@/components/site/constants";
import { AGENTS, PIPELINE } from "../../../convex/lib/agents";
import { DIVISIONS, ROSTER } from "../../../convex/lib/roster";

/* ---------------- content ---------------- */

/** Titles and model ids come from the pipeline definition; only the plain-English
 *  accountability line is editorial. */
const TEAM_BLURB: Record<(typeof PIPELINE)[number], string> = {
  strategist:
    "Positioning, problem and solution, ideal customers, business model, real risks, and a 90-day plan.",
  brand: "A company name, tagline, voice, and an accessible colour palette for the page.",
  product: "Core features, the MVP cut, later ideas, and plausible pricing tiers.",
  landing: "The full content of the public company page — hero, features, pricing, FAQ.",
  marketing: "Launch tweets, a LinkedIn post, a cold email, and a launch-week checklist.",
};

const STEPS = [
  {
    n: "01",
    title: "Describe the idea",
    body: "One honest paragraph is enough — the sharper the input, the sharper the build.",
  },
  {
    n: "02",
    title: "Watch five agents build it live",
    body: "The founding team works in sequence, streaming its thinking and output into a live feed.",
  },
  {
    n: "03",
    title: "Share the standalone company page",
    body: "Every company gets its own public landing page and a launch kit you can copy and fire.",
  },
];

/* These four are binding disclosures. Wording is deliberate — do not soften. */
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

/* ---------------- structure ---------------- */

/**
 * A numbered section. The index hangs in its own ruler column on wide
 * viewports and sits above the heading on narrow ones — the number is
 * structure, so it never floats free of the content it labels.
 */
function Section({
  n,
  title,
  id,
  children,
}: {
  n: string;
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-16 border-t border-[color:var(--rule)] py-16 sm:py-20"
    >
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="grid gap-x-8 gap-y-6 lg:grid-cols-[72px_minmax(0,1fr)]">
          <p className="stamp lg:pt-1">{n}/</p>
          <div className="min-w-0">
            <h2 className="kicker">{title}</h2>
            <div className="mt-6">{children}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- page ---------------- */

export default function HomePage() {
  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ---------- Hero: asymmetric, left-aligned, launcher in the flow ---------- */}
      <section className="mx-auto max-w-[1200px] px-5 pb-14 pt-12 sm:px-8 sm:pt-16">
        <div className="grid gap-10 lg:grid-cols-[7fr_5fr] lg:items-start lg:gap-12">
          <div className="min-w-0">
            <p className="stamp">Clawmart Studio / Agent factory</p>
            <h1 className="d1 mt-5 text-balance">
              Describe your company.{" "}
              <em className="font-display italic text-lobster">
                Watch a founding team build it.
              </em>
            </h1>
            <p className="mt-6 max-w-[62ch] text-pretty text-[17px] leading-[1.6] text-muted-foreground">
              Type a company or SaaS idea and five AI agents — strategist, brand,
              product, landing page, marketing — draft the whole thing while you watch: a
              business plan, an identity, a product spec, a live public page, and a launch
              kit.
            </p>
            <div className="mt-8">
              <StudioLauncher />
            </div>
          </div>

          <div className="min-w-0 lg:pt-2">
            <PipelineFigure />
            <SystemSpecs className="mt-5" />
          </div>
        </div>
      </section>

      {/* Owner's companies — renders nothing at all when signed out. */}
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <MyCompanies className="pb-16" />
      </div>

      {/* ---------- 01 / How it works ---------- */}
      <Section n="01" title="How it works" id="how">
        <div className="border-t border-[color:var(--rule)]">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="grid gap-x-6 gap-y-1 border-b border-[color:var(--border)] py-5 sm:grid-cols-[48px_minmax(0,20ch)_minmax(0,1fr)]"
            >
              <p className="stamp sm:pt-1">{s.n}</p>
              <h3 className="text-[15px] font-medium tracking-tight">{s.title}</h3>
              <p className="max-w-[68ch] text-[13.5px] leading-[1.55] text-muted-foreground">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------- 02 / The founding team ---------- */}
      <Section n="02" title="The founding team">
        <p className="max-w-[68ch] text-[15px] leading-[1.65] text-muted-foreground">
          Each agent has one job and hands its output to the next. Two run on a premium
          model where quality compounds; the rest run on a fast one. No black box — you
          watch every step.
        </p>
        <div className="seam-wall mt-6 sm:grid-cols-2 lg:grid-cols-5">
          {PIPELINE.map((key, i) => (
            <div key={key} className="flex flex-col gap-2 p-4">
              <span className="stamp text-tide">T{i + 1}</span>
              <p className="text-[14px] font-medium leading-tight tracking-tight">
                {AGENTS[key].title}
              </p>
              <p className="truncate font-mono text-[11px] text-tide" title={AGENTS[key].model}>
                {AGENTS[key].model}
              </p>
              <p className="text-[13px] leading-[1.55] text-muted-foreground">
                {TEAM_BLURB[key]}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------- 03 / The Agency ---------- */}
      <Section n="03" title="The Agency">
        <p className="max-w-[68ch] text-[15px] leading-[1.65] text-muted-foreground">
          The founding team drafts the company. The Agency is what comes after: give a
          live company a goal and an orchestrator staffs a handful of specialists, runs
          them in parallel waves, and hands you what each one produced.
        </p>
        <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3 border-y border-[color:var(--rule)] py-4">
          <div>
            <dt className="stamp">Specialists</dt>
            <dd className="tnum mt-1 font-mono text-[12.5px] text-tide">{ROSTER.length}</dd>
          </div>
          <div>
            <dt className="stamp">Divisions</dt>
            <dd className="tnum mt-1 font-mono text-[12.5px] text-tide">{DIVISIONS.length}</dd>
          </div>
          <div>
            <dt className="stamp">Dispatched from</dt>
            <dd className="mt-1 font-mono text-[12.5px] text-tide">a live company</dd>
          </div>
        </dl>
        <Link
          href="/agency"
          className="mt-6 inline-flex h-9 items-center gap-2 rounded-[3px] border border-[color:var(--rule)] px-4 text-[13.5px] font-semibold outline-none transition-colors duration-[120ms] hover:bg-accent"
        >
          See the roster →
        </Link>
      </Section>

      {/* ---------- 04 / The honest fine print ---------- */}
      <Section n="04" title="The honest fine print">
        <div className="well overflow-hidden">
          <p className="stamp border-b border-[color:var(--border)] px-5 py-2.5 text-sand">
            AI draft · read before you act on it
          </p>
          <div className="grid sm:grid-cols-2">
            {DISCLOSURES.map((d, i) => (
              <div
                key={d.title}
                className="border-b border-[color:var(--border)] p-5 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 sm:[&:nth-child(odd)]:border-r"
              >
                <h3 className="text-[14px] font-medium tracking-tight">
                  <span className="stamp mr-2 align-middle">{`0${i + 1}`}</span>
                  {d.title}
                </h3>
                <p className="mt-2 max-w-[68ch] text-[13.5px] leading-[1.55] text-muted-foreground">
                  {d.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}
