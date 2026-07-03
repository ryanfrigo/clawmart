import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LANDING_PAGES, getLanding, type LandingPage } from "@/lib/landing";
import { getPack, BUNDLE, priceForSlug } from "@/lib/packs";
import { BuyButton } from "@/components/purchase/buy-button";
import { NON_AFFILIATION } from "@/components/site/constants";

const BASE = "https://clawmart.co";

export function generateStaticParams() {
  return LANDING_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getLanding(slug);
  if (!page) return {};
  return {
    title: page.seoTitle,
    description: page.metaDescription,
    keywords: page.targetKeywords,
    alternates: { canonical: `${BASE}/openclaw/${slug}` },
    openGraph: {
      title: page.seoTitle,
      description: page.metaDescription,
      url: `${BASE}/openclaw/${slug}`,
      type: "article",
    },
  };
}

/* ---- minimal markdown-lite rendering for authored content ---- */

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  // split on **bold** and `code`
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    const key = `${keyBase}-${i}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={key} className="font-medium text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={key}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px] text-foreground/90"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={key}>{part}</span>;
  });
}

function Body({ body }: { body: string }) {
  const blocks = body.split(/\n\n+/);
  return (
    <div className="space-y-4 text-[15.5px] leading-relaxed text-muted-foreground">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const isList = lines.every((l) => l.trim().startsWith("- "));
        if (isList) {
          return (
            <ul key={i} className="space-y-2 pl-1">
              {lines.map((l, j) => (
                <li key={j} className="flex gap-2.5">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-lobster/70" />
                  <span>{renderInline(l.trim().slice(2), `${i}-${j}`)}</span>
                </li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{renderInline(block, `${i}`)}</p>;
      })}
    </div>
  );
}

export default async function LandingRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getLanding(slug);
  if (!page) notFound();

  const isBundleCta = page.ctaPackSlug === BUNDLE.slug;
  const pack = isBundleCta ? null : getPack(page.ctaPackSlug);
  const ctaTitle = isBundleCta ? BUNDLE.title : pack?.title ?? "the pack";
  const ctaPrice = priceForSlug(page.ctaPackSlug) ?? 39;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "FAQPage",
        "@id": `${BASE}/openclaw/${slug}#faq`,
        mainEntity: page.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Clawmart", item: BASE },
          {
            "@type": "ListItem",
            position: 2,
            name: page.h1,
            item: `${BASE}/openclaw/${slug}`,
          },
        ],
      },
    ],
  };

  return (
    <PageBody page={page} jsonLd={jsonLd} ctaTitle={ctaTitle} ctaPrice={ctaPrice} ctaSlug={page.ctaPackSlug} packSlug={pack?.slug} />
  );
}

function PageBody({
  page,
  jsonLd,
  ctaTitle,
  ctaPrice,
  ctaSlug,
  packSlug,
}: {
  page: LandingPage;
  jsonLd: object;
  ctaTitle: string;
  ctaPrice: number;
  ctaSlug: string;
  packSlug?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-6 sm:py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="font-mono text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Clawmart
        </Link>{" "}
        / OpenClaw
      </nav>

      <h1 className="mt-4 font-display text-[clamp(2.1rem,5vw,3.4rem)] leading-[1.06] tracking-tight">
        {page.h1}
      </h1>

      {/* answer capsule */}
      <div className="mt-6 rounded-2xl border border-lobster/25 bg-lobster/[0.04] p-5 sm:p-6">
        <p className="text-[15.5px] leading-relaxed text-foreground/90">
          {page.answerCapsule}
        </p>
      </div>

      {/* sections */}
      <div className="mt-12 space-y-12">
        {page.sections.map((s, i) => (
          <section key={i}>
            <h2 className="font-display text-[1.7rem] leading-tight tracking-tight">
              {s.heading}
            </h2>
            <div className="mt-4">
              <Body body={s.body} />
            </div>
          </section>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-14 rounded-2xl border border-border/60 bg-card/40 p-6 sm:p-8">
        <h2 className="font-display text-2xl tracking-tight">
          Get the {ctaTitle} — ${ctaPrice}
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          Curated, ready-to-run, with a setup guide. 14-day refund. Or grab the
          three free sample skills first.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <BuyButton slug={ctaSlug} label={`Get the ${ctaTitle} — $${ctaPrice}`} />
          {packSlug && (
            <Link
              href={`/packs/${packSlug}`}
              className="inline-flex items-center gap-1 text-[14px] text-lobster underline-offset-2 hover:underline"
            >
              See what&apos;s inside <ArrowRight className="size-3.5" />
            </Link>
          )}
          <Link
            href="/free"
            className="inline-flex items-center gap-1 text-[14px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Try 3 free skills
          </Link>
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-14">
        <h2 className="font-display text-2xl tracking-tight">Questions</h2>
        <dl className="mt-6 space-y-6">
          {page.faq.map((f, i) => (
            <div key={i}>
              <dt className="font-medium text-foreground">{f.q}</dt>
              <dd className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">
                {f.a}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="mt-14 border-t border-border/50 pt-6 text-[13px] text-muted-foreground">
        {NON_AFFILIATION}
      </p>
    </div>
  );
}
