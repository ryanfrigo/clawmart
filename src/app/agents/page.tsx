import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Bot, Github, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { agentTemplates } from "@/lib/agent-templates";

export const metadata: Metadata = {
  title: "Hire an AI agent — ClawMart",
  description:
    "Pre-built AI agents you can hire today. Executive Assistants, SDRs, Researchers, Content Writers, DevOps Monitors — off the shelf, on your Slack.",
  openGraph: {
    title: "Hire an AI agent — ClawMart",
    description:
      "Your AI workforce, off the shelf. Pick a role, connect Slack, get hired in minutes.",
    url: "https://clawmart.co/agents",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hire an AI agent — ClawMart",
    description:
      "Your AI workforce, off the shelf. Pick a role, connect Slack, get hired in minutes.",
  },
};

export default function AgentsCatalogPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-white/20">
      {/* Nav — mirrors homepage */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white">
                <Bot className="h-4 w-4 text-[#09090b]" />
              </div>
              <span className="text-[15px] font-semibold tracking-tight">ClawMart</span>
            </Link>
            <div className="hidden items-center gap-6 md:flex">
              <Link href="/agents" className="text-[13px] text-white">Agents</Link>
              <Link href="/docs" className="text-[13px] text-zinc-500 transition hover:text-white">Docs</Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white text-[13px]">Sign In</Button>
            </Link>
            <Link href="/agents">
              <Button size="sm" className="h-8 rounded-lg bg-white text-[#09090b] text-[13px] font-medium hover:bg-zinc-200">
                Hire an agent
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="relative overflow-hidden pt-32 pb-12">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-indigo-500/[0.06] blur-[120px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <p className="mb-3 text-[13px] font-medium uppercase tracking-widest text-zinc-500">
              Agent catalog
            </p>
            <h1 className="text-[clamp(2rem,4.5vw,3.25rem)] font-bold leading-[1.1] tracking-[-0.03em]">
              Your AI workforce,<br />off the shelf.
            </h1>
            <p className="mt-5 text-[15px] leading-relaxed text-zinc-400 max-w-xl">
              Pick a role, connect your Slack, and the agent is working by end of day. Monthly subscription, cancel anytime, no setup fees.
            </p>
            <p className="mt-8 text-[13px] text-zinc-500">
              <span className="inline-flex h-1.5 w-1.5 mr-2 rounded-full bg-emerald-400 align-middle" />
              {agentTemplates.length} roles live. More coming weekly.
            </p>
          </div>
        </div>
      </section>

      {/* Catalog grid */}
      <section className="border-t border-white/[0.06] py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {agentTemplates.map((agent) => (
              <Link
                key={agent.slug}
                href={`/agents/${agent.slug}`}
                className="group relative flex cursor-pointer flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all hover:border-indigo-500/40 hover:bg-white/[0.04] hover:shadow-[0_0_0_1px_rgba(99,102,241,0.15),0_20px_40px_-20px_rgba(99,102,241,0.25)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-[17px] font-semibold tracking-tight text-white">
                    {agent.role}
                  </h2>
                  <div className="shrink-0 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[12px] font-medium text-zinc-300 tabular-nums">
                    ${agent.pricePerMonth}
                    <span className="text-zinc-500">/mo</span>
                  </div>
                </div>

                <p className="mt-3 text-[13px] leading-relaxed text-zinc-400">
                  {agent.description}
                </p>

                <div className="mt-5 rounded-xl border border-white/[0.05] bg-black/30 p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-600">
                    Sample output
                  </p>
                  <p className="mt-2 text-[12.5px] leading-relaxed italic text-zinc-300">
                    &ldquo;{agent.sampleOutput}&rdquo;
                  </p>
                </div>

                <div className="mt-auto pt-6">
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-white transition-colors group-hover:text-indigo-300">
                    Hire
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <p className="mt-12 text-center text-[13px] text-zinc-500">
            Don&apos;t see the role you need?{" "}
            <a
              href="mailto:hello@clawmart.co?subject=Agent%20role%20request"
              className="text-zinc-300 underline underline-offset-4 transition hover:text-white"
            >
              Tell us what to build next.
            </a>
          </p>
        </div>
      </section>

      {/* Footer — mirrors homepage */}
      <footer className="border-t border-white/[0.06] py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white">
                <Bot className="h-4 w-4 text-[#09090b]" />
              </div>
              <span className="text-[15px] font-semibold tracking-tight">ClawMart</span>
              <span className="ml-2 text-[12px] text-zinc-600">Your AI workforce, off the shelf</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="https://github.com/ryanfrigo/clawmart" className="text-zinc-600 transition hover:text-white"><Github className="h-4 w-4" /></a>
              <a href="#" className="text-zinc-600 transition hover:text-white"><Twitter className="h-4 w-4" /></a>
            </div>
          </div>
          <div className="mt-8 text-center">
            <p className="text-[12px] text-zinc-600">© 2026 ClawMart.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
