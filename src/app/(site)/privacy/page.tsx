import type { Metadata } from "next";
import Link from "next/link";
import { NON_AFFILIATION, SUPPORT_EMAIL } from "@/components/site/constants";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What Clawmart collects (very little), why, who processes it, and how to get it deleted. Plain language, no dark patterns.",
  alternates: { canonical: "/privacy" },
};

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-10 font-display text-2xl tracking-tight">{children}</h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-6 sm:py-20">
      <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
        Effective 2026-07-03
      </p>
      <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
        Privacy Policy
      </h1>
      <P>
        Short version: we collect the minimum needed to sell you a pack, deliver
        the download, and prevent abuse. No ad trackers, no selling data, no
        marketing email you didn&apos;t explicitly ask for.
      </P>

      <H2>What we collect, and why</H2>
      <ul className="mt-4 list-disc space-y-2.5 pl-5 text-[14.5px] leading-relaxed text-muted-foreground">
        <li>
          <strong className="text-foreground">Nothing to browse.</strong> You can
          read the whole site and view every pack without giving us anything —
          no account, no signup.
        </li>
        <li>
          <strong className="text-foreground">Your email, only if you buy or
          join the waitlist.</strong> Checkout is guest-only; Stripe collects your
          email at payment and we use it solely to deliver your download link
          (transactional email only). Waitlist emails are used solely to tell you
          when a new pack ships.
        </li>
        <li>
          <strong className="text-foreground">A hashed IP address</strong> when
          you start a checkout — used only for rate limiting. We store the hash,
          not the address.
        </li>
        <li>
          <strong className="text-foreground">Payment details never touch our
          servers</strong> — Stripe processes the card end to end. We store a
          Stripe session/payment reference and the pack you bought so we can
          deliver the download and honor refunds.
        </li>
        <li>
          <strong className="text-foreground">An account, only for the
          Studio.</strong> Building a concept company requires signing in
          (handled by Clerk); we store your email and the ideas you submit,
          plus the AI-generated drafts. Idea text is sent to AI model providers
          via OpenRouter to generate those drafts — don&apos;t include personal
          or confidential information in an idea. Company pages you build are
          public at their /c/ link.
        </li>
      </ul>

      <H2>What we don&apos;t do</H2>
      <P>
        No advertising trackers or third-party analytics cookies. No selling or
        renting data. No adding you to a newsletter because you bought something.
        We don&apos;t receive or store what your OpenClaw assistant does with a
        pack — the skills run entirely on your own machine.
      </P>

      <H2>Who processes data for us</H2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-[14.5px] leading-relaxed text-muted-foreground">
        <li>
          <strong className="text-foreground">Stripe</strong> — payments and
          receipts.
        </li>
        <li>
          <strong className="text-foreground">Convex</strong> — our database
          (purchases, waitlist, Studio companies).
        </li>
        <li>
          <strong className="text-foreground">Clerk</strong> — Studio account
          sign-in.
        </li>
        <li>
          <strong className="text-foreground">OpenRouter</strong> — routes
          Studio idea text to AI model providers to generate drafts.
        </li>
        <li>
          <strong className="text-foreground">Vercel</strong> — hosting.
        </li>
        <li>
          <strong className="text-foreground">Resend</strong> — sends the
          download-delivery email, if email delivery is enabled.
        </li>
      </ul>

      <H2>Retention and deletion</H2>
      <P>
        We keep your purchase record so your tokened download link keeps working —
        that&apos;s the product. Want your purchase record, email, or waitlist
        entry deleted? Email{" "}
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=Data%20deletion`}
          className="text-lobster underline underline-offset-4"
        >
          {SUPPORT_EMAIL}
        </a>{" "}
        from the relevant address and we&apos;ll delete it within 30 days (note
        that deleting a purchase record disables its download link).
      </P>

      <H2>Changes</H2>
      <P>
        If this policy changes materially, the effective date above changes with
        it. We won&apos;t quietly weaken it.
      </P>

      <p className="mt-12 border-t border-border pt-6 text-[12.5px] leading-relaxed text-muted-foreground">
        {NON_AFFILIATION} See also the{" "}
        <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
          terms of service
        </Link>
        .
      </p>
    </div>
  );
}
