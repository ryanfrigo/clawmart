import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import { titleForSlug } from "@/lib/packs";
import { microToUsdc, eip681 } from "@/lib/crypto";
import { getConvexClient } from "@/lib/convex-server";
import { CryptoPay } from "@/components/purchase/crypto-pay";

export const metadata: Metadata = {
  title: "Pay with USDC · Clawmart",
  robots: { index: false, follow: false },
};

export default async function PayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const order = await getConvexClient().query(api.crypto.getCryptoByToken, {
    token,
  });
  if (!order) notFound();

  const address = process.env.PAYMENT_ADDRESS ?? "";
  const amountUsdc = microToUsdc(order.expectedUsdcMicro);
  const title = titleForSlug(order.slug) ?? "Your pack";

  return (
    <div className="mx-auto max-w-2xl px-5 py-16 sm:px-6 sm:py-24">
      <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-lobster">
        Checkout · crypto
      </p>
      <h1 className="mt-3 font-display text-[clamp(1.9rem,4.5vw,2.8rem)] leading-tight tracking-tight">
        {title}
      </h1>
      <p className="mt-3 text-[15px] text-muted-foreground">
        ${order.amountUsd}.00 — paid in USDC on Base. No card, no account.
      </p>

      <div className="mt-8">
        {address ? (
          <CryptoPay
            token={token}
            address={address}
            amountUsdc={amountUsdc}
            eip681={eip681(address, order.expectedUsdcMicro)}
            title={title}
            initiallyPaid={order.status === "paid"}
          />
        ) : (
          <div className="rounded-2xl border border-border/60 bg-card/40 p-6">
            <p className="text-[15px] text-muted-foreground">
              Crypto checkout isn&apos;t configured yet. Please use card checkout
              or email support@clawmart.co.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
