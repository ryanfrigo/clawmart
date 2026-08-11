"use client";

import { useParams, usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { BuildView } from "@/components/studio/build-view";
import {
  AnonOnly,
  AuthedOnly,
  SignInLink,
  StudioUnavailable,
  authEnabled,
} from "@/components/auth/gate";
import { Button } from "@/components/ui/button";

export default function StudioBuildPage() {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const companyId = params.id as Id<"companies">;

  if (!authEnabled) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-16">
        <StudioUnavailable />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-16">
      <AnonOnly>
        <div className="plate mx-auto max-w-md p-8 text-center">
          <p className="stamp">Access</p>
          <h1 className="d3 mt-3">Sign in to view this build</h1>
          <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
            Company builds are private to the account that created them.
          </p>
          {/* Back to this exact build after signing in, not to the homepage. */}
          <Button asChild className="mt-6">
            <SignInLink redirect={pathname ?? "/"}>
              Sign in
              <ArrowRight className="size-4" />
            </SignInLink>
          </Button>
        </div>
      </AnonOnly>

      <AuthedOnly>
        <BuildView companyId={companyId} />
      </AuthedOnly>
    </div>
  );
}
