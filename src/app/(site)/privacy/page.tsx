import type { Metadata } from "next";
import Link from "next/link";
import { SUPPORT_EMAIL } from "@/components/site/constants";

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
        Effective 2026-07-12
      </p>
      <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
        Privacy Policy
      </h1>
      <P>
        Short version: we collect the minimum needed to run the Studio — your
        account email, the ideas you submit, and the drafts we generate from
        them. No ad trackers, no selling data, no marketing email you
        didn&apos;t explicitly ask for.
      </P>

      <H2>What we collect, and why</H2>
      <ul className="mt-4 list-disc space-y-2.5 pl-5 text-[14.5px] leading-relaxed text-muted-foreground">
        <li>
          <strong className="text-foreground">Nothing to browse.</strong> You
          can read the site and view any public company page without giving us
          anything — no account, no signup.
        </li>
        <li>
          <strong className="text-foreground">An account, to build.</strong>{" "}
          Creating a company requires signing in, handled by Clerk. We store
          your email and account identifier.
        </li>
        <li>
          <strong className="text-foreground">Your ideas and the drafts.</strong>{" "}
          The idea text you submit is sent via OpenRouter to AI model providers
          to generate the drafts, and the generated drafts are stored with your
          account. Don&apos;t include personal or confidential information in
          an idea.
        </li>
        <li>
          <strong className="text-foreground">Company pages are public.</strong>{" "}
          Everything on a generated /c/ page is visible to anyone with the
          link.
        </li>
        <li>
          <strong className="text-foreground">Waitlist emails, per company.</strong>{" "}
          If you join the waitlist on a company page, we store your email with
          that company. It&apos;s used solely in connection with that company
          page — never for a Clawmart marketing list.
        </li>
      </ul>

      <H2>Legacy pack purchases</H2>
      <P>
        Clawmart previously sold skill packs via Stripe guest checkout. We keep
        those purchase records (a Stripe payment reference, the pack, and the
        purchase email) so tokened download links keep working and refunds can
        be honored. Payment details never touched our servers — Stripe
        processed the card end to end.
      </P>

      <H2>What we don&apos;t do</H2>
      <P>
        No advertising trackers or third-party analytics cookies. No selling or
        renting data. No adding you to a newsletter because you signed up or
        bought something.
      </P>

      <H2>Who processes data for us</H2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-[14.5px] leading-relaxed text-muted-foreground">
        <li>
          <strong className="text-foreground">Clerk</strong> — account sign-in.
        </li>
        <li>
          <strong className="text-foreground">Convex</strong> — our database
          (companies, drafts, waitlist, legacy purchases).
        </li>
        <li>
          <strong className="text-foreground">OpenRouter</strong> — routes
          idea text to AI model providers to generate drafts.
        </li>
        <li>
          <strong className="text-foreground">Vercel</strong> — hosting.
        </li>
        <li>
          <strong className="text-foreground">Stripe</strong> — legacy pack
          purchases and receipts.
        </li>
        <li>
          <strong className="text-foreground">Resend</strong> — transactional
          email, if email delivery is enabled.
        </li>
      </ul>

      <H2>Retention and deletion</H2>
      <P>
        We keep legacy purchase records so tokened download links keep working,
        and Studio data for as long as your account and companies exist. Want
        your account data, companies, drafts, waitlist entry, or purchase
        record deleted? Email{" "}
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
        See also the{" "}
        <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
          terms of service
        </Link>
        .
      </p>
    </div>
  );
}
