import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  agentsByDivision,
  DIVISIONS,
  ROSTER,
  type Division,
  type RosterAgent,
} from "../../../../convex/lib/roster";

export const metadata: Metadata = {
  title: "The Agency",
  description: `The Clawmart Agency roster: ${ROSTER.length} AI specialists across ${DIVISIONS.length} divisions that a live company can put on a mission. Everything they produce is an AI draft you review.`,
  alternates: { canonical: "/agency" },
};

/** One honest line per division — what the specialists in it are accountable for. */
const DIVISION_COPY: Record<Division, string> = {
  strategy: "Positioning, market, pricing, and the risks worth naming early.",
  product: "Scope, specs, sequencing, and the research that could falsify the idea.",
  engineering: "Architecture, interfaces, pipelines, security, tests, and performance.",
  design: "Identity, screens, the words inside the product, and accessibility.",
  growth: "Channels, search, content, lifecycle, and paid — with real kill criteria.",
  revenue: "The sales motion, onboarding to first value, and partner distribution.",
  operations: "Synthesis, cost models, compliance flags, support, and documentation.",
};

function AgentCard({ agent }: { agent: RosterAgent }) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card/40 p-4">
      <h3 className="text-[14px] font-medium leading-tight text-foreground">{agent.name}</h3>
      <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-muted-foreground">
        {agent.blurb}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {agent.tier === "premium" && (
          <span
            title="Routed to a stronger model when the mission's strategy allows it."
            className="inline-flex items-center rounded-full border border-lobster/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-lobster"
          >
            Premium
          </span>
        )}
        {agent.codeCapable && (
          <span
            title="Delivers code-level output — schemas, interfaces, and working code for the critical path."
            className="inline-flex items-center rounded-full border border-kelp/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-kelp"
          >
            Code
          </span>
        )}
      </div>
    </div>
  );
}

export default function AgencyPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-16 sm:px-6 sm:py-24">
      <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-lobster">The Agency</p>
      <h1 className="mt-3 font-display text-[clamp(2.5rem,6vw,4rem)] leading-[1.05] tracking-tight">
        The army behind your company.
      </h1>
      <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
        A founding team of five agents drafts a company in about a minute. The Agency is
        what comes after: {ROSTER.length} specialists across {DIVISIONS.length} divisions.
        Give a live company a goal and an orchestrator staffs a handful of them, runs them
        in parallel, and hands you what each one produced.
      </p>
      <p className="mt-4 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground/80">
        These are AI agents. They produce drafts — plans, specs, copy, code — reviewed by
        you, not finished work, and not business, legal, or financial advice. Nothing here
        ships on its own.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        <span className="text-lobster">Premium</span>
        <span className="normal-case tracking-normal">
          runs on a stronger model when the mission&apos;s strategy allows
        </span>
        <span className="text-kelp">Code</span>
        <span className="normal-case tracking-normal">
          delivers code-level output: schemas, interfaces, working code
        </span>
      </div>

      {DIVISIONS.map((division) => {
        const agents = agentsByDivision(division);
        return (
          <section key={division} className="mt-14">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="font-display text-3xl capitalize tracking-tight">{division}</h2>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {agents.length} specialists
              </p>
            </div>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
              {DIVISION_COPY[division]}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {agents.map((agent) => (
                <AgentCard key={agent.key} agent={agent} />
              ))}
            </div>
          </section>
        );
      })}

      <p className="mt-16 border-t border-border pt-6 text-[13.5px] leading-relaxed text-muted-foreground">
        Missions are dispatched from a company&apos;s build page once its first build is
        live. Start there.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Start your company
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
