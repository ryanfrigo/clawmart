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
        Effective 2026-07-02
      </p>
      <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
        Privacy Policy
      </h1>
      <P>
        Short version: we collect the minimum needed to run checks, deliver
        reports, and prevent abuse. No ad trackers, no selling data, no
        marketing email you didn&apos;t explicitly ask for.
      </P>

      <H2>What we collect, and why</H2>
      <ul className="mt-4 list-disc space-y-2.5 pl-5 text-[14.5px] leading-relaxed text-muted-foreground">
        <li>
          <strong className="text-foreground">Domains you check.</strong>{" "}
          Stored with the check results (cached 24 hours) and, for purchases,
          with your report.
        </li>
        <li>
          <strong className="text-foreground">A hashed IP address</strong> when
          you run a free check — used only for rate limiting. We store the
          hash, not the address.
        </li>
        <li>
          <strong className="text-foreground">Your email, only if you buy
          or join the waitlist.</strong> Checkout is guest-only; Stripe
          collects your email at payment and we use it solely to deliver your
          report link (transactional email only). Waitlist emails are used
          solely for the one thing you signed up to hear about.
        </li>
        <li>
          <strong className="text-foreground">Payment details never touch
          our servers</strong> — Stripe processes the card end to end. We store
          a Stripe session/payment reference so we can honor refunds.
        </li>
      </ul>

      <H2>What we don&apos;t do</H2>
      <P>
        No advertising trackers or third-party analytics cookies. No selling
        or renting data. No adding you to a newsletter because you bought
        something. Prompts sent to AI models contain your domain, brand, and
        category — never your email or payment details.
      </P>

      <H2>Who processes data for us</H2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-[14.5px] leading-relaxed text-muted-foreground">
        <li>
          <strong className="text-foreground">Stripe</strong> — payments and
          receipts.
        </li>
        <li>
          <strong className="text-foreground">Convex</strong> — our database
          (reports, checks, waitlist).
        </li>
        <li>
          <strong className="text-foreground">Vercel</strong> — hosting and the
          AI gateway that routes model calls.
        </li>
        <li>
          <strong className="text-foreground">AI model providers</strong>{" "}
          (OpenAI, Anthropic, Perplexity via the gateway) — receive the
          category prompts and your public site text, as described in the{" "}
          <Link href="/methodology" className="underline underline-offset-4 hover:text-foreground">
            methodology
          </Link>
          .
        </li>
        <li>
          <strong className="text-foreground">Resend</strong> — sends the
          report-delivery email, if email delivery is enabled.
        </li>
      </ul>

      <H2>Retention and deletion</H2>
      <P>
        Reports are kept so your tokened link keeps working — that&apos;s the
        product. Free-check rows expire from cache after 24 hours but may be
        retained for abuse prevention and aggregate funnel stats. Want your
        report, email, or waitlist entry deleted? Email{" "}
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=Data%20deletion`}
          className="text-lobster underline underline-offset-4"
        >
          {SUPPORT_EMAIL}
        </a>{" "}
        from the relevant address and we&apos;ll delete it within 30 days.
      </P>

      <H2>Changes</H2>
      <P>
        If this policy changes materially, the effective date above changes
        with it. We won&apos;t quietly weaken it.
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
