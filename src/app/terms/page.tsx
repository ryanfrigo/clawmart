import type { Metadata } from "next";
import Link from "next/link";
import { NON_AFFILIATION, SUPPORT_EMAIL } from "@/components/site/constants";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Clawmart's terms, in plain language: what a pack is, the 14-day refund, and what we can and can't promise.",
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
        Effective 2026-07-03
      </p>
      <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
        Terms of Service
      </h1>
      <P>
        Plain language, because you should be able to read the whole thing.
        &ldquo;Clawmart&rdquo;, &ldquo;we&rdquo;, and &ldquo;us&rdquo; mean the
        operator of clawmart.co. By using the site or buying a pack you agree to
        these terms.
      </P>

      <H2>What the service is</H2>
      <P>
        Clawmart sells curated skill packs for OpenClaw, the self-hosted
        personal AI assistant. A pack is a set of skill files (SKILL.md, built to
        the OpenClaw AgentSkills spec) plus a setup guide, delivered as a
        downloadable zip. A purchase is a one-time payment for a pack (or the
        All-Access bundle); after payment you get a gated download at a private,
        unguessable URL. Nothing runs on our servers on your behalf — you install
        and run the skills in your own OpenClaw.
      </P>

      <H2>What we don&apos;t promise</H2>
      <P>
        Packs are curated instruction bundles you adapt to your own stack. We
        don&apos;t promise any specific result, and the skills are not tested
        against your exact environment or connected tools. Skills that reference
        email, a calendar, a store, or other services assume you&apos;ve
        configured those in OpenClaw yourself, as each pack&apos;s README
        describes.
      </P>

      <H2>Payment and refunds</H2>
      <P>
        Payment is handled by Stripe as a guest checkout — no account needed.
        Every pack carries a 14-day, no-questions refund: reply to your receipt
        or email{" "}
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="text-lobster underline underline-offset-4"
        >
          {SUPPORT_EMAIL}
        </a>
        . If your download ever fails to work, tell us and we&apos;ll fix it or
        refund you.
      </P>

      <H2>Clawmart Studio</H2>
      <P>
        The Studio drafts a concept company — plan, brand, product spec, a
        public page, and marketing copy — from an idea you submit, using AI
        models. Outputs are AI-generated drafts: unreviewed, sometimes wrong,
        and not business, legal, or financial advice. You keep your idea; you
        may use the generated drafts freely; every generated public page is
        labeled as an AI-drafted concept. Don&apos;t use the Studio to create
        deceptive, unlawful, or infringing content — we may take down pages
        and revoke access that violate this. The Studio is free while we
        validate demand; limits (companies per account, builds per day) may
        change.
      </P>

      <H2>Your responsibilities</H2>
      <P>
        Use the packs for your own OpenClaw setups. You may read, edit, and adapt
        the skill files freely. Don&apos;t redistribute or resell a pack wholesale
        as your own product without adding your own substantial work, and
        don&apos;t abuse the checkout or download endpoints.
      </P>

      <H2>The download URL</H2>
      <P>
        Your purchase lives at an unguessable tokened URL that is excluded from
        search indexing. Anyone you give the link to can download the pack — treat
        it like a private document. We can rotate a token on request.
      </P>

      <H2>Liability</H2>
      <P>
        To the maximum extent permitted by law, our total liability for any claim
        related to the service is capped at the amount you paid us in the 12
        months before the claim. The service and the packs are provided &ldquo;as
        is&rdquo;; we work hard to keep them useful and available but don&apos;t
        warrant uninterrupted operation or fitness for a particular purpose.
      </P>

      <H2>Changes</H2>
      <P>
        We may update these terms; material changes will be reflected by the
        effective date at the top. Continued use after a change means you accept
        the new terms.
      </P>

      <p className="mt-12 border-t border-border pt-6 text-[12.5px] leading-relaxed text-muted-foreground">
        {NON_AFFILIATION} See also the{" "}
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
