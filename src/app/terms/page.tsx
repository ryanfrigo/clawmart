import type { Metadata } from "next";
import Link from "next/link";
import { NON_AFFILIATION, SUPPORT_EMAIL } from "@/components/site/constants";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Clawmart's terms, in plain language: what you're buying, the 14-day refund, what we can and can't promise.",
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
        Effective 2026-07-02
      </p>
      <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
        Terms of Service
      </h1>
      <P>
        Plain language, because you should be able to read the whole thing.
        “Clawmart”, “we”, and “us” mean the operator of clawmart.co. By using
        the site or buying a Fix Kit you agree to these terms.
      </P>

      <H2>What the service is</H2>
      <P>
        Clawmart measures how AI models — the ones that power ChatGPT, Claude,
        and Perplexity, queried via their APIs — answer buyer-intent questions
        in your category, and whether they mention your brand. The free check
        returns a visibility tier. The paid AI Visibility Fix Kit ($49,
        one-time, per domain) returns mention scores with uncertainty bands,
        share-of-voice data, ready-to-paste fix artifacts, and full
        transcripts, delivered as a web report at a private tokened URL.
      </P>

      <H2>What we don&apos;t promise</H2>
      <P>
        We do not promise that any fix will cause any model or AI product to
        mention, recommend, or cite your brand. The fixes are designed to make
        your pages easier for AI crawlers and answer engines to cite; AI
        visibility optimization is a young field and evidence for these
        practices is emerging, not proven. Our measurements estimate model
        behavior via provider APIs — they are not recordings of any real
        user&apos;s session, and answers in consumer apps can differ.
      </P>

      <H2>Payment and refunds</H2>
      <P>
        Payment is handled by Stripe as a guest checkout — no account needed.
        The charge appears as CLAWMART.CO. Every Fix Kit carries a 14-day,
        no-questions refund: reply to your receipt or email{" "}
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="text-lobster underline underline-offset-4"
        >
          {SUPPORT_EMAIL}
        </a>
        . If report generation fails, or your report hasn&apos;t been delivered
        within 24 hours of payment, we flag the purchase for an automatic
        refund without you having to ask.
      </P>

      <H2>Your responsibilities</H2>
      <P>
        Run checks and buy kits only for domains you own, work on, or are
        otherwise authorized to analyze. Don&apos;t use the service to abuse
        rate limits, probe other people&apos;s infrastructure, or resell
        reports wholesale as your own product without adding your own work.
      </P>

      <H2>The report URL</H2>
      <P>
        Reports live at an unguessable tokened URL and are excluded from
        search indexing. Anyone you give the link to can read the report —
        treat it like a private document. We can rotate a token on request.
      </P>

      <H2>Liability</H2>
      <P>
        To the maximum extent permitted by law, our total liability for any
        claim related to the service is capped at the amount you paid us in
        the 12 months before the claim (for most customers, $49). The service
        is provided “as is”; we work hard to keep it accurate and available
        but don&apos;t warrant uninterrupted operation.
      </P>

      <H2>Changes</H2>
      <P>
        We may update these terms; material changes will be reflected by the
        effective date at the top. Continued use after a change means you
        accept the new terms.
      </P>

      <p className="mt-12 border-t border-border pt-6 text-[12.5px] leading-relaxed text-muted-foreground">
        {NON_AFFILIATION} See also the{" "}
        <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
          privacy policy
        </Link>{" "}
        and{" "}
        <Link href="/methodology" className="underline underline-offset-4 hover:text-foreground">
          methodology
        </Link>
        .
      </p>
    </div>
  );
}
