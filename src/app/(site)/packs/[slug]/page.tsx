import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, FileText, ShieldCheck } from "lucide-react";
import { PACKS, BUNDLE, getPack, isBundle, type Pack } from "@/lib/packs";
import { PACK_FILES } from "@/lib/pack-contents";
import { BuyButton } from "@/components/purchase/buy-button";
import { CryptoBuyButton } from "@/components/purchase/crypto-buy-button";
import { InstallSteps } from "@/components/site/install-steps";
import {
  NON_AFFILIATION,
  REFUND_LINE,
  SKILLS_PATH,
} from "@/components/site/constants";

const BASE = "https://clawmart.co";

export function generateStaticParams() {
  return [...PACKS.map((p) => ({ slug: p.slug })), { slug: BUNDLE.slug }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  if (isBundle(slug)) {
    return {
      title: BUNDLE.title,
      description: `${BUNDLE.tagline} Every OpenClaw skill pack plus all future packs, for $${BUNDLE.priceUsd}. 14-day refund.`,
      alternates: { canonical: `/packs/${BUNDLE.slug}` },
    };
  }

  const pack = getPack(slug);
  if (!pack) return { title: "Pack not found" };

  return {
    title: pack.title,
    description: pack.outcome,
    keywords: pack.seoKeywords,
    alternates: { canonical: `/packs/${pack.slug}` },
    openGraph: {
      title: `${pack.title} · Clawmart`,
      description: pack.outcome,
      url: `${BASE}/packs/${pack.slug}`,
      type: "website",
    },
  };
}

/* ---------------- shared bits ---------------- */

function RefundNote() {
  return (
    <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-border bg-card/40 p-3.5">
      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-kelp" aria-hidden="true" />
      <p className="text-[12.5px] leading-relaxed text-muted-foreground">
        {REFUND_LINE} Guest checkout via Stripe — no account needed.
      </p>
    </div>
  );
}

function DetailHeader({
  eyebrow,
  emoji,
  title,
  lead,
}: {
  eyebrow: string;
  emoji: string;
  title: string;
  lead: string;
}) {
  return (
    <div className="relative">
      <Link
        href="/packs"
        className="inline-flex items-center gap-1.5 font-mono text-[12px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        All packs
      </Link>
      <div className="mt-6 flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-card text-2xl">
          <span aria-hidden="true">{emoji}</span>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-lobster">
          {eyebrow}
        </span>
      </div>
      <h1 className="mt-5 max-w-2xl font-display text-[clamp(2.4rem,5.5vw,3.75rem)] leading-[1.05] tracking-tight">
        {title}
      </h1>
      <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-muted-foreground">
        {lead}
      </p>
    </div>
  );
}

/* ---------------- pack detail ---------------- */

function PackDetail({ pack }: { pack: Pack }) {
  const files = PACK_FILES[pack.slug] ?? [];
  const sampleFile = files.find(
    (f) =>
      f.path === `${pack.sampleSkillName}/SKILL.md` ||
      f.path.endsWith(`/${pack.sampleSkillName}/SKILL.md`),
  );
  const sampleSkill = pack.skills.find((s) => s.name === pack.sampleSkillName);

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: pack.title,
    description: pack.outcome,
    category: pack.vertical,
    brand: { "@type": "Brand", name: "Clawmart" },
    offers: {
      "@type": "Offer",
      price: pack.priceUsd.toFixed(2),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `${BASE}/packs/${pack.slug}`,
    },
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
      />

      {/* header + buy */}
      <section className="relative overflow-hidden border-b border-border">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 right-[10%] h-[380px] w-[520px] rounded-full bg-lobster/[0.06] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:items-start">
            <DetailHeader
              eyebrow={pack.vertical}
              emoji={pack.emoji}
              title={pack.tagline}
              lead={pack.outcome}
            />

            {/* buy card */}
            <div className="rounded-2xl border border-lobster/30 bg-card/60 p-6 lg:sticky lg:top-20">
              <p className="font-display text-5xl">
                ${pack.priceUsd}
                <span className="ml-2 font-sans text-[14px] text-muted-foreground">
                  one-time
                </span>
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {pack.skills.length} skills · instant download
              </p>
              <BuyButton
                slug={pack.slug}
                label={`Buy ${pack.title}`}
                className="mt-5 w-full"
              />
              <div className="mt-2.5 text-center">
                <CryptoBuyButton slug={pack.slug} />
              </div>
              <RefundNote />
              <p className="mt-4 border-t border-border pt-4 text-[12px] leading-relaxed text-muted-foreground">
                Prefer everything? The{" "}
                <Link
                  href={`/packs/${BUNDLE.slug}`}
                  className="text-foreground underline underline-offset-4 hover:text-lobster"
                >
                  All-Access bundle
                </Link>{" "}
                includes this pack for ${BUNDLE.priceUsd}.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* who it's for */}
      <section className="border-b border-border py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Who it&apos;s for
              </p>
              <p className="mt-3 text-[16px] leading-relaxed text-foreground/90">
                {pack.forWho}
              </p>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                What changes after installing
              </p>
              <p className="mt-3 text-[16px] leading-relaxed text-foreground/90">
                {pack.outcome}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* what's inside */}
      <section className="border-b border-border py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
            What&apos;s inside
          </p>
          <h2 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
            {pack.skills.length} skills, one job.
          </h2>
          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
            {pack.skills.map((s) => (
              <div key={s.name} className="bg-background p-6">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-lobster" aria-hidden="true" />
                  <code className="font-mono text-[13px] text-foreground/90">
                    {s.name}
                  </code>
                  {s.name === pack.sampleSkillName && (
                    <span className="ml-auto rounded-full border border-lobster/30 bg-lobster/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-lobster">
                      sample
                    </span>
                  )}
                </div>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-muted-foreground">
                  {s.summary}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* free sample skill */}
      <section className="border-b border-border py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
            See before you buy
          </p>
          <h2 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
            Sample skill:{" "}
            <code className="font-mono text-[0.7em] text-lobster">
              {pack.sampleSkillName}
            </code>
          </h2>
          <p className="mt-4 max-w-2xl text-[14.5px] leading-relaxed text-muted-foreground">
            This is one of the actual skill files in the pack — the real
            SKILL.md, exactly as your assistant would load it. It shows the
            depth and shape of what you&apos;re buying.
          </p>

          {sampleFile ? (
            <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-abyss/50">
              <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
                <FileText className="size-3.5 text-muted-foreground" aria-hidden="true" />
                <span className="font-mono text-[12px] text-muted-foreground">
                  {sampleFile.path}
                </span>
              </div>
              <pre className="max-h-[32rem] overflow-auto p-5 font-mono text-[12.5px] leading-relaxed text-foreground/90">
                <code>{sampleFile.content}</code>
              </pre>
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-border bg-card/40 p-6">
              <p className="text-[14px] leading-relaxed text-muted-foreground">
                {sampleSkill
                  ? `“${pack.sampleSkillName}” ${sampleSkill.summary.charAt(0).toLowerCase()}${sampleSkill.summary.slice(1)}`
                  : `The “${pack.sampleSkillName}” skill is one of ${pack.skills.length} in this pack.`}{" "}
                The full SKILL.md ships in the download — you get the complete
                file, not a preview.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* install */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
            How to install
          </p>
          <h2 className="mt-3 max-w-xl font-display text-4xl tracking-tight sm:text-5xl">
            Live in a couple of minutes.
          </h2>
          <p className="mt-4 max-w-2xl text-[14.5px] leading-relaxed text-muted-foreground">
            Unzip, copy the skill folders into{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px] text-foreground/90">
              {SKILLS_PATH}
            </code>
            , and start a new OpenClaw session. The pack&apos;s README lists the
            trigger phrases and anything to configure.
          </p>
          <div className="mt-10">
            <InstallSteps />
          </div>
          <p className="mt-8 text-[12px] leading-relaxed text-muted-foreground">
            {NON_AFFILIATION}
          </p>
        </div>
      </section>
    </div>
  );
}

/* ---------------- bundle detail ---------------- */

function BundleDetail() {
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: BUNDLE.title,
    description: BUNDLE.tagline,
    brand: { "@type": "Brand", name: "Clawmart" },
    offers: {
      "@type": "Offer",
      price: BUNDLE.priceUsd.toFixed(2),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `${BASE}/packs/${BUNDLE.slug}`,
    },
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
      />

      <section className="relative overflow-hidden border-b border-border">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 right-[10%] h-[380px] w-[520px] rounded-full bg-lobster/[0.07] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:items-start">
            <DetailHeader
              eyebrow="Bundle"
              emoji={BUNDLE.emoji}
              title="Every pack. One price. Forever."
              lead={`${BUNDLE.tagline} Buy once and get all ${PACKS.length} packs today plus every future pack, added to your download automatically.`}
            />

            <div className="rounded-2xl border border-lobster/30 bg-card/60 p-6 lg:sticky lg:top-20">
              <p className="font-display text-6xl">
                ${BUNDLE.priceUsd}
                <span className="ml-2 font-sans text-[14px] text-muted-foreground">
                  one-time
                </span>
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {PACKS.length} packs + all future packs
              </p>
              <BuyButton
                slug={BUNDLE.slug}
                label="Get All-Access"
                className="mt-5 w-full"
              />
              <RefundNote />
            </div>
          </div>
        </div>
      </section>

      {/* included packs */}
      <section className="border-b border-border py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
            What&apos;s included
          </p>
          <h2 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
            All {PACKS.length} packs.
          </h2>
          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
            {PACKS.map((p) => (
              <Link
                key={p.slug}
                href={`/packs/${p.slug}`}
                className="group bg-background p-6 transition-colors hover:bg-card"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl" aria-hidden="true">
                    {p.emoji}
                  </span>
                  <h3 className="font-display text-xl tracking-tight">
                    {p.title}
                  </h3>
                  <Check className="ml-auto size-4 text-kelp" aria-hidden="true" />
                </div>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                  {p.tagline}
                </p>
                <p className="mt-3 font-mono text-[11px] text-muted-foreground/70">
                  {p.skills.length} skills · normally ${p.priceUsd}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* install */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
            How to install
          </p>
          <h2 className="mt-3 max-w-xl font-display text-4xl tracking-tight sm:text-5xl">
            Same simple flow.
          </h2>
          <div className="mt-10">
            <InstallSteps />
          </div>
          <p className="mt-8 text-[12px] leading-relaxed text-muted-foreground">
            {NON_AFFILIATION}
          </p>
        </div>
      </section>
    </div>
  );
}

/* ---------------- page ---------------- */

export default async function PackDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (isBundle(slug)) return <BundleDetail />;

  const pack = getPack(slug);
  if (!pack) notFound();

  return <PackDetail pack={pack} />;
}
