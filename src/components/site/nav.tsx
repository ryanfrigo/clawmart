import Link from "next/link";
import { ClawMark, Wordmark } from "@/components/site/logo";

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl print:hidden">
      <nav
        aria-label="Main"
        className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-6"
      >
        <Link href="/" className="flex items-center gap-2.5">
          <ClawMark />
          <Wordmark />
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/packs"
            className="rounded-md px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Packs
          </Link>
          <Link
            href="/free"
            className="rounded-md px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Free
          </Link>
          <Link
            href="/about"
            className="rounded-md px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            About
          </Link>
          <Link
            href="/packs"
            className="ml-1 inline-flex h-8 items-center rounded-lg bg-primary px-3.5 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Browse packs
          </Link>
        </div>
      </nav>
    </header>
  );
}
