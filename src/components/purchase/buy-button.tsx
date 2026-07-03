"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Kicks off Stripe Checkout for a pack or the bundle. POSTs the slug to
 * /api/checkout (Track C), which resolves title + price from packs.ts and
 * returns a hosted checkout URL to redirect to.
 */
export function BuyButton({
  slug,
  label,
  className,
  variant = "default",
  size = "lg",
}: {
  slug: string;
  label: string;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
}) {
  const [busy, setBusy] = useState(false);

  async function onBuy() {
    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug }),
      });

      if (res.status === 429) {
        toast.error("Too many attempts. Please wait a minute and try again.");
        setBusy(false);
        return;
      }

      const data = (await res.json().catch(() => null)) as { url?: string } | null;

      if (!res.ok || !data?.url) {
        toast.error("Couldn't start checkout. Please try again in a moment.");
        setBusy(false);
        return;
      }

      // Hand off to Stripe's hosted checkout.
      window.location.assign(data.url);
    } catch {
      toast.error("Network error starting checkout. Please try again.");
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={onBuy}
      disabled={busy}
      variant={variant}
      size={size}
      className={cn("font-medium", className)}
    >
      {busy ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Starting checkout…
        </>
      ) : (
        label
      )}
    </Button>
  );
}
