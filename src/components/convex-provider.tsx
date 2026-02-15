"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const url = process.env.NEXT_PUBLIC_CONVEX_URL!;
const isPlaceholder = !url || url.includes("placeholder");

// Only create client with valid URL
const convex = isPlaceholder ? null : new ConvexReactClient(url);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) {
    // Render without Convex in dev/demo mode
    return <>{children}</>;
  }
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
