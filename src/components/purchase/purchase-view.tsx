"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  Loader2,
  XCircle,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { titleForSlug, isBundle } from "@/lib/packs";
import { InstallSteps } from "@/components/site/install-steps";
import { WaitlistForm } from "@/components/home/waitlist-form";
import { SKILLS_PATH, SUPPORT_EMAIL } from "@/components/site/constants";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[360px] w-[640px] -translate-x-1/2 rounded-full bg-lobster/[0.06] blur-[120px]" />
      </div>
      <div className="relative mx-auto max-w-2xl px-5 py-16 sm:px-6 sm:py-24">
        {children}
      </div>
    </div>
  );
}

export function PurchaseView({ token }: { token: string }) {
  const purchase = useQuery(api.purchases.getByToken, { token });

  // Loading
  if (purchase === undefined) {
    return (
      <Shell>
        <div className="space-y-4">
          <div className="shimmer-line h-3 w-28 rounded" />
          <div className="shimmer-line h-10 w-3/4 rounded" />
          <div className="shimmer-line h-24 w-full rounded-xl" />
        </div>
      </Shell>
    );
  }

  // Not found
  if (purchase === null) {
    return (
      <Shell>
        <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
          Order not found
        </p>
        <h1 className="mt-3 font-display text-4xl tracking-tight">
          We couldn&apos;t find this order.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
          The link may be mistyped or expired. If you just paid and landed here,
          give it a moment and refresh — otherwise email {SUPPORT_EMAIL} and
          we&apos;ll sort it out.
        </p>
        <Link
          href="/packs"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Browse packs
          <ArrowRight className="size-4" />
        </Link>
      </Shell>
    );
  }

  const title = titleForSlug(purchase.slug) ?? "your pack";
  const bundle = isBundle(purchase.slug);

  // Failed
  if (purchase.status === "failed") {
    return (
      <Shell>
        <div className="flex items-center gap-2.5 text-destructive">
          <XCircle className="size-5" aria-hidden="true" />
          <p className="font-mono text-[12px] uppercase tracking-[0.22em]">
            Not completed
          </p>
        </div>
        <h1 className="mt-4 font-display text-4xl tracking-tight">
          This order didn&apos;t go through.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
          Nothing was charged. Payments can fail for all sorts of harmless
          reasons — you can start over any time.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/packs/${purchase.slug}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/packs"
            className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-2.5 text-[14px] font-medium transition-colors hover:bg-accent"
          >
            Browse all packs
          </Link>
        </div>
      </Shell>
    );
  }

  // Pending payment
  if (purchase.status === "pending_payment") {
    return (
      <Shell>
        <div className="flex items-center gap-2.5 text-lobster">
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          <p className="font-mono text-[12px] uppercase tracking-[0.22em]">
            Processing
          </p>
        </div>
        <h1 className="mt-4 font-display text-4xl tracking-tight">
          Confirming your payment…
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
          Hang tight — this can take up to a minute for some payment methods.
          This page updates on its own the moment it clears; no need to refresh.
        </p>
        <div className="mt-8 rounded-2xl border border-border bg-card/40 p-5">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Bookmark this page now. It&apos;s your permanent link to{" "}
            <span className="text-foreground">{title}</span> — your receipt and
            your download, all in one.
          </p>
        </div>
      </Shell>
    );
  }

  // Paid — deliver
  return (
    <Shell>
      <div className="flex items-center gap-2.5 text-kelp">
        <CheckCircle2 className="size-5" aria-hidden="true" />
        <p className="font-mono text-[12px] uppercase tracking-[0.22em]">
          Payment received
        </p>
      </div>
      <h1 className="mt-4 font-display text-[clamp(2.25rem,5vw,3.25rem)] leading-tight tracking-tight">
        <span className="text-lobster">{title}</span> is ready.
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
        Thanks for the purchase. Download the zip below, then follow the three
        steps to get it running in your assistant.
      </p>

      {/* download */}
      <div className="mt-8 rounded-2xl border border-lobster/30 bg-card/60 p-6">
        <a
          href={`/api/download/${token}`}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-[14.5px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Download className="size-4.5" aria-hidden="true" />
          Download {bundle ? "all packs" : "the pack"} (.zip)
        </a>
        <p className="mt-4 rounded-lg border border-border bg-background/60 p-3 text-[12.5px] leading-relaxed text-muted-foreground">
          <span className="text-foreground">Bookmark this page.</span> It&apos;s
          your permanent download link and receipt — re-download any time, on
          any device.
        </p>
      </div>

      {/* install */}
      <div className="mt-10">
        <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
          Install it
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
          Unzip and copy the skill folders into{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px] text-foreground/90">
            {SKILLS_PATH}
          </code>{" "}
          (or your workspace&apos;s <code className="font-mono text-[13px]">skills/</code>{" "}
          directory), then start a new OpenClaw session. Each pack&apos;s README
          lists the trigger phrases and anything to configure.
        </p>
        <div className="mt-6">
          <InstallSteps compact />
        </div>
      </div>

      {/* waitlist */}
      <div className="mt-12 border-t border-border pt-8">
        <h2 className="font-display text-2xl tracking-tight">
          Want to hear about new packs?
        </h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
          We&apos;ll email you only when a new pack ships. Nothing else.
        </p>
        <div className="mt-4">
          <WaitlistForm source="purchase" />
        </div>
      </div>

      <p className="mt-10 text-[12px] leading-relaxed text-muted-foreground">
        Trouble downloading or installing? Email {SUPPORT_EMAIL} — include this
        page&apos;s URL and we&apos;ll help.
      </p>
    </Shell>
  );
}
