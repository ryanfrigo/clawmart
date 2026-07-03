import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Pack } from "@/lib/packs";

/**
 * A single pack tile — used on the homepage grid and the /packs catalog.
 * Links through to the pack detail page. No fabricated stats: we show the
 * real skill count and price from packs.ts.
 */
export function PackCard({ pack }: { pack: Pack }) {
  return (
    <Link
      href={`/packs/${pack.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card/50 p-6 transition-colors hover:border-lobster/40 hover:bg-card sm:p-7"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-lobster/[0.06] blur-[60px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />
      <div className="relative flex items-start justify-between">
        <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-background text-xl">
          <span aria-hidden="true">{pack.emoji}</span>
        </div>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
          {pack.vertical}
        </span>
      </div>

      <h3 className="relative mt-5 font-display text-2xl leading-tight tracking-tight">
        {pack.title}
      </h3>
      <p className="relative mt-2.5 flex-1 text-[13.5px] leading-relaxed text-muted-foreground">
        {pack.tagline}
      </p>

      <div className="relative mt-6 flex items-end justify-between border-t border-border pt-4">
        <div>
          <p className="font-mono text-[11px] text-muted-foreground">
            {pack.skills.length} skills
          </p>
          <p className="mt-1 font-display text-2xl">
            ${pack.priceUsd}
            <span className="ml-1 font-sans text-[12px] text-muted-foreground">
              one-time
            </span>
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-[13px] font-medium text-foreground/80 transition-colors group-hover:text-lobster">
          View pack
          <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  );
}
