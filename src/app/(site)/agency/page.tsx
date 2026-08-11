import type { Metadata } from "next";
import Link from "next/link";
import { StaffingFigure } from "@/components/site/pipeline-figure";
import { Button } from "@/components/ui/button";
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

/** A stamped capability tag. Tide is "a fact the router knows"; kelp is a
 *  delivered artifact kind. Neither is lobster — nothing here is executing. */
function Tag({
  tone,
  title,
  children,
}: {
  tone: "tide" | "kelp";
  title: string;
  children: React.ReactNode;
}) {
  return (
    <span
      title={title}
      className={
        tone === "tide"
          ? "inline-flex items-center rounded-[3px] border border-tide/45 px-1.5 py-0.5 font-mono text-[10px] uppercase leading-[1.4] tracking-[0.16em] text-tide"
          : "inline-flex items-center rounded-[3px] border border-kelp/45 px-1.5 py-0.5 font-mono text-[10px] uppercase leading-[1.4] tracking-[0.16em] text-kelp"
      }
    >
      {children}
    </span>
  );
}

function AgentCell({ agent }: { agent: RosterAgent }) {
  return (
    <div className="flex min-w-0 flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[14px] font-medium leading-tight text-foreground">
          {agent.name}
        </h3>
        <div className="flex shrink-0 gap-1">
          {agent.tier === "premium" && (
            <Tag
              tone="tide"
              title="Routed to a stronger model when the mission's strategy allows it."
            >
              Premium
            </Tag>
          )}
          {agent.codeCapable && (
            <Tag
              tone="kelp"
              title="Delivers code-level output — schemas, interfaces, and working code for the critical path."
            >
              Code
            </Tag>
          )}
        </div>
      </div>
      <p className="mt-2 text-[13px] leading-[1.55] text-muted-foreground">{agent.blurb}</p>
      <p className="mt-3 font-mono text-[11px] text-[color:var(--label)]">{agent.key}</p>
    </div>
  );
}

export default function AgencyPage() {
  return (
    <div>
      <header className="mx-auto max-w-[1200px] px-5 pb-12 pt-12 sm:px-8 sm:pt-16">
        <div className="grid gap-10 lg:grid-cols-[7fr_5fr] lg:items-start lg:gap-12">
          <div className="min-w-0">
            <p className="stamp">The Agency / Specialist roster</p>
            <h1 className="d1 mt-5 text-balance">The army behind your company.</h1>
            <p className="mt-6 max-w-[62ch] text-[17px] leading-[1.6] text-muted-foreground">
              A founding team of five agents drafts a company in about a minute. The
              Agency is what comes after: {ROSTER.length} specialists across{" "}
              {DIVISIONS.length} divisions. Give a live company a goal and an orchestrator
              staffs a handful of them, runs them in parallel, and hands you what each one
              produced.
            </p>
            <p className="mt-4 max-w-[68ch] text-[13.5px] leading-[1.55] text-muted-foreground">
              These are AI agents. They produce drafts — plans, specs, copy, code —
              reviewed by you, not finished work, and not business, legal, or financial
              advice. Nothing here ships on its own.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[color:var(--rule)] pt-5">
              <div className="flex items-center gap-2">
                <Tag tone="tide" title="Routed to a stronger model when the mission's strategy allows it.">
                  Premium
                </Tag>
                <span className="text-[12.5px] text-muted-foreground">
                  runs on a stronger model when the strategy allows
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Tag tone="kelp" title="Delivers code-level output.">
                  Code
                </Tag>
                <span className="text-[12.5px] text-muted-foreground">
                  delivers schemas, interfaces, working code
                </span>
              </div>
            </div>
          </div>

          <div className="min-w-0 lg:pt-2">
            <StaffingFigure />
          </div>
        </div>
      </header>

      {DIVISIONS.map((division, i) => {
        const agents = agentsByDivision(division);
        return (
          <section
            key={division}
            className="border-t border-[color:var(--rule)] py-12 sm:py-14"
          >
            <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
              <div className="grid gap-x-8 gap-y-4 lg:grid-cols-[72px_minmax(0,1fr)]">
                <p className="stamp lg:pt-1">{String(i + 1).padStart(2, "0")}/</p>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[color:var(--rule)] pb-2">
                    <h2 className="stamp-lg text-foreground">{division}</h2>
                    <p className="stamp">
                      {agents.length} {agents.length === 1 ? "specialist" : "specialists"}
                    </p>
                  </div>
                  <p className="mt-3 max-w-[68ch] text-[13.5px] leading-[1.55] text-muted-foreground">
                    {DIVISION_COPY[division]}
                  </p>
                  <div className="seam-wall mt-5 sm:grid-cols-2 lg:grid-cols-3">
                    {agents.map((agent) => (
                      <AgentCell key={agent.key} agent={agent} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      <section className="border-t border-[color:var(--rule)] py-14">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="grid gap-x-8 gap-y-4 lg:grid-cols-[72px_minmax(0,1fr)]">
            <p className="stamp lg:pt-1">→/</p>
            <div className="min-w-0">
              <p className="max-w-[68ch] text-[13.5px] leading-[1.55] text-muted-foreground">
                Missions are dispatched from a company&apos;s build page once its first
                build is live. Start there.
              </p>
              <Button asChild size="lg" className="mt-5">
                <Link href="/">Start your company →</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
