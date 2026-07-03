"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Copy, Check, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Crypto payment panel: shows the exact USDC amount + receive address, then
 * polls /api/crypto-verify until the on-chain payment is detected.
 */
export function CryptoPay({
  token,
  address,
  amountUsdc,
  eip681,
  title,
  initiallyPaid,
}: {
  token: string;
  address: string;
  amountUsdc: string;
  eip681: string;
  title: string;
  initiallyPaid: boolean;
}) {
  const [paid, setPaid] = useState(initiallyPaid);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (paid) return;
    let alive = true;
    const tick = async () => {
      setChecking(true);
      try {
        const r = await fetch(`/api/crypto-verify/${token}`, { cache: "no-store" });
        const d = (await r.json()) as { paid?: boolean };
        if (alive && d.paid) setPaid(true);
      } catch {
        /* keep polling */
      } finally {
        if (alive) setChecking(false);
      }
    };
    const id = setInterval(tick, 12000);
    tick();
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [token, paid]);

  function copy(text: string, what: string) {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${what} copied`),
      () => toast.error("Copy failed")
    );
  }

  if (paid) {
    return (
      <div className="rounded-2xl border border-lobster/30 bg-lobster/[0.05] p-6 sm:p-8">
        <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-lobster">
          Payment received
        </p>
        <h2 className="mt-2 font-display text-2xl tracking-tight">
          {title} is ready.
        </h2>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Thanks — your USDC payment was confirmed on Base. Download below and
          bookmark this page; the link is permanent.
        </p>
        <Button asChild size="lg" className="mt-5 font-medium">
          <a href={`/api/download/${token}`} download>
            <Download className="size-4" />
            Download the pack (.zip)
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-6 sm:p-8">
      <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-lobster">
        Pay with USDC · Base
      </p>
      <h2 className="mt-2 font-display text-2xl tracking-tight">
        Send exactly {amountUsdc} USDC
      </h2>
      <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">
        Send <strong className="text-foreground">exactly</strong> this amount of
        USDC (the extra fractional cents are your order&apos;s unique tag) on the{" "}
        <strong className="text-foreground">Base</strong> network to the address
        below. This page unlocks automatically once the payment confirms
        on-chain — usually within a minute. Keep it open.
      </p>

      <dl className="mt-6 space-y-4">
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Amount (USDC, exact)
          </dt>
          <dd className="mt-1 flex items-center gap-2">
            <code className="rounded-lg bg-muted px-3 py-1.5 font-mono text-[15px] text-foreground">
              {amountUsdc}
            </code>
            <button
              type="button"
              onClick={() => copy(amountUsdc, "Amount")}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Copy amount"
            >
              <Copy className="size-4" />
            </button>
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            To address (Base · USDC only)
          </dt>
          <dd className="mt-1 flex items-center gap-2">
            <code className="break-all rounded-lg bg-muted px-3 py-1.5 font-mono text-[13px] text-foreground">
              {address}
            </code>
            <button
              type="button"
              onClick={() => copy(address, "Address")}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Copy address"
            >
              <Copy className="size-4" />
            </button>
          </dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button asChild variant="outline">
          <a href={eip681}>Open in wallet</a>
        </Button>
        <span className="inline-flex items-center gap-2 font-mono text-[12.5px] text-muted-foreground">
          {checking ? (
            <>
              <Loader2 className="size-3.5 animate-spin" /> checking Base…
            </>
          ) : (
            <>
              <Check className="size-3.5" /> watching for your payment
            </>
          )}
        </span>
      </div>

      <p className="mt-6 text-[13px] leading-relaxed text-muted-foreground">
        Send only USDC on Base — other tokens or networks can&apos;t be detected.
        Paid the wrong amount or need help? Email{" "}
        <Link href="mailto:support@clawmart.co" className="text-lobster hover:underline">
          support@clawmart.co
        </Link>
        . 14-day refund on every pack.
      </p>
    </div>
  );
}
