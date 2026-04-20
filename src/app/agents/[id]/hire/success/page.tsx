import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Bot, CheckCircle2, Mail, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAgentTemplateBySlug } from "@/lib/agent-templates";

interface SuccessPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session_id?: string }>;
}

export const metadata: Metadata = {
  title: "You're on the list — ClawMart",
  description: "Your Clawmart agent hire is confirmed.",
  robots: { index: false, follow: false },
};

export default async function HireSuccessPage({
  params,
  searchParams,
}: SuccessPageProps) {
  const { id } = await params;
  const { session_id } = await searchParams;
  const agent = getAgentTemplateBySlug(id);
  if (!agent) notFound();

  const sessionFragment = session_id ? session_id.slice(-8) : null;

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
            Browse agents
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-2xl px-6 pt-32 pb-24">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
            <CheckCircle2 className="h-7 w-7 text-emerald-400" />
          </div>
          <h1 className="mb-4 text-3xl font-semibold tracking-tight md:text-4xl">
            You&apos;re on the list for {agent.role}.
          </h1>
          <p className="max-w-lg text-[15px] leading-relaxed text-zinc-400">
            We&apos;ll email when your agent is live — target is 2 weeks. Your card is on file, but the 30-day trial means no charge until provisioning completes and you&apos;ve had time to use it.
          </p>
        </div>

        <div className="mb-6 space-y-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-6">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-zinc-300" />
            <p className="text-[13px] leading-relaxed text-zinc-400">
              <span className="font-medium text-white">Welcome email incoming.</span> Stripe confirmation plus a welcome note within the hour. Check spam for “clawmart.co” if missing.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-zinc-300" />
            <p className="text-[13px] leading-relaxed text-zinc-400">
              <span className="font-medium text-white">Early-buyers Discord.</span> Invite link coming in your welcome email — a private channel to help shape the first release.
            </p>
          </div>
        </div>

        <div className="mb-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/agents" className="flex-1">
            <Button size="lg" className="h-12 w-full bg-white text-[#09090b] hover:bg-zinc-200 text-[14px] font-medium">
              Hire another agent
            </Button>
          </Link>
          <Link href="/" className="flex-1">
            <Button size="lg" variant="outline" className="h-12 w-full border-white/[0.12] bg-transparent text-[14px] font-medium text-white hover:bg-white/[0.04]">
              Back to home
            </Button>
          </Link>
        </div>

        {sessionFragment ? (
          <p className="text-center text-[11px] text-zinc-600">Reference: …{sessionFragment}</p>
        ) : null}
      </main>
    </div>
  );
}
