import Link from "next/link";
import { ArrowRight, Check, Package, Wrench } from "lucide-react";
import { PACKS, BUNDLE } from "@/lib/packs";
import { PackCard } from "@/components/site/pack-card";
import { InstallSteps } from "@/components/site/install-steps";
import { BuyButton } from "@/components/purchase/buy-button";
import { WaitlistForm } from "@/components/home/waitlist-form";
import {
  NON_AFFILIATION,
  OPENCLAW_URL,
  SKILLS_PATH,
  SUPPORT_EMAIL,
} from "@/components/site/constants";

/* ---------------- content ---------------- */

const ANSWER_CAPSULE =
  "Clawmart sells premium skill packs for OpenClaw, the self-hosted personal AI assistant. Each pack is a curated bundle of skills — built to the AgentSkills spec, with a setup guide — for one job: outbound sales, store ops, a personal chief of staff, or a content engine. Buy, download, drop into ~/.openclaw/skills, and start a new session.";

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "Isn't ClawHub free?",
    a: "Yes. ClawHub is OpenClaw's free public registry, and you can assemble skills yourself for nothing. What you pay clawmart for is the assembly: a curated, coherent set of skills for one specific job, chosen to work together, with a setup guide and example trigger phrases — so you skip the research and the trial-and-error. If that's not worth it to you, use ClawHub. Genuinely.",
  },
  {
    q: "Can't I just write these myself?",
    a: "Absolutely — and if you enjoy it, do. A pack is a shortcut: someone who knows the domain already wrote the skills, shaped them to work together, and packaged them to install in minutes. You're buying time and a known-good starting point, not a secret. Every pack is plain Markdown skill files you can read and edit.",
  },
  {
    q: "What exactly is a pack?",
    a: `A folder of skills — each a SKILL.md built to the OpenClaw AgentSkills spec — plus a README setup guide and an optional config example, delivered as a zip. You copy the skill folders into ${SKILLS_PATH} and start a new session. Nothing runs on our servers and nothing phones home.`,
  },
  {
    q: "Will it work with my setup?",
    a: "These are instruction bundles you adapt to your stack. Skills that touch email, a calendar, a store, or other tools assume you've connected those in OpenClaw — each README says exactly what to configure. They're curated and coherent, not tested against your exact environment. That's what the 14-day refund is for.",
  },
  {
    q: "How do I get the pack after paying?",
    a: "Checkout sends you to a private download page with a permanent link. Bookmark it — it's your receipt and your re-download. If email delivery is enabled, we also send the link to the address Stripe collects at checkout.",
  },
  {
    q: "What's the refund policy?",
    a: `14 days, no questions asked. Reply to your Stripe receipt or email ${SUPPORT_EMAIL} and we'll refund the purchase.`,
  },
  {
    q: "Is this affiliated with OpenClaw?",
    a: `No. ${NON_AFFILIATION} We use the name nominatively to describe what the packs are built for.`,
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
        "Clawmart is an independent storefront selling curated, ready-to-run skill packs for OpenClaw, the self-hosted personal AI assistant.",
    },
    {
      "@type": "WebSite",
      "@id": `${BASE}/#website`,
      name: "Clawmart",
      url: BASE,
      publisher: { "@id": `${BASE}/#organization` },
    },
    {
      "@type": "OfferCatalog",
      "@id": `${BASE}/#catalog`,
      name: "OpenClaw skill packs",
      itemListElement: [
        ...PACKS.map((p) => ({
          "@type": "Offer",
          price: p.priceUsd.toFixed(2),
          priceCurrency: "USD",
          url: `${BASE}/packs/${p.slug}`,
          itemOffered: {
            "@type": "Product",
            name: p.title,
            description: p.outcome,
          },
        })),
        {
          "@type": "Offer",
          price: BUNDLE.priceUsd.toFixed(2),
          priceCurrency: "USD",
          url: `${BASE}/packs/${BUNDLE.slug}`,
          itemOffered: {
            "@type": "Product",
            name: BUNDLE.title,
            description: BUNDLE.tagline,
          },
        },
      ],
    },
    {
      "@type": "FAQPage",
      "@id": `${BASE}/#faq`,
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

        <div className="relative mx-auto max-w-4xl px-5 pb-16 pt-20 text-center sm:px-6 sm:pt-28">
          <p className="anim-rise font-mono text-[12px] uppercase tracking-[0.22em] text-lobster">
            Premium skill packs · built for OpenClaw
          </p>
          <h1
            className="anim-rise mt-5 text-balance font-display text-[clamp(2.6rem,7vw,5rem)] leading-[1.02] tracking-tight"
            style={{ animationDelay: "80ms" }}
          >
            Make your assistant{" "}
            <em className="italic text-lobster">actually do the job</em>.
          </h1>
          <p
            className="anim-rise mx-auto mt-6 max-w-2xl text-pretty text-[16px] leading-relaxed text-muted-foreground sm:text-[17px]"
            style={{ animationDelay: "160ms" }}
          >
            Premium skill packs for{" "}
            <a
              href={OPENCLAW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline decoration-lobster/40 underline-offset-4 hover:decoration-lobster"
            >
              OpenClaw
            </a>
            , the self-hosted personal AI assistant. Curated, ready-to-run
            bundles built to the AgentSkills spec. Buy a pack, drop it into{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px] text-foreground/90">
              {SKILLS_PATH}
            </code>
            , start a new session.
          </p>
          <div
            className="anim-rise mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animationDelay: "240ms" }}
          >
            <Link
              href="/packs"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Browse the packs
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/packs#all-access"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-border px-6 text-[14px] font-medium transition-colors hover:bg-accent"
            >
              All-Access — ${BUNDLE.priceUsd}
            </Link>
          </div>
          <p
            className="anim-rise mt-5 text-[12.5px] text-muted-foreground"
            style={{ animationDelay: "300ms" }}
          >
            Free à-la-carte skills live on ClawHub. Clawmart is the assembled
            shortcut · 14-day refund on every pack.
          </p>
        </div>
      </section>

      {/* ---------- Answer capsule ---------- */}
      <section className="mx-auto max-w-3xl px-5 pb-20 sm:px-6">
        <figure className="relative rounded-2xl border border-lobster/25 bg-card/50 p-6 sm:p-8">
          <figcaption className="absolute -top-3 left-6 bg-background px-2 font-mono text-[11px] uppercase tracking-[0.18em] text-lobster">
            In one paragraph
          </figcaption>
          <p className="text-[15px] leading-relaxed text-foreground/90">
            {ANSWER_CAPSULE}
          </p>
        </figure>
      </section>

      {/* ---------- Featured packs ---------- */}
      <section id="packs" className="scroll-mt-20 border-t border-border py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
                The catalog
              </p>
              <h2 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
                Packs, one per job.
              </h2>
            </div>
            <Link
              href="/packs"
              className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-foreground/80 transition-colors hover:text-lobster"
            >
              See all packs
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {PACKS.map((pack) => (
              <PackCard key={pack.slug} pack={pack} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------- All-Access bundle ---------- */}
      <section id="all-access" className="scroll-mt-20 border-t border-border py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-lobster/35 bg-card/60 p-8 sm:p-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-lobster/10 blur-[90px]"
            />
            <div className="relative grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-center">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-lobster">
                  {BUNDLE.emoji} {BUNDLE.title}
                </p>
                <h2 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
                  Every pack, every future pack.
                </h2>
                <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                  {BUNDLE.tagline} If you run OpenClaw for more than one thing,
                  the bundle is the obvious call: all {PACKS.length} packs today
                  plus everything we ship next, at one price. Same 14-day refund.
                </p>
                <ul className="mt-6 grid gap-2 text-[13.5px] text-muted-foreground sm:grid-cols-2">
                  {PACKS.map((p) => (
                    <li key={p.slug} className="flex items-center gap-2">
                      <Check className="size-4 shrink-0 text-kelp" aria-hidden="true" />
                      {p.title}
                    </li>
                  ))}
                  <li className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-kelp" aria-hidden="true" />
                    All future packs
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl border border-border bg-background/60 p-6 text-center">
                <p className="font-display text-6xl">${BUNDLE.priceUsd}</p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  one-time · lifetime access
                </p>
                <BuyButton
                  slug={BUNDLE.slug}
                  label="Get All-Access"
                  className="mt-6 w-full"
                />
                <Link
                  href="/packs"
                  className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-lg text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  or buy a single pack — ${PACKS[0]?.priceUsd}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Packs vs free ClawHub ---------- */}
      <section className="border-t border-border py-20 sm:py-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
            The honest version
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-4xl tracking-tight sm:text-5xl">
            What you&apos;re actually paying for.
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            Same spec. Same kind of files. The difference is assembly and time —
            not access. Here&apos;s the real comparison.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card/40 p-7">
              <div className="flex items-center gap-2.5">
                <Wrench className="size-4.5 text-muted-foreground" aria-hidden="true" />
                <h3 className="text-[15px] font-semibold tracking-tight">
                  Free on ClawHub
                </h3>
              </div>
              <ul className="mt-5 space-y-2.5 text-[13.5px] leading-relaxed text-muted-foreground">
                <li>Individual skills, à la carte, community-maintained.</li>
                <li>You research which skills you need and how they fit.</li>
                <li>You wire them together and tune the trigger phrases.</li>
                <li>Costs $0 — and your time.</li>
              </ul>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-lobster/35 bg-card/60 p-7">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-lobster/10 blur-[60px]"
              />
              <div className="relative flex items-center gap-2.5">
                <Package className="size-4.5 text-lobster" aria-hidden="true" />
                <h3 className="text-[15px] font-semibold tracking-tight">
                  A clawmart pack
                </h3>
              </div>
              <ul className="relative mt-5 space-y-2.5 text-[13.5px] leading-relaxed text-muted-foreground">
                <li>A curated set of skills for one job, chosen to work together.</li>
                <li>A README setup guide with what to configure and how to use it.</li>
                <li>Installs in minutes; editable Markdown you own.</li>
                <li>${PACKS[0]?.priceUsd} per pack · 14-day refund.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="border-t border-border py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
            How it works
          </p>
          <h2 className="mt-3 max-w-xl font-display text-4xl tracking-tight sm:text-5xl">
            Buy, download, drop in, done.
          </h2>
          <div className="mt-12">
            <InstallSteps />
          </div>
        </div>
      </section>

      {/* ---------- Studio ---------- */}
      <section className="border-t border-border py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <div className="relative overflow-hidden rounded-2xl border border-lobster/35 bg-card/60 p-8 sm:p-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-20 -top-20 size-56 rounded-full bg-lobster/10 blur-[70px]"
            />
            <p className="relative font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
              New — Clawmart Studio
            </p>
            <h2 className="relative mt-3 max-w-2xl font-display text-4xl tracking-tight sm:text-5xl">
              Describe a company. Watch an AI founding team build it.
            </h2>
            <p className="relative mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
              Type a company or SaaS idea and five agents — strategist, brand,
              product, landing page, marketing — draft the whole thing live:
              business plan, name and identity, product spec, a public landing
              page, and a launch kit. Free to try. AI-generated drafts, honestly
              labeled — not guarantees.
            </p>
            <Link
              href="/studio"
              className="relative mt-8 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Open the Studio
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- Waitlist ---------- */}
      <section className="border-t border-border py-16">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-lg">
            <h2 className="font-display text-3xl tracking-tight">
              Want to hear about new packs?
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              We&apos;re building more verticals. Drop your email and we&apos;ll
              tell you when a new pack ships — that&apos;s the only thing
              we&apos;ll send you.
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
            {NON_AFFILIATION}
          </p>
        </div>
      </section>
    </div>
  );
}
