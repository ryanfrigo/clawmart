import type { Metadata } from "next";
import Link from "next/link";
import { SUPPORT_EMAIL } from "@/components/site/constants";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Clawmart's terms, in plain language: what the Studio is, that outputs are AI drafts, and how legacy pack purchases are honored.",
  alternates: { canonical: "/terms" },
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

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-6 sm:py-20">
      <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
        Effective 2026-07-12
      </p>
      <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
        Terms of Service
      </h1>
      <P>
        Plain language, because you should be able to read the whole thing.
        &ldquo;Clawmart&rdquo;, &ldquo;we&rdquo;, and &ldquo;us&rdquo; mean the
        operator of clawmart.co. By using the site or the Studio you agree to
        these terms.
      </P>

      <H2>What the service is</H2>
      <P>
        Clawmart Studio drafts a concept company — plan, brand, product spec, a
        public page, and marketing copy — from an idea you submit, using AI
        models. You describe the idea; a team of AI agents produces the drafts
        while you watch, and the generated company page goes live at its own
        public link.
      </P>

      <H2>Drafts, not promises</H2>
      <P>
        Outputs are AI-generated drafts: unreviewed, sometimes wrong, and not
        business, legal, or financial advice. We don&apos;t promise any
        specific result from using them. Every generated public page is
        labeled as an AI-drafted concept.
      </P>

      <H2>Your idea, your drafts</H2>
      <P>
        You keep your idea, and you may use the generated drafts freely.
        Don&apos;t submit ideas you don&apos;t have the right to use, and
        don&apos;t use the Studio to create deceptive, unlawful, or infringing
        content — we may take down pages and revoke access that violate this.
      </P>

      <H2>Pricing and limits</H2>
      <P>
        The Studio is free while we validate demand, limited to 3 companies
        per account. Limits (companies per account, builds per day) may change;
        material changes will be reflected by the effective date at the top.
      </P>

      <H2>Legacy: skill packs</H2>
      <P>
        Clawmart previously sold curated skill packs for OpenClaw as one-time
        Stripe purchases. That storefront is discontinued — packs are no longer
        for sale — but past purchases are honored: your tokened, unguessable
        download URL keeps working (treat it like a private document; we can
        rotate a token on request), and the 14-day, no-questions refund stands.
        For either, reply to your receipt or email{" "}
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="text-lobster underline underline-offset-4"
        >
          {SUPPORT_EMAIL}
        </a>
        .
      </P>

      <H2>Liability</H2>
      <P>
        To the maximum extent permitted by law, our total liability for any claim
        related to the service is capped at the amount you paid us in the 12
        months before the claim. The service and its outputs are provided
        &ldquo;as is&rdquo;; we work hard to keep them useful and available but
        don&apos;t warrant uninterrupted operation or fitness for a particular
        purpose.
      </P>

      <H2>Changes</H2>
      <P>
        We may update these terms; material changes will be reflected by the
        effective date at the top. Continued use after a change means you accept
        the new terms.
      </P>

      <p className="mt-12 border-t border-border pt-6 text-[12.5px] leading-relaxed text-muted-foreground">
        See also the{" "}
        <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
          privacy policy
        </Link>{" "}
        and{" "}
        <Link href="/about" className="underline underline-offset-4 hover:text-foreground">
          about page
        </Link>
        .
      </p>
    </div>
  );
}
