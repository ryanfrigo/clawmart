"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function WaitlistForm({
  source,
  domain,
}: {
  source: "home" | "check" | "report";
  domain?: string;
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
      await join({ email: value, source, ...(domain ? { domain } : {}) });
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p className="font-mono text-[13px] text-kelp">
        ✓ You&apos;re on the list. We&apos;ll only email you about this.
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
        placeholder="you@company.com"
        aria-label="Email for the monthly fix drops waitlist"
        aria-invalid={state === "error"}
        className="h-10"
      />
      <Button type="submit" variant="secondary" disabled={state === "busy"} className="h-10 shrink-0">
        {state === "busy" ? "Joining…" : "Join the waitlist"}
      </Button>
      {state === "error" && (
        <p role="alert" className="text-[12px] text-destructive sm:sr-only">
          Enter a valid email address.
        </p>
      )}
    </form>
  );
}
