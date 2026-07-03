/**
 * Next 16 proxy (the middleware.ts successor). Clerk context for the Studio.
 *
 * No route protection here — packs/checkout stay guest-only and Studio pages
 * gate themselves client-side. Defensive: if Clerk env is absent (e.g. a
 * preview without keys) the site must keep working, so fall through to a
 * plain pass-through instead of letting clerkMiddleware throw.
 */
import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const hasClerk =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !!process.env.CLERK_SECRET_KEY;

const withClerk = clerkMiddleware();

// Clerk trouble (misconfigured keys, verification outage) must degrade to
// no-auth — guest packs/checkout keep serving; only Studio sign-in suffers.
const guarded: typeof withClerk = async (request, event) => {
  try {
    return await withClerk(request, event);
  } catch {
    return NextResponse.next();
  }
};

export default hasClerk ? guarded : () => NextResponse.next();

export const config = {
  matcher: [
    // Skip Next internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
