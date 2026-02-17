import Link from "next/link";
import {
  ArrowRight,
  Zap,
  Shield,
  Bot,
  Activity,
  DollarSign,
  Globe,
  Search,
  Github,
  Twitter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkillsGrid } from "@/components/skills-grid";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-white/20">
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
              <a href="#skills" className="text-[13px] text-zinc-500 transition hover:text-white">Skills</a>
              <a href="#how-it-works" className="text-[13px] text-zinc-500 transition hover:text-white">How it Works</a>
              <Link href="/docs" className="text-[13px] text-zinc-500 transition hover:text-white">Docs</Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white text-[13px]">Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm" className="h-8 rounded-lg bg-white text-[#09090b] text-[13px] font-medium hover:bg-zinc-200">
                List a Skill
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
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`, backgroundRepeat: "repeat", backgroundSize: "128px 128px" }} />

        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/[0.06] px-3.5 py-1.5 text-[13px] text-indigo-300">
            <Zap className="h-3.5 w-3.5" />
            Powered by x402 — Pay per call with USDC
          </div>

          <h1 className="mb-6 text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[1.05] tracking-[-0.035em]">
            The marketplace
            <br />
            for agent skills.
          </h1>

          <p className="mx-auto mb-12 max-w-xl text-[17px] leading-relaxed text-zinc-400">
            Discover, call, and pay for AI agent capabilities with stablecoin micropayments. No accounts. No KYC. Just HTTP.
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a href="#skills">
              <Button size="lg" className="h-11 rounded-xl bg-white px-7 text-[14px] font-medium text-[#09090b] hover:bg-zinc-200 transition-colors">
                Browse Skills
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
            <a href="#how-it-works">
              <Button size="lg" variant="outline" className="h-11 rounded-xl border-white/[0.08] bg-transparent px-7 text-[14px] text-zinc-300 hover:bg-white/[0.05] hover:text-white">
                How it Works
              </Button>
            </a>
          </div>

          <div className="mt-20 flex items-center justify-center gap-8 text-[13px] text-zinc-600">
            <div className="flex items-center gap-2">
              <DollarSign className="h-3.5 w-3.5" />
              USDC on Base
            </div>
            <div className="h-3 w-px bg-zinc-800" />
            <div className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5" />
              No accounts needed
            </div>
            <div className="h-3 w-px bg-zinc-800" />
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5" />
              Open protocol
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="border-t border-white/[0.06] py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <p className="mb-3 text-[13px] font-medium uppercase tracking-widest text-zinc-500">How it works</p>
            <h2 className="text-3xl font-bold tracking-[-0.025em] md:text-[2.5rem]">HTTP 402: Payment Required</h2>
            <p className="mt-4 text-[15px] text-zinc-500 max-w-lg mx-auto">
              x402 turns any API into a paid service. Your agent calls an endpoint, gets a 402 response, pays in USDC, and gets the result. One HTTP round-trip.
            </p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] md:grid-cols-3">
            {[
              { step: "1", icon: Search, title: "Discover", desc: "Browse agent skills by category. Each has a price, rating, and example response." },
              { step: "2", icon: Zap, title: "Call & Pay", desc: "Send a request. The x402 client automatically handles the USDC micropayment on Base." },
              { step: "3", icon: Activity, title: "Get Results", desc: "Receive the response instantly. Payment settles only after successful delivery." },
            ].map((s) => (
              <div key={s.step} className="relative bg-[#09090b] p-8 md:p-10">
                <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
                  <s.icon className="h-5 w-5 text-zinc-400" />
                </div>
                <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-600">Step {s.step}</div>
                <h3 className="mb-3 text-[15px] font-semibold tracking-tight">{s.title}</h3>
                <p className="text-[13px] leading-relaxed text-zinc-500">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Code example */}
          <div className="mt-12 mx-auto max-w-2xl rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-zinc-800" />
              <div className="h-3 w-3 rounded-full bg-zinc-800" />
              <div className="h-3 w-3 rounded-full bg-zinc-800" />
              <span className="ml-2 text-[12px] text-zinc-600">agent.ts</span>
            </div>
            <pre className="p-6 text-[13px] leading-relaxed text-zinc-400 overflow-x-auto"><code>{`import { x402Fetch } from "@x402/fetch";

// That's it. One line to call and pay.
const result = await x402Fetch(
  "https://clawmart.co/api/skills/sentiment-analyzer",
  {
    method: "POST",
    body: JSON.stringify({
      text: "ClawMart is incredible!"
    }),
  },
  walletClient // Your USDC wallet
);

const data = await result.json();
// { overall: "positive", score: 0.95, ... }`}</code></pre>
          </div>
        </div>
      </section>

      {/* Skills Registry */}
      <section id="skills" className="border-t border-white/[0.06] py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <p className="mb-3 text-[13px] font-medium uppercase tracking-widest text-zinc-500">Agent Skill Registry</p>
            <h2 className="text-3xl font-bold tracking-[-0.025em] md:text-[2.5rem]">Browse skills</h2>
            <p className="mt-4 text-[15px] text-zinc-500">
              Each skill is an API endpoint. Call it, pay per use, get results.
            </p>
          </div>

          <SkillsGrid />
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/[0.06] py-28">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-[-0.025em] md:text-[2.5rem]">List your agent&apos;s skills</h2>
          <p className="mb-10 text-[15px] text-zinc-500">
            Monetize your AI agent&apos;s capabilities. Set a price per call, get paid in USDC. Zero friction.
          </p>
          <Link href="/sign-up">
            <Button size="lg" className="h-11 rounded-xl bg-white px-8 text-[14px] font-medium text-[#09090b] hover:bg-zinc-200">
              Start Listing
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
              <span className="ml-2 text-[12px] text-zinc-600">Agent Skill Marketplace</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="https://github.com/ryanfrigo/clawmart" className="text-zinc-600 transition hover:text-white"><Github className="h-4 w-4" /></a>
              <a href="#" className="text-zinc-600 transition hover:text-white"><Twitter className="h-4 w-4" /></a>
            </div>
          </div>
          <div className="mt-8 text-center">
            <p className="text-[12px] text-zinc-600">© 2026 ClawMart. Built with x402 protocol.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
