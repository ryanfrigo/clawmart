"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * App-wide error boundary.
 *
 * /studio/[id] had its own; everything else — home, /agency, /c/[slug], the
 * sign-in page — fell through to Next's default error screen, which is
 * unstyled, says "Application error: a client-side exception has occurred",
 * and offers no way out. That is a rough thing for a stranger's first visit to
 * hit on launch day.
 *
 * The message deliberately does not guess at a cause: this catches anything,
 * so claiming to know what broke would usually be wrong.
 */
export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-5 py-24 text-center sm:px-6">
      <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
        Something went wrong
      </p>
      <h1 className="mt-3 font-display text-3xl tracking-tight">
        This page didn&apos;t load.
      </h1>
      <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
        That&apos;s on us, not you. Try again — if it keeps happening, the
        homepage is a safe place to land.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-10 items-center rounded-[3px] bg-primary px-5 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex h-10 items-center gap-2 rounded-[3px] border border-[color:var(--rule)] px-5 text-[14px] font-medium transition-colors hover:bg-accent"
        >
          <ArrowLeft className="size-4" />
          Home
        </Link>
      </div>
    </div>
  );
}
