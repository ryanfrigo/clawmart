"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ReactNode } from "react";

const url = process.env.NEXT_PUBLIC_CONVEX_URL!;
const isPlaceholder = !url || url.includes("placeholder");

// Only create client with valid URL
const convex = isPlaceholder ? null : new ConvexReactClient(url);

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) {
    // Render without Convex in dev/demo mode
    return <>{children}</>;
  }
  if (!clerkKey) {
    // No Clerk keys (e.g. a preview env): packs keep working, Studio is
    // gated behind sign-in it can't render — acceptable degraded mode.
    return <ConvexProvider client={convex}>{children}</ConvexProvider>;
  }
  return (
    <ClerkProvider
      publishableKey={clerkKey}
      appearance={{ baseTheme: dark }}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
