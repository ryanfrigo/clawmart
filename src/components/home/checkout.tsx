"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ONE_LINE_DISCLAIMER, REFUND_LINE } from "@/components/site/constants";

/** POST /api/checkout and redirect to Stripe. Shared by the check result and pricing form. */
export async function startCheckout(args: {
  domain: string;
  checkId?: string;
}): Promise<void> {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    throw new Error("checkout_failed");
  }
  const { url } = (await res.json()) as { url: string };
  window.location.href = url;
}

export function BuyKitButton({
  domain,
  checkId,
  label,
  className,
}: {
  domain: string;
  checkId?: string;
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    try {
      await startCheckout({ domain, checkId });
    } catch {
      toast.error("Couldn't start checkout. Try again, or email support@clawmart.co.");
      setBusy(false);
    }
  }

  return (
    <Button size="lg" onClick={onClick} disabled={busy} className={className}>
      {busy ? "Opening checkout…" : (label ?? `Get the Fix Kit for ${domain} — $49`)}
    </Button>
  );
}

/** Mini domain form used in the pricing section — buy directly, no prior check needed. */
export function PricingBuyForm() {
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const d = domain.trim();
    if (!d) return;
    setBusy(true);
    try {
      await startCheckout({ domain: d });
    } catch {
      toast.error(
        "Couldn't start checkout — double-check the domain, or email support@clawmart.co."
      );
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="yourdomain.com"
          aria-label="Domain to audit"
          autoComplete="off"
          spellCheck={false}
          className="h-11 font-mono text-[13px]"
        />
        <Button type="submit" size="lg" disabled={busy || !domain.trim()} className="h-11 shrink-0">
          {busy ? "Opening checkout…" : "Get the Fix Kit — $49"}
        </Button>
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
        {ONE_LINE_DISCLAIMER}
      </p>
      <p className="mt-1.5 text-[12px] text-muted-foreground">{REFUND_LINE}</p>
    </form>
  );
}
