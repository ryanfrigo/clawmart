import Link from "next/link";
import { ClawMark, Wordmark } from "@/components/site/logo";
import { NON_AFFILIATION, SUPPORT_EMAIL } from "@/components/site/constants";

const columns: Array<{ heading: string; links: Array<{ label: string; href: string }> }> = [
  {
    heading: "Studio",
    links: [
      { label: "How it works", href: "/#how" },
      { label: "About", href: "/about" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
      { label: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border print:hidden">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6">
        <div className="flex flex-col justify-between gap-10 md:flex-row">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <ClawMark />
              <Wordmark />
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
              Describe a company. A founding team of AI agents drafts it live —
              plan, brand, product spec, public page, launch kit.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10">
            {columns.map((col) => (
              <div key={col.heading}>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {col.heading}
                </p>
                <ul className="mt-3 space-y-2">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="text-[13px] text-foreground/80 transition-colors hover:text-foreground"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 border-t border-border pt-6">
          {/* Legacy pack delivery/refunds still reference OpenClaw by name, so
              the binding non-affiliation disclosure stays site-wide. */}
          <p className="text-[12px] leading-relaxed text-muted-foreground/80">
            {NON_AFFILIATION}
          </p>
          <p className="mt-2 text-[12px] text-muted-foreground">
            © {new Date().getFullYear()} Clawmart 🦞
          </p>
        </div>
      </div>
    </footer>
  );
}
