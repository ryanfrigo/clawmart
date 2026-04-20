"use client";

import { useState } from "react";
import { ClerkProvider, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HireCTAProps {
  agentSlug: string;
  role: string;
  pricePerMonth: number;
}

function HireButton({ agentSlug, role }: { agentSlug: string; role: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleHire() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agents/hire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentSlug }),
      });
      const data = await res.json();
      if (!res.ok || !data?.url) throw new Error(data?.error || "Failed to start checkout");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        size="lg"
        onClick={handleHire}
        disabled={loading}
        className="h-12 w-full bg-white text-[#09090b] hover:bg-zinc-200 text-[14px] font-medium"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Redirecting to Stripe...
          </>
        ) : (
          <>
            Hire {role} — free for 30 days
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
      {error ? <p className="text-[12px] text-red-400">{error}</p> : null}
    </div>
  );
}

export function HireCTA({ agentSlug, role, pricePerMonth }: HireCTAProps) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <SignedIn>
        <HireButton agentSlug={agentSlug} role={role} />
      </SignedIn>
      <SignedOut>
        <SignInButton mode="modal" forceRedirectUrl={`/agents/${agentSlug}/hire`}>
          <Button
            size="lg"
            className="h-12 w-full bg-white text-[#09090b] hover:bg-zinc-200 text-[14px] font-medium"
          >
            Sign up to hire — ${pricePerMonth}/mo after 30-day trial
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </SignInButton>
      </SignedOut>
    </ClerkProvider>
  );
}
