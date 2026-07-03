/**
 * Whether Clerk is configured in this build. Studio surfaces must check this
 * before rendering Clerk components — <SignedIn>/<SignedOut>/<SignInButton>
 * throw without a ClerkProvider, and the provider tree deliberately degrades
 * to plain Convex when the publishable key is absent (see convex-provider).
 */
export const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function StudioUnavailable() {
  return (
    <div className="rounded-2xl border border-border bg-card/40 p-8 text-center">
      <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
        Studio unavailable
      </p>
      <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-muted-foreground">
        The Studio needs sign-in, which isn&apos;t configured in this
        environment. The rest of the site works normally.
      </p>
    </div>
  );
}
