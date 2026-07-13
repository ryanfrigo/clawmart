"use client";

import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { clerkEnabled } from "@/components/studio/clerk-enabled";

/**
 * Auth corner of the site nav. Clerk components throw without a
 * ClerkProvider, so render nothing when Clerk isn't configured
 * (see clerk-enabled / convex-provider).
 */
export function NavAuth() {
  if (!clerkEnabled) return null;

  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <button
            type="button"
            className="ml-1 inline-flex h-8 items-center rounded-lg bg-primary px-3.5 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Sign in
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <Link
          href="/#companies"
          className="rounded-md px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          My companies
        </Link>
        <UserButton />
      </SignedIn>
    </>
  );
}
