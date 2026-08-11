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
        Effective 2026-08-10
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
          Creating a company requires signing in with an email and password. We
          store your email, a hash of your password, and an account identifier.
        </li>
        <li>
          <strong className="text-foreground">Your ideas and the drafts.</strong>{" "}
          The idea text you submit is sent via OpenRouter to AI model providers
          to generate the drafts, and the generated drafts are stored with your
          account. Don&apos;t include personal or confidential information in
          an idea.
        </li>
        <li>
          <strong className="text-foreground">
            Your voice, only while you hold the mic.
          </strong>{" "}
          Dictation is optional and does nothing until you press the microphone
          button and your browser asks permission. Where the audio goes depends
          on the browser: Chrome, Edge and Safari use their own built-in speech
          recognition, which sends it to Google, Microsoft or Apple respectively
          under their privacy policies, not ours. Browsers without it (Firefox)
          record locally and send that clip to us once, and we forward it to
          OpenRouter for transcription. We keep the text, never the audio — no
          recording is written to disk or stored on our side. Typing works
          everywhere, so you never have to give up a microphone to use this.
        </li>
        <li>
          <strong className="text-foreground">Company pages are public.</strong>{" "}
          Everything on a generated /c/ page is visible to anyone with the
          link.
        </li>
        <li>
          <strong className="text-foreground">Waitlist emails go to the
          company&apos;s creator.</strong> If you join the waitlist on a
          company page, we store your email and show it to the person who built
          that company (stated under the form) so they can contact you about
          that idea. Clawmart never adds you to its own marketing list, and we
          don&apos;t use waitlist emails for anything beyond running that page —
          but once the creator receives your address, how they use it is up to
          them, so only join waitlists for ideas you actually want to hear
          about. You can ask us to delete your entry any time (see below).
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
          <strong className="text-foreground">Convex</strong> — our database and
          account sign-in (companies, drafts, waitlist, legacy purchases).
        </li>
        <li>
          <strong className="text-foreground">OpenRouter</strong> — routes
          idea text to AI model providers to generate drafts, and transcribes
          dictation on browsers without built-in speech recognition.
        </li>
        <li>
          <strong className="text-foreground">
            Your browser&apos;s speech service
          </strong>{" "}
          — Google, Microsoft or Apple, depending on the browser, receives
          dictation audio directly if you use the microphone. It never passes
          through us on that path.
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
          className="text-foreground underline decoration-[color:var(--rule)] underline-offset-4 transition-colors hover:decoration-lobster"
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
