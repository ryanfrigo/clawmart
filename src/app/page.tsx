import Link from "next/link";
import {
  TrendingUp,
  Megaphone,
  Building,
  Headphones,
  Scale,
  ArrowRight,
  Zap,
  Users,
  BarChart3,
  Shield,
  Bot,
  Sparkles,
  Check,
  Github,
  Twitter,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const templates = [
  {
    name: "Sales Team",
    icon: TrendingUp,
    agents: ["Lead Researcher", "Outreach Writer", "CRM Manager", "Meeting Prep"],
    description: "Research leads, write outreach, manage pipeline, prep for meetings.",
  },
  {
    name: "Marketing Agency",
    icon: Megaphone,
    agents: ["Content Writer", "SEO Analyst", "Social Media Manager", "Analytics Reporter"],
    description: "Create content, optimize SEO, manage social, track analytics.",
  },
  {
    name: "Real Estate",
    icon: Building,
    agents: ["Deal Analyzer", "Market Researcher", "Outreach Agent", "Document Drafter", "Property Scout"],
    description: "Analyze deals, research markets, handle outreach, draft documents.",
  },
  {
    name: "Customer Support",
    icon: Headphones,
    agents: ["Frontline Support", "Technical Support", "Knowledge Manager", "Customer Success"],
    description: "Handle tickets, resolve issues, maintain knowledge base, retain customers.",
  },
  {
    name: "Legal & Compliance",
    icon: Scale,
    agents: ["Legal Researcher", "Document Drafter", "Client Intake", "Compliance Monitor"],
    description: "Research case law, draft documents, manage intake, monitor compliance.",
  },
];

const steps = [
  { icon: Sparkles, title: "Pick a template", description: "Choose from industry-specific agent teams or describe what you need." },
  { icon: Users, title: "Customize your team", description: "Adjust agent roles, prompts, tools, and shared context for your workflow." },
  { icon: Zap, title: "Deploy instantly", description: "Your AI workforce goes live with fully managed infrastructure." },
  { icon: BarChart3, title: "Monitor & scale", description: "Track performance, conversations, and scale as your business grows." },
];

const plans = [
  {
    name: "Starter",
    price: "$0",
    period: "",
    description: "For individuals getting started",
    features: ["1 workforce", "3 agents", "100 messages/day", "Community support", "All templates"],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/mo",
    description: "For growing teams and agencies",
    features: ["3 workforces", "Unlimited agents", "1,000 messages/day", "Priority support", "Custom prompts", "API access"],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For organizations at scale",
    features: ["Unlimited workforces", "Unlimited agents", "Unlimited messages", "Dedicated support", "Custom templates", "SSO & SAML", "SLA guarantee"],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function LandingPage() {
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
              <a href="#templates" className="text-[13px] text-zinc-500 transition hover:text-white">Templates</a>
              <a href="#how-it-works" className="text-[13px] text-zinc-500 transition hover:text-white">How it Works</a>
              <a href="#pricing" className="text-[13px] text-zinc-500 transition hover:text-white">Pricing</a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white text-[13px]">Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm" className="h-8 rounded-lg bg-white text-[#09090b] text-[13px] font-medium hover:bg-zinc-200">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-[100vh] items-center justify-center overflow-hidden pt-14">
        {/* Subtle gradient */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-indigo-500/[0.07] blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 h-[400px] w-[400px] rounded-full bg-cyan-500/[0.04] blur-[100px]" />
        </div>
        {/* Grain overlay */}
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`, backgroundRepeat: 'repeat', backgroundSize: '128px 128px' }} />

        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-[13px] text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Now in public beta
          </div>

          <h1 className="mb-6 text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[1.05] tracking-[-0.035em]">
            AI agent teams,
            <br />
            built for work.
          </h1>

          <p className="mx-auto mb-12 max-w-xl text-[17px] leading-relaxed text-zinc-400">
            Spin up specialized AI agent teams in minutes. They research, write, analyze, and collaborate — you just set the goals.
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/sign-up">
              <Button size="lg" className="h-11 rounded-xl bg-white px-7 text-[14px] font-medium text-[#09090b] hover:bg-zinc-200 transition-colors">
                Start Building
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="outline" className="h-11 rounded-xl border-white/[0.08] bg-transparent px-7 text-[14px] text-zinc-300 hover:bg-white/[0.05] hover:text-white">
                How it Works
              </Button>
            </a>
          </div>

          {/* Social proof */}
          <div className="mt-20 flex items-center justify-center gap-8 text-[13px] text-zinc-600">
            <div className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5" />
              SOC 2 Ready
            </div>
            <div className="h-3 w-px bg-zinc-800" />
            <div>No credit card required</div>
            <div className="h-3 w-px bg-zinc-800" />
            <div>5 min setup</div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="border-t border-white/[0.06] py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-20 text-center">
            <p className="mb-3 text-[13px] font-medium uppercase tracking-widest text-zinc-500">How it works</p>
            <h2 className="text-3xl font-bold tracking-[-0.025em] md:text-[2.5rem]">Four steps to your AI workforce</h2>
          </div>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] md:grid-cols-4">
            {steps.map((step, i) => (
              <div key={i} className="relative bg-[#09090b] p-8 md:p-10">
                <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
                  <step.icon className="h-5 w-5 text-zinc-400" />
                </div>
                <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-600">Step {i + 1}</div>
                <h3 className="mb-3 text-[15px] font-semibold tracking-tight">{step.title}</h3>
                <p className="text-[13px] leading-relaxed text-zinc-500">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Templates */}
      <section id="templates" className="border-t border-white/[0.06] py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-20 text-center">
            <p className="mb-3 text-[13px] font-medium uppercase tracking-widest text-zinc-500">Templates</p>
            <h2 className="text-3xl font-bold tracking-[-0.025em] md:text-[2.5rem]">Pre-built agent teams</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <div
                key={t.name}
                className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.04]"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] transition-colors group-hover:border-white/[0.15]">
                  <t.icon className="h-5 w-5 text-zinc-400" />
                </div>
                <h3 className="mb-2 text-[15px] font-semibold tracking-tight">{t.name}</h3>
                <p className="mb-5 text-[13px] leading-relaxed text-zinc-500">{t.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {t.agents.map((a) => (
                    <span key={a} className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[11px] text-zinc-400">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-white/[0.06] py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-20 text-center">
            <p className="mb-3 text-[13px] font-medium uppercase tracking-widest text-zinc-500">Pricing</p>
            <h2 className="text-3xl font-bold tracking-[-0.025em] md:text-[2.5rem]">Start free. Scale when ready.</h2>
          </div>
          <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-8 transition-all ${
                  plan.popular
                    ? "border-white/[0.15] bg-white/[0.04] shadow-[0_0_60px_-15px_rgba(99,102,241,0.15)]"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-0.5 text-[11px] font-semibold text-[#09090b]">
                    Popular
                  </div>
                )}
                <h3 className="text-[15px] font-semibold">{plan.name}</h3>
                <div className="mt-4 mb-1">
                  <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                  {plan.period && <span className="text-[13px] text-zinc-500">{plan.period}</span>}
                </div>
                <p className="mb-8 text-[13px] text-zinc-500">{plan.description}</p>
                <Link href="/sign-up">
                  <Button
                    className={`w-full rounded-xl text-[13px] font-medium ${
                      plan.popular
                        ? "bg-white text-[#09090b] hover:bg-zinc-200"
                        : "border-white/[0.08] bg-transparent hover:bg-white/[0.05]"
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </Link>
                <ul className="mt-8 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-[13px] text-zinc-400">
                      <Check className="h-3.5 w-3.5 text-zinc-600" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/[0.06] py-32">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-[-0.025em] md:text-[2.5rem]">Ready to build your AI workforce?</h2>
          <p className="mb-10 text-[15px] text-zinc-500">
            Join hundreds of businesses automating and scaling with AI agent teams.
          </p>
          <Link href="/sign-up">
            <Button size="lg" className="h-11 rounded-xl bg-white px-8 text-[14px] font-medium text-[#09090b] hover:bg-zinc-200">
              Start Building
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 md:grid-cols-5">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white">
                  <Bot className="h-4 w-4 text-[#09090b]" />
                </div>
                <span className="text-[15px] font-semibold tracking-tight">ClawMart</span>
              </div>
              <p className="max-w-xs text-[13px] leading-relaxed text-zinc-500">
                AI agent teams for your business. Deploy specialized workforces that research, write, analyze, and collaborate.
              </p>
            </div>
            <div>
              <h4 className="mb-4 text-[12px] font-medium uppercase tracking-[0.15em] text-zinc-500">Product</h4>
              <ul className="space-y-2.5">
                <li><a href="#templates" className="text-[13px] text-zinc-400 transition hover:text-white">Templates</a></li>
                <li><a href="#pricing" className="text-[13px] text-zinc-400 transition hover:text-white">Pricing</a></li>
                <li><a href="#" className="text-[13px] text-zinc-400 transition hover:text-white">Changelog</a></li>
                <li><a href="#" className="text-[13px] text-zinc-400 transition hover:text-white">Docs</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-[12px] font-medium uppercase tracking-[0.15em] text-zinc-500">Company</h4>
              <ul className="space-y-2.5">
                <li><a href="#" className="text-[13px] text-zinc-400 transition hover:text-white">About</a></li>
                <li><a href="#" className="text-[13px] text-zinc-400 transition hover:text-white">Blog</a></li>
                <li><a href="#" className="text-[13px] text-zinc-400 transition hover:text-white">Careers</a></li>
                <li><a href="#" className="text-[13px] text-zinc-400 transition hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-[12px] font-medium uppercase tracking-[0.15em] text-zinc-500">Legal</h4>
              <ul className="space-y-2.5">
                <li><a href="#" className="text-[13px] text-zinc-400 transition hover:text-white">Privacy</a></li>
                <li><a href="#" className="text-[13px] text-zinc-400 transition hover:text-white">Terms</a></li>
                <li><a href="#" className="text-[13px] text-zinc-400 transition hover:text-white">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-16 flex items-center justify-between border-t border-white/[0.06] pt-8">
            <p className="text-[12px] text-zinc-600">© 2026 ClawMart. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-zinc-600 transition hover:text-white"><Twitter className="h-4 w-4" /></a>
              <a href="#" className="text-zinc-600 transition hover:text-white"><Github className="h-4 w-4" /></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
