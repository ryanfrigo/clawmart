"use client";

import { useParams } from "next/navigation";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { BuildView } from "@/components/studio/build-view";
import { clerkEnabled, StudioUnavailable } from "@/components/studio/clerk-enabled";
import { Button } from "@/components/ui/button";

export default function StudioBuildPage() {
  const params = useParams<{ id: string }>();
  const companyId = params.id as Id<"companies">;

  if (!clerkEnabled) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-16">
        <StudioUnavailable />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-16">
      <SignedOut>
        <div className="mx-auto max-w-md rounded-2xl border border-lobster/30 bg-card/50 p-8 text-center">
          <h1 className="font-display text-3xl tracking-tight">Sign in to view this build</h1>
          <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
            Company builds are private to the account that created them.
          </p>
          <SignInButton mode="modal">
            <Button size="lg" className="mt-6 font-medium">
              Sign in
              <ArrowRight className="size-4" />
            </Button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        <BuildView companyId={companyId} />
      </SignedIn>
    </div>
  );
}
