import Link from "next/link";

/**
 * Root 404 — self-contained on purpose. Site chrome lives in the (site)
 * group, so this boundary serves both unknown clawmart URLs and unknown
 * company slugs (/c/<missing>) without dragging clawmart's nav onto what a
 * visitor thought was a standalone company site.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5 py-24 text-center">
      <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-lobster">
        404
      </p>
      <h1 className="mt-4 font-display text-[clamp(2.2rem,6vw,3.6rem)] leading-tight tracking-tight">
        There&apos;s nothing here.
      </h1>
      <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
        This page doesn&apos;t exist — the link may be mistyped, or the company
        it pointed to has been deleted.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Go to clawmart.co
      </Link>
    </div>
  );
}
