"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { Check } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Input } from "@/components/ui/input";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Email-capture CTA for a public company page. Writes to the shared waitlist
 * table with source "c/<slug>" so demand is attributable per concept company.
 */
export function CompanyWaitlist({
  slug,
  cta = "Join the waitlist",
  accent,
  ink,
}: {
  slug: string;
  cta?: string;
  accent: string;
  ink: string;
}) {
  const join = useMutation(api.waitlist.join);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setState("error");
      return;
    }
    setState("busy");
    try {
      await join({ email: value, source: `c/${slug}` });
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p
        className="inline-flex items-center gap-2 font-mono text-[13.5px]"
        style={{ color: accent }}
      >
        <Check className="size-4" aria-hidden="true" />
        You&apos;re on the list. We&apos;ll only email you about this.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
      <Input
        type="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (state === "error") setState("idle");
        }}
        placeholder="you@email.com"
        aria-label="Email to join the waitlist"
        aria-invalid={state === "error"}
        className="h-11 bg-background/60"
      />
      <button
        type="submit"
        disabled={state === "busy"}
        className="inline-flex h-11 shrink-0 items-center justify-center rounded-md px-5 text-[14px] font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: accent, color: ink }}
      >
        {state === "busy" ? "Joining…" : cta}
      </button>
      {state === "error" && (
        <p role="alert" className="text-[12px] text-destructive sm:sr-only">
          Enter a valid email address.
        </p>
      )}
    </form>
  );
}
