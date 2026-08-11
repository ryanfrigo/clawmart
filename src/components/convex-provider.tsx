"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

/**
 * Convex + Convex Auth for the whole app.
 *
 * Auth is served by the Convex deployment itself (convex/auth.ts), so there is
 * exactly one thing to configure: NEXT_PUBLIC_CONVEX_URL. Without a real one we
 * render bare children — no client, no provider, no auth. Legacy pack delivery
 * (/purchase/[token], /api/download/[token]) is server-rendered and
 * unauthenticated, so it keeps working in that degraded mode; only signed-in
 * Studio surfaces go dark, and they check `authEnabled` first
 * (components/auth/gate.tsx) so they never call a hook that would throw.
 */
const url = process.env.NEXT_PUBLIC_CONVEX_URL!;
const isPlaceholder = !url || url.includes("placeholder");

const convex = isPlaceholder ? null : new ConvexReactClient(url);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) return <>{children}</>;
  return <ConvexAuthProvider client={convex}>{children}</ConvexAuthProvider>;
}
