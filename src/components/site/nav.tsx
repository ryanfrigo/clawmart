import Link from "next/link";
import { ClawMark, Wordmark } from "@/components/site/logo";
import { NavAuth } from "@/components/site/nav-auth";

// "How it works" is an in-page anchor and the only one that can be dropped on a
// narrow viewport without stranding a destination — the other two are pages,
// and a nav with no links is not a nav.
const LINKS = [
  { href: "/#how", label: "How it works", narrow: false },
  { href: "/agency", label: "Agency", narrow: true },
  { href: "/about", label: "About", narrow: true },
];

/**
 * A 52px chrome edge, not a card. The backdrop blur here is the one permitted
 * exception to the opaque-surfaces rule: it is the seam between the page and
 * the viewport, and it has to let the floor show through as content scrolls
 * under it.
 */
export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[color:var(--rule)] bg-background/88 backdrop-blur-xl print:hidden">
      <nav
        aria-label="Main"
        className="mx-auto flex h-13 max-w-[1200px] items-center justify-between gap-4 px-5 sm:px-8"
      >
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-[3px] outline-none"
        >
          <ClawMark />
          <Wordmark />
        </Link>
        <div className="flex items-center gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                l.narrow
                  ? "inline-flex rounded-[3px] px-2 py-1.5 text-[12.5px] text-muted-foreground transition-colors duration-[120ms] hover:text-foreground sm:px-2.5"
                  : "hidden rounded-[3px] px-2.5 py-1.5 text-[12.5px] text-muted-foreground transition-colors duration-[120ms] hover:text-foreground sm:inline-flex"
              }
            >
              {l.label}
            </Link>
          ))}
          <NavAuth />
        </div>
      </nav>
    </header>
  );
}
