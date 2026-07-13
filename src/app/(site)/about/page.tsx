import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SUPPORT_EMAIL } from "@/components/site/constants";

export const metadata: Metadata = {
  title: "About",
  description:
    "Clawmart Studio: describe a company or SaaS idea and a founding team of five AI agents drafts the plan, brand, product spec, a live page, and a launch kit — honestly labeled as AI drafts.",
  alternates: { canonical: "/about" },
};

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-14 font-display text-3xl tracking-tight">{children}</h2>;
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-6 sm:py-24">
      <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-lobster">
        About Clawmart
      </p>
      <h1 className="mt-3 font-display text-[clamp(2.5rem,6vw,4rem)] leading-[1.05] tracking-tight">
        An AI founding team that drafts your company.
      </h1>
      <P>
        Clawmart Studio takes a company or SaaS idea you describe in a sentence
        or two and puts a founding team of five AI agents to work on it. Here&apos;s
        exactly what that means — and what it doesn&apos;t.
      </P>

      <H2>What Clawmart Studio is</H2>
      <P>
        You describe the idea. Five agents — a Strategist, a Brand designer, a
        Product lead, a Landing-page builder, and a Marketer — draft the whole
        company: a business plan, a brand, a product spec, a standalone public
        page at its own link, and a launch kit of ready-to-edit posts and
        emails. The build takes about a minute, and you watch each agent work
        live as it happens.
      </P>

      <H2>What it is not</H2>
      <P>
        Drafts, not a running business. Everything the agents produce is an
        AI-generated starting point: unreviewed, sometimes wrong, and not
        business, legal, or financial advice. We don&apos;t promise that any
        idea, plan, or page will succeed — no guarantees, stated or implied.
        What you do with the drafts is up to you.
      </P>

      <H2>How we keep it honest</H2>
      <ul className="mt-4 list-disc space-y-3 pl-5 text-[15px] leading-relaxed text-muted-foreground">
        <li>
          <strong className="text-foreground">Every generated page is labeled.</strong>{" "}
          Each public company page carries a visible note that it&apos;s an
          AI-drafted concept, so nobody mistakes a draft for a real, operating
          company.
        </li>
        <li>
          <strong className="text-foreground">No fabricated social proof.</strong>{" "}
          The agents are prompt-forbidden from inventing testimonials, user
          counts, ratings, or statistics — on generated pages and everywhere on
          this site. If we ever show numbers, they&apos;ll be real.
        </li>
        <li>
          <strong className="text-foreground">Honest scope.</strong> We draft
          and host company assets. We don&apos;t claim to autonomously run a
          business, and we don&apos;t promise results.
        </li>
      </ul>

      <H2>Pricing</H2>
      <P>
        The Studio is free while we validate demand, with a limit of 3
        companies per account. If that changes, the change will be announced
        here and in the terms — not slipped in quietly.
      </P>

      <H2>Past purchases</H2>
      <P>
        Clawmart previously sold skill packs for OpenClaw. That storefront is
        discontinued, but earlier purchases are unaffected: your pack remains
        downloadable at its private link, and the 14-day refund is honored.
        Email{" "}
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="text-lobster underline underline-offset-4"
        >
          {SUPPORT_EMAIL}
        </a>{" "}
        for either.
      </P>

      <H2>Questions</H2>
      <P>
        Email{" "}
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="text-lobster underline underline-offset-4"
        >
          {SUPPORT_EMAIL}
        </a>{" "}
        — about the Studio, a past purchase, or anything else.
      </P>

      <p className="mt-12 border-t border-border pt-6 text-[12.5px] leading-relaxed text-muted-foreground">
        See also the{" "}
        <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
          terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
          privacy policy
        </Link>
        .
      </p>

      <Link
        href="/"
        className="mt-10 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Start your company
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
