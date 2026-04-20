import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Bot, Check, ShieldCheck } from "lucide-react";
import { agentTemplates, getAgentTemplateBySlug } from "@/lib/agent-templates";
import { HireCTA } from "./hire-cta";

interface HirePageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return agentTemplates.map((a) => ({ id: a.slug }));
}

export async function generateMetadata({ params }: HirePageProps): Promise<Metadata> {
  const { id } = await params;
  const agent = getAgentTemplateBySlug(id);
  if (!agent) return { title: "Agent not found — ClawMart" };
  return {
    title: `Hire a ${agent.role} — ClawMart`,
    description: `${agent.description} $${agent.pricePerMonth}/month. 30-day free trial.`,
    openGraph: {
      title: `Hire a ${agent.role} — ClawMart`,
      description: agent.description,
      url: `https://clawmart.co/agents/${agent.slug}/hire`,
      type: "website",
    },
  };
}

export default async function HirePage({ params }: HirePageProps) {
  const { id } = await params;
  const agent = getAgentTemplateBySlug(id);
  if (!agent) notFound();

  const bullets = [
    "Cancel anytime from your dashboard — no charge today.",
    "Slack and Discord integration included.",
    "Dedicated private channel for each agent you hire.",
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-white/20">
      <nav className="fixed top-0 z-50 w-full border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white">
              <Bot className="h-4 w-4 text-[#09090b]" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">ClawMart</span>
          </Link>
          <Link href="/agents" className="text-[13px] text-zinc-500 transition hover:text-white">
            ← All agents
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 pt-32 pb-24">
        <div className="mb-10">
          <p className="mb-3 text-[12px] uppercase tracking-[0.2em] text-zinc-500">Hire {agent.role}</p>
          <h1 className="mb-4 text-4xl font-semibold tracking-tight md:text-5xl">{agent.role}</h1>
          <p className="text-[15px] leading-relaxed text-zinc-400">{agent.description}</p>
        </div>

        <div className="mb-8 rounded-xl border border-white/[0.08] bg-white/[0.02] p-6">
          <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-zinc-500">Sample output</p>
          <p className="text-[14px] leading-relaxed text-zinc-300">“{agent.sampleOutput}”</p>
        </div>

        <div className="mb-8 rounded-xl border border-white/[0.08] bg-white/[0.02] p-6">
          <div className="mb-4 flex items-baseline justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Price</p>
              <p className="text-3xl font-semibold tracking-tight">
                ${agent.pricePerMonth}
                <span className="text-[14px] font-normal text-zinc-500"> / month</span>
              </p>
            </div>
            <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-emerald-400">
              30-day free trial
            </div>
          </div>

          <ul className="mb-6 space-y-2 text-[13px] text-zinc-400">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                {b}
              </li>
            ))}
          </ul>

          <HireCTA agentSlug={agent.slug} role={agent.role} pricePerMonth={agent.pricePerMonth} />

          <p className="mt-4 text-center text-[12px] leading-relaxed text-zinc-500">
            No charge today. Card on file; first payment after your agent is provisioned (we&apos;re shipping v1 soon). Cancel anytime in your dashboard.
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-white/[0.04] bg-white/[0.01] p-5 text-[12px] text-zinc-500">
          <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-zinc-500" />
          <p>
            Payments handled by Stripe. We never see your card number. Manage or cancel your subscription from the billing portal at any time during or after the trial.
          </p>
        </div>
      </main>
    </div>
  );
}
