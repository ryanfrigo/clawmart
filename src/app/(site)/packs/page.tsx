import type { Metadata } from "next";
import { Check } from "lucide-react";
import { PACKS, BUNDLE } from "@/lib/packs";
import { PackCard } from "@/components/site/pack-card";
import { BuyButton } from "@/components/purchase/buy-button";
import { InstallSteps } from "@/components/site/install-steps";
import { NON_AFFILIATION } from "@/components/site/constants";

export const metadata: Metadata = {
  title: "All packs",
  description:
    "Every premium skill pack for OpenClaw, plus the All-Access bundle. Curated, ready-to-run skill bundles built to the AgentSkills spec. 14-day refund.",
  alternates: { canonical: "/packs" },
};

export default function PacksPage() {
  return (
    <div>
      {/* ---------- Header ---------- */}
      <section className="relative overflow-hidden border-b border-border">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/2 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-lobster/[0.06] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
          <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-lobster">
            The catalog
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-[clamp(2.5rem,6vw,4rem)] leading-[1.04] tracking-tight">
            Premium skill packs for OpenClaw.
          </h1>
          <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-muted-foreground">
            Each pack is a curated bundle of skills for one job — built to the
            AgentSkills spec, with a setup guide. Buy a single pack, or get the
            All-Access bundle for everything. Every purchase carries a 14-day
            refund.
          </p>
        </div>
      </section>

      {/* ---------- Pack grid ---------- */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {PACKS.map((pack) => (
              <PackCard key={pack.slug} pack={pack} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------- All-Access bundle ---------- */}
      <section id="all-access" className="scroll-mt-20 border-t border-border py-16 sm:py-20">
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
                  Everything, one price.
                </h2>
                <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                  {BUNDLE.tagline} All {PACKS.length} packs today, plus every
                  future pack we ship — added to your download automatically.
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
                <p className="mt-3 text-[12px] text-muted-foreground">
                  14-day refund · guest checkout
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="border-t border-border py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
            After you buy
          </p>
          <h2 className="mt-3 max-w-xl font-display text-4xl tracking-tight sm:text-5xl">
            Installing a pack.
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
