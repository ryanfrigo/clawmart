import { cache } from "react";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { getConvexClient } from "@/lib/convex-server";
import { api } from "../../../../convex/_generated/api";
import { CompanyWaitlist } from "@/components/studio/company-waitlist";

export const dynamic = "force-dynamic";

/* ---------------- color + parsing helpers (defensive) ---------------- */

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const FALLBACK_PRIMARY = "#f4693b"; // lobster coral
const FALLBACK_ACCENT = "#5cc8d6"; // tide

function luminance(hex: string): number {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Valid hex AND bright enough to read against the fixed dark page — a model
 * can return #111827 as an "accent", which passes a format check but renders
 * the hero eyebrow and CTA invisible. Too-dark colors fall back.
 */
function safeHex(v: unknown, fallback: string): string {
  const hex = typeof v === "string" && HEX.test(v.trim()) ? v.trim() : fallback;
  return luminance(hex) < 0.25 ? fallback : hex;
}

function pickInk(hex: string): string {
  return luminance(hex) > 0.6 ? "#0a0e17" : "#f6f7f9";
}

function parse(json: string | null): Record<string, unknown> | null {
  if (!json) return null;
  try {
    const v = JSON.parse(json);
    return v && typeof v === "object" && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v : null;
const list = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v)
    ? v
        .map((x) => (x && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : null))
        .filter((x): x is Record<string, unknown> => !!x)
    : [];
const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(str).filter((s): s is string => !!s) : [];
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

/* ---------------- data ---------------- */

// Deduped per request: generateMetadata and the page share one query.
const fetchCompany = cache(async (slug: string) =>
  getConvexClient().query(api.companies.getPublicBySlug, { slug })
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const company = await fetchCompany(slug);
  if (!company) return { title: "Company not found", robots: { index: false } };
  const title = company.tagline ? `${company.name} — ${company.tagline}` : company.name;
  const description =
    company.tagline ?? `${company.name} — an AI-drafted concept company built with Clawmart Studio.`;
  return {
    // Absolute: a standalone company site shouldn't inherit the "· Clawmart"
    // template suffix from the root layout.
    title: { absolute: title },
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image" },
  };
}

// Browser chrome (mobile address bar) matches the brand background so the
// page reads as its own site. Defensive: brand JSON is model output.
export async function generateViewport({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Viewport> {
  const { slug } = await params;
  const company = await fetchCompany(slug).catch(() => null);
  const colors = obj(parse(company?.brand ?? null)?.colors);
  const bg = colors.background;
  const themeColor =
    typeof bg === "string" && HEX.test(bg.trim()) ? bg.trim() : "#0a0e17";
  return { themeColor };
}

/* ---------------- colophon strip (required, honest) ---------------- */

// Styled as a standalone site's colophon, not clawmart chrome: one quiet
// strip at the very bottom. The attribution + "not real yet" line must stay.
function ConceptFooter() {
  return (
    <footer className="mt-auto border-t border-border/50">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-1.5 px-5 py-5 text-center sm:flex-row sm:gap-6 sm:px-6 sm:text-left">
        <p className="text-[12px] leading-relaxed text-muted-foreground/80">
          An AI-drafted concept company — built with{" "}
          <a
            href="https://clawmart.co"
            className="underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Clawmart Studio
          </a>
          .
        </p>
        <p className="text-[12px] leading-relaxed text-muted-foreground/60">
          Not a real product yet. Join the waitlist to show demand.
        </p>
      </div>
    </footer>
  );
}

/* ---------------- page ---------------- */

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const company = await fetchCompany(slug);
  if (!company) notFound();

  // No landing asset yet (first build in progress or failed before the
  // landing step): tasteful holding page with just the name. A company with
  // assets keeps its page up even if a later rebuild fails mid-way.
  if (!company.landing) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-5 py-24 text-center sm:px-6">
          <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-lobster">
            {company.status === "failed" ? "Build incomplete" : "Building"}
          </p>
          <h1 className="mt-4 font-display text-[clamp(2.2rem,6vw,3.6rem)] leading-tight tracking-tight">
            {company.name}
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            {company.status === "failed"
              ? "This concept company didn't finish building. Its page will appear here once it's rebuilt."
              : "The founding team is still drafting this company. Its public page appears here the moment the build finishes."}
          </p>
        </div>
        <ConceptFooter />
      </div>
    );
  }

  const landing = parse(company.landing);
  const brand = parse(company.brand);
  const colors = obj(brand?.colors);
  const primary = safeHex(colors.primary, FALLBACK_PRIMARY);
  const accent = safeHex(colors.accent, FALLBACK_ACCENT);
  const ink = pickInk(primary);

  const hero = obj(landing?.hero);
  const features = list(landing?.features);
  const how = list(landing?.how);
  const pricing = list(landing?.pricing);
  const faq = list(landing?.faq);
  const finalCta = obj(landing?.finalCta);

  const heroCta = str(hero.cta) ?? "Join the waitlist";
  // Immutable attribution key — survives slug changes, cleaned up on delete.
  const waitlistSource = `co:${company.companyId}`;
  const finalCtaText = str(finalCta.cta) ?? "Join the waitlist";

  return (
    <div
      className="flex min-h-screen flex-col bg-background"
      style={{ "--co-primary": primary, "--co-accent": accent } as React.CSSProperties}
    >
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div
            className="absolute -top-40 left-1/2 h-[480px] w-[860px] -translate-x-1/2 rounded-full blur-[130px]"
            style={{ backgroundColor: primary, opacity: 0.1 }}
          />
        </div>
        {/* No site nav above this hero — it carries its own top breathing room. */}
        <div className="relative mx-auto max-w-3xl px-5 pb-20 pt-28 text-center sm:px-6 sm:pt-36">
          <p className="font-mono text-[12px] uppercase tracking-[0.22em]" style={{ color: accent }}>
            {company.name}
          </p>
          <h1 className="mt-5 text-balance font-display text-[clamp(2.6rem,7vw,4.8rem)] leading-[1.02] tracking-tight">
            {str(hero.headline) ?? company.name}
          </h1>
          {str(hero.subheadline) && (
            <p className="mx-auto mt-6 max-w-xl text-pretty text-[16px] leading-relaxed text-muted-foreground sm:text-[17px]">
              {str(hero.subheadline)}
            </p>
          )}
          <div className="mt-9 flex justify-center">
            <CompanyWaitlist source={waitlistSource} cta={heroCta} accent={primary} ink={ink} />
          </div>
        </div>
      </section>

      {/* ---------- Features ---------- */}
      {features.length > 0 && (
        <section className="border-b border-border/60 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => (
                <div key={i} className="rounded-2xl border border-border bg-card/40 p-6">
                  <div
                    aria-hidden="true"
                    className="size-2 rounded-full"
                    style={{ backgroundColor: accent }}
                  />
                  {str(f.title) && (
                    <h3 className="mt-4 text-[16px] font-semibold tracking-tight">{str(f.title)}</h3>
                  )}
                  {str(f.description) && (
                    <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                      {str(f.description)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- How it works ---------- */}
      {how.length > 0 && (
        <section className="border-b border-border/60 py-20 sm:py-24">
          <div className="mx-auto max-w-5xl px-5 sm:px-6">
            <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
              How it works
            </p>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {how.slice(0, 3).map((s, i) => (
                <div key={i}>
                  <span
                    className="inline-flex size-9 items-center justify-center rounded-lg font-mono text-[14px]"
                    style={{ backgroundColor: primary, color: ink }}
                  >
                    {i + 1}
                  </span>
                  {str(s.step) && (
                    <h3 className="mt-4 text-[15px] font-semibold tracking-tight">{str(s.step)}</h3>
                  )}
                  {str(s.description) && (
                    <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                      {str(s.description)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- Pricing ---------- */}
      {pricing.length > 0 && (
        <section className="border-b border-border/60 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <h2 className="text-center font-display text-4xl tracking-tight sm:text-5xl">Pricing</h2>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pricing.map((p, i) => {
                const highlighted = p.highlighted === true;
                return (
                  <div
                    key={i}
                    className="rounded-2xl border bg-card/40 p-6"
                    style={
                      highlighted
                        ? { borderColor: accent, boxShadow: `0 0 0 1px ${accent}` }
                        : undefined
                    }
                  >
                    {str(p.tier) && (
                      <p className="text-[14px] font-medium text-foreground">{str(p.tier)}</p>
                    )}
                    {str(p.price) && (
                      <p className="mt-2 font-display text-4xl tracking-tight">{str(p.price)}</p>
                    )}
                    {strList(p.includes).length > 0 && (
                      <ul className="mt-5 space-y-2">
                        {strList(p.includes).map((inc, j) => (
                          <li
                            key={j}
                            className="flex gap-2 text-[13px] leading-relaxed text-muted-foreground"
                          >
                            <span
                              aria-hidden="true"
                              className="mt-1.5 size-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: accent }}
                            />
                            {inc}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ---------- FAQ ---------- */}
      {faq.length > 0 && (
        <section className="border-b border-border/60 py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-5 sm:px-6">
            <h2 className="font-display text-4xl tracking-tight sm:text-5xl">FAQ</h2>
            <div className="mt-8 space-y-8">
              {faq.map((f, i) => (
                <div key={i}>
                  {str(f.q) && (
                    <h3 className="font-display text-xl tracking-tight sm:text-2xl">{str(f.q)}</h3>
                  )}
                  {str(f.a) && (
                    <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                      {str(f.a)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- Final CTA ---------- */}
      <section className="py-24">
        <div className="mx-auto max-w-2xl px-5 text-center sm:px-6">
          <h2 className="text-balance font-display text-[clamp(2rem,5vw,3.25rem)] leading-tight tracking-tight">
            {str(finalCta.headline) ?? "Be the first to try it."}
          </h2>
          <div className="mt-8 flex justify-center">
            <CompanyWaitlist source={waitlistSource} cta={finalCtaText} accent={primary} ink={ink} />
          </div>
        </div>
      </section>

      <ConceptFooter />
    </div>
  );
}
