import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  NON_AFFILIATION,
  OPENCLAW_URL,
  SKILLS_PATH,
  SUPPORT_EMAIL,
} from "@/components/site/constants";

export const metadata: Metadata = {
  title: "About",
  description:
    "What OpenClaw is, what Clawmart is, and how we keep the storefront honest. Clawmart is an independent, unaffiliated store of premium skill packs for OpenClaw.",
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
        A curated shop for OpenClaw skills.
      </h1>
      <P>
        Clawmart sells premium, ready-to-run skill packs for OpenClaw. We didn&apos;t
        invent OpenClaw and we&apos;re not part of it — we just build good bundles for
        it and sell them fairly. Here&apos;s exactly what that means.
      </P>

      <H2>What OpenClaw is</H2>
      <P>
        <a
          href={OPENCLAW_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground underline decoration-lobster/40 underline-offset-4 hover:decoration-lobster"
        >
          OpenClaw
        </a>{" "}
        is a self-hosted personal AI assistant you run yourself. You extend it with{" "}
        <em>skills</em> — small Markdown files (SKILL.md) built to its AgentSkills
        spec that teach the assistant to do a specific thing and when to do it. Its
        free public registry, ClawHub, hosts community skills you can grab à la carte.
      </P>
      <P>
        It&apos;s an open project with its own maintainers and community. Clawmart is
        a customer of that ecosystem, not a maintainer of it.
      </P>

      <H2>What Clawmart is</H2>
      <P>
        Clawmart is an independent storefront. We assemble skills into curated packs
        for one job each — outbound sales, e-commerce ops, a personal chief of staff,
        a content engine — write a real setup guide for each, and sell them for a flat
        price with a 14-day refund. A pack is a zip of skill folders you copy into{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13.5px] text-foreground/90">
          {SKILLS_PATH}
        </code>
        , then start a new session.
      </P>
      <P>
        You&apos;re paying for assembly and time, not for access to something secret.
        Everything in a pack is the same kind of file you could write yourself or find
        piecemeal on ClawHub — curated, made coherent, and documented so it installs in
        minutes instead of an afternoon.
      </P>

      <H2>How we keep it honest</H2>
      <ul className="mt-4 list-disc space-y-3 pl-5 text-[15px] leading-relaxed text-muted-foreground">
        <li>
          <strong className="text-foreground">No fabricated proof.</strong> No made-up
          install counts, star ratings, or testimonials. If we ever show numbers,
          they&apos;ll be real.
        </li>
        <li>
          <strong className="text-foreground">Honest about what you get.</strong> Packs
          are curated instruction bundles you adapt to your stack — not turnkey magic,
          and not tested against your exact environment.
        </li>
        <li>
          <strong className="text-foreground">Nominative naming only.</strong> We use
          the name &ldquo;OpenClaw&rdquo; to describe what the packs are for. No
          OpenClaw logos, no implied endorsement.
        </li>
        <li>
          <strong className="text-foreground">A real refund.</strong> 14 days, no
          questions asked, on every pack.
        </li>
      </ul>

      <H2>Questions</H2>
      <P>
        Email{" "}
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="text-lobster underline underline-offset-4"
        >
          {SUPPORT_EMAIL}
        </a>{" "}
        — about a pack, a refund, or anything else.
      </P>

      <p className="mt-12 border-t border-border pt-6 text-[12.5px] leading-relaxed text-muted-foreground">
        {NON_AFFILIATION} See also the{" "}
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
        href="/packs"
        className="mt-10 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Browse the packs
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
