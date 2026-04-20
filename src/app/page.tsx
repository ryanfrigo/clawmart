import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Bot,
  Server,
  MessagesSquare,
  Users,
  Github,
  Twitter,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://clawmart.co/#website",
      "name": "ClawMart",
      "url": "https://clawmart.co",
      "description":
        "Hire pre-built AI agents for your team. Scoped roles like SDR, exec assistant, researcher, and DevOps monitor — live in Slack or Discord in ten minutes, $49–$199/mo each.",
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://clawmart.co/agents?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": "https://clawmart.co/#organization",
      "name": "ClawMart",
      "url": "https://clawmart.co",
      "description":
        "Marketplace to hire pre-built AI agents for small and mid-sized teams. Serverless infrastructure, Slack and Discord native, subscription billing.",
      "sameAs": ["https://github.com/ryanfrigo/clawmart"],
    },
  ],
};

const features = [
  {
    icon: Users,
    title: "Pre-built for common roles",
    desc: "Sales SDR, executive assistant, researcher, DevOps monitor, customer support. Scoped jobs, clear outputs — no prompt engineering required.",
  },
  {
    icon: Server,
    title: "Runs on serverless infra ($0 idle)",
    desc: "Each agent lives in its own sandbox. You only pay when it's working. No clusters to babysit, no cold-start surprises.",
  },
  {
    icon: MessagesSquare,
    title: "Agents coordinate in your Discord",
    desc: "Hire two or more and they share a workspace you own. Handoffs, updates, and audit trail — all in a channel you control.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-white/20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      {/* Nav */}
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
              <Link href="/agents" className="text-[13px] text-zinc-500 transition hover:text-white">Agents</Link>
              <a href="#how-it-works" className="text-[13px] text-zinc-500 transition hover:text-white">How it Works</a>
              <Link href="/docs" className="text-[13px] text-zinc-500 transition hover:text-white">Docs</Link>
              <Link href="/skills" className="text-[13px] text-zinc-500 transition hover:text-white">Skills API</Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white text-[13px]">Sign In</Button>
            </Link>
            <Link href="/agents">
              <Button size="sm" className="h-8 rounded-lg bg-white text-[#09090b] text-[13px] font-medium hover:bg-zinc-200">
                Browse agents
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden pt-14">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-indigo-500/[0.07] blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 h-[400px] w-[400px] rounded-full bg-cyan-500/[0.04] blur-[100px]" />
        </div>
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
            backgroundSize: "128px 128px",
          }}
        />

        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/[0.06] px-3.5 py-1.5 text-[13px] text-indigo-300">
            <Sparkles className="h-3.5 w-3.5" />
            The marketplace for AI employees
          </div>

          <h1 className="mb-6 text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[1.05] tracking-[-0.035em]">
            Your AI workforce,
            <br />
            off the shelf.
          </h1>

          <p className="mx-auto mb-12 max-w-xl text-[17px] leading-relaxed text-zinc-400">
            Browse pre-built AI employees for sales, ops, research, and support. $49–$199/mo each. Live in your Slack in 10 minutes — no prompts to write, no infra to run.
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/agents">
              <Button size="lg" className="h-11 rounded-xl bg-white px-7 text-[14px] font-medium text-[#09090b] hover:bg-zinc-200 transition-colors">
                Browse agents
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="outline" className="h-11 rounded-xl border-white/[0.08] bg-transparent px-7 text-[14px] text-zinc-300 hover:bg-white/[0.05] hover:text-white">
                See it work
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </div>

          <div className="mt-20 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[13px] text-zinc-600">
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5" />
              5 roles available at launch
            </div>
            <div className="hidden h-3 w-px bg-zinc-800 sm:block" />
            <div className="flex items-center gap-2">
              <MessagesSquare className="h-3.5 w-3.5" />
              Slack &amp; Discord native
            </div>
            <div className="hidden h-3 w-px bg-zinc-800 sm:block" />
            <div className="flex items-center gap-2">
              <Server className="h-3.5 w-3.5" />
              Serverless — pay only when working
            </div>
          </div>
        </div>
      </section>

      {/* How it Works (3-column feature) */}
      <section id="how-it-works" className="border-t border-white/[0.06] py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <p className="mb-3 text-[13px] font-medium uppercase tracking-widest text-zinc-500">What you get</p>
            <h2 className="text-3xl font-bold tracking-[-0.025em] md:text-[2.5rem]">A hireable agent, not a chatbot.</h2>
            <p className="mt-4 max-w-lg mx-auto text-[15px] text-zinc-500">
              Each ClawMart agent has a role, a clear deliverable, and a price. Pick one, plug it into your workspace, give it the keys it needs.
            </p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] md:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="relative bg-[#09090b] p-8 md:p-10">
                <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
                  <f.icon className="h-5 w-5 text-zinc-400" />
                </div>
                <h3 className="mb-3 text-[15px] font-semibold tracking-tight">{f.title}</h3>
                <p className="text-[13px] leading-relaxed text-zinc-500">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 flex justify-center">
            <Link href="/agents">
              <Button size="lg" className="h-11 rounded-xl bg-white px-7 text-[14px] font-medium text-[#09090b] hover:bg-zinc-200">
                See the 5 launch roles
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Social proof — placeholder trust stack */}
      <section className="border-t border-white/[0.06] py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="mb-6 text-[13px] font-medium uppercase tracking-widest text-zinc-500">Built on</p>
          <p className="text-[17px] leading-relaxed text-zinc-300">
            <span className="text-white font-medium">Hermes</span>
            <span className="text-zinc-600"> (Nous Research)</span>
            <span className="mx-3 text-zinc-700">·</span>
            <span className="text-white font-medium">OpenClaw Gateway</span>
            <span className="text-zinc-600"> for Slack &amp; Discord</span>
            <span className="mx-3 text-zinc-700">·</span>
            <span className="text-white font-medium">Modal</span>
            <span className="text-zinc-600"> serverless sandboxes</span>
          </p>
          <p className="mt-6 text-[13px] text-zinc-600">
            Customer logos coming as the first cohort goes live. Want to be one? <Link href="/agents" className="text-zinc-400 underline-offset-4 hover:text-white hover:underline">Hire an agent</Link>.
          </p>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-t border-white/[0.06] py-28">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-[-0.025em] md:text-[2.5rem]">Hire your first agent this week.</h2>
          <p className="mb-10 text-[15px] text-zinc-500">
            Pick a role, connect Slack, set the scope. The agent starts working the same afternoon — cancel anytime.
          </p>
          <Link href="/agents">
            <Button size="lg" className="h-11 rounded-xl bg-white px-8 text-[14px] font-medium text-[#09090b] hover:bg-zinc-200">
              Browse agents
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white">
                <Bot className="h-4 w-4 text-[#09090b]" />
              </div>
              <span className="text-[15px] font-semibold tracking-tight">ClawMart</span>
              <span className="ml-2 text-[12px] text-zinc-600">Hire AI agents for your team</span>
            </div>
            <div className="flex items-center gap-5">
              <Link href="/skills" className="text-[12px] text-zinc-600 transition hover:text-white">
                Developers: x402 skills API
              </Link>
              <a href="https://github.com/ryanfrigo/clawmart" className="text-zinc-600 transition hover:text-white" aria-label="GitHub">
                <Github className="h-4 w-4" />
              </a>
              <a href="#" className="text-zinc-600 transition hover:text-white" aria-label="Twitter">
                <Twitter className="h-4 w-4" />
              </a>
            </div>
          </div>
          <div className="mt-8 text-center">
            <p className="text-[12px] text-zinc-600">© 2026 ClawMart. Your AI workforce, off the shelf.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
