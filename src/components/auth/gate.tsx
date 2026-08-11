"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

/**
 * The auth surface every other component codes against. Nothing outside this
 * file imports `convex/react`'s auth components or `@convex-dev/auth` directly,
 * because all three of them throw when no provider is mounted — and the app
 * must still render in an environment with no Convex deployment.
 *
 * That degraded mode is not hypothetical: a preview build without
 * NEXT_PUBLIC_CONVEX_URL has no ConvexProvider at all (see convex-provider.tsx),
 * so the gate MUST be consulted before any auth hook runs, never after.
 * `authEnabled` is a build-time constant, which is what makes the early
 * returns below safe — they can never flip between renders and reorder hooks.
 */
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

/**
 * Whether signed-in surfaces can work here. Convex Auth lives inside the
 * deployment, so a real Convex URL is the whole requirement — there is no
 * second vendor key to check any more.
 */
export const authEnabled = !!convexUrl && !convexUrl.includes("placeholder");

/** Renders only for a signed-in operator. */
export function AuthedOnly({ children }: { children: ReactNode }) {
  if (!authEnabled) return null;
  return <Authenticated>{children}</Authenticated>;
}

/** Renders only for a signed-out visitor. */
export function AnonOnly({ children }: { children: ReactNode }) {
  if (!authEnabled) return null;
  return <Unauthenticated>{children}</Unauthenticated>;
}

/**
 * Renders while the session is being restored. Pass a dark readout — `— —` in
 * mono — never a spinner: an unknown value is telemetry, and telemetry does
 * not animate while nothing is happening.
 */
export function AuthPending({ children }: { children: ReactNode }) {
  if (!authEnabled) return null;
  return <AuthLoading>{children}</AuthLoading>;
}

/**
 * The only route into sign-in. `redirect` defaults to the current path, so
 * signing in from a deep link returns there instead of dumping you on home.
 */
export function SignInLink({
  redirect,
  children,
  className,
}: {
  redirect?: string;
  children: ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const target = redirect ?? pathname ?? "/";
  return (
    <Link href={`/signin?redirect=${encodeURIComponent(target)}`} className={className}>
      {children}
    </Link>
  );
}

/** Shown where a signed-in surface would be, in a build with no deployment. */
export function StudioUnavailable() {
  return (
    <div className="plate p-8 text-center">
      <p className="stamp">Studio unavailable</p>
      <p className="mx-auto mt-3 max-w-md text-[13.5px] leading-relaxed text-muted-foreground">
        The Studio needs an account, which isn&apos;t configured in this
        environment. The rest of the site works normally.
      </p>
    </div>
  );
}
