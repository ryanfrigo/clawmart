"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Error boundary for a single build. A malformed company id (or any render
 * error under this route) lands here instead of crashing the app.
 */
export default function StudioBuildError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-5 py-24 text-center sm:px-6">
      <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
        Something went wrong
      </p>
      <h1 className="mt-3 font-display text-3xl tracking-tight">
        This build couldn&apos;t be loaded.
      </h1>
      <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
        The link may be malformed. Try again, or head back to your companies.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-10 items-center rounded-xl bg-primary px-5 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-5 text-[14px] font-medium transition-colors hover:bg-accent"
        >
          <ArrowLeft className="size-4" />
          Studio
        </Link>
      </div>
    </div>
  );
}
