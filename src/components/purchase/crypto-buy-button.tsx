"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

/** Secondary CTA: start a USDC-on-Base checkout, redirect to /pay/[token]. */
export function CryptoBuyButton({ slug }: { slug: string }) {
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    try {
      const res = await fetch("/api/crypto-checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      if (res.status === 429) {
        toast.error("Too many attempts. Wait a minute and try again.");
        setBusy(false);
        return;
      }
      const data = (await res.json().catch(() => null)) as { token?: string } | null;
      if (!res.ok || !data?.token) {
        toast.error("Couldn't start crypto checkout. Try card, or try again.");
        setBusy(false);
        return;
      }
      window.location.assign(`/pay/${data.token}`);
    } catch {
      toast.error("Network error. Please try again.");
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-1.5 text-[13.5px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-60"
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
      or pay with USDC on Base
    </button>
  );
}
