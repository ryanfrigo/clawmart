"use client";

import { useState } from "react";
import Link from "next/link";
import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  ArrowLeft,
  Bot,
  Zap,
  Star,
  Clock,
  Activity,
  Copy,
  Check,
  Play,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < Math.floor(rating) ? "fill-amber-400 text-amber-400" : "text-zinc-700"}`}
        />
      ))}
      <span className="ml-1 text-[13px] text-zinc-400">{rating}</span>
    </div>
  );
}

export default function SkillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const skill = useQuery(api.skills.getBySlug, { slug: id });
  const [copied, setCopied] = useState(false);
  const [trying, setTrying] = useState(false);
  const [tryResult, setTryResult] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");

  // Update input when skill loads
  const effectiveInput = inputValue || skill?.exampleInput || "";

  if (skill === undefined) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-600" />
      </div>
    );
  }

  if (skill === null) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Skill not found</h1>
        <Link href="/" className="text-indigo-400 hover:underline">← Back to marketplace</Link>
      </div>
    );
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTry = async () => {
    setTrying(true);
    setTryResult(null);
    try {
      const res = await fetch(skill.endpoint, {
        method: skill.method,
        headers: { "Content-Type": "application/json" },
        body: effectiveInput,
      });
      if (res.status === 402) {
        const paymentInfo = await res.json();
        setTryResult(
          JSON.stringify(
            {
              status: 402,
              message: "Payment Required",
              ...paymentInfo,
              note: "In production, @x402/fetch handles this automatically with your wallet.",
            },
            null,
            2,
          ),
        );
      } else {
        const data = await res.json();
        setTryResult(JSON.stringify(data, null, 2));
      }
    } catch {
      setTryResult(JSON.stringify({ error: "Request failed. This is a demo endpoint." }, null, 2));
    } finally {
      setTrying(false);
    }
  };

  const curlCommand = `curl -X ${skill.method} https://clawmart.co${skill.endpoint} \\
  -H "Content-Type: application/json" \\
  -d '${skill.exampleInput || "{}"}'`;

  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-white/20">
      <nav className="fixed top-0 z-50 w-full border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white">
                <Bot className="h-4 w-4 text-[#09090b]" />
              </div>
              <span className="text-[15px] font-semibold tracking-tight">ClawMart</span>
            </Link>
          </div>
          <Link href="/sign-up">
            <Button size="sm" className="h-8 rounded-lg bg-white text-[#09090b] text-[13px] font-medium hover:bg-zinc-200">
              List a Skill
            </Button>
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-6 pt-24 pb-20">
        <Link href="/#skills" className="inline-flex items-center gap-2 text-[13px] text-zinc-500 hover:text-white transition mb-8">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Skills
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/[0.06]">
                <Zap className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{skill.name}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[12px] text-zinc-500">by {skill.authorName}</span>
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[11px] text-zinc-500">
                    {skill.category}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-3xl font-bold text-emerald-400">${skill.pricePerCall}</span>
            <span className="text-[12px] text-zinc-500">USDC per call</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { icon: Star, label: "Rating", value: skill.averageRating > 0 ? `${skill.averageRating}/5` : "—", sub: `${skill.totalReviews} reviews` },
            { icon: Activity, label: "Total Calls", value: String(skill.totalCalls), sub: "all time" },
            { icon: Clock, label: "Response Time", value: skill.responseTime || "—", sub: "average" },
            { icon: Zap, label: "Status", value: skill.status, sub: "current" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <stat.icon className="h-4 w-4 text-zinc-600 mb-2" />
              <div className="text-[18px] font-semibold">{stat.value}</div>
              <div className="text-[11px] text-zinc-500">{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Description */}
        <div className="mb-10">
          <h2 className="text-[15px] font-semibold mb-3">About</h2>
          <p className="text-[14px] leading-relaxed text-zinc-400">{skill.longDescription || skill.description}</p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-10">
          {skill.tags.map((tag) => (
            <span key={tag} className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-[12px] text-zinc-400">
              {tag}
            </span>
          ))}
        </div>

        {/* Try it */}
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.03] overflow-hidden mb-10">
          <div className="flex items-center justify-between border-b border-indigo-500/10 px-6 py-4">
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-indigo-400" />
              <h2 className="text-[15px] font-semibold">Try it</h2>
            </div>
            <span className="text-[11px] text-zinc-500">{skill.method} {skill.endpoint}</span>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-[12px] text-zinc-500 mb-2 block">Request Body</label>
              <textarea
                value={effectiveInput}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-[#09090b] p-4 text-[13px] text-zinc-300 font-mono leading-relaxed resize-none focus:outline-none focus:border-indigo-500/30 min-h-[80px]"
                rows={3}
              />
            </div>
            <Button
              onClick={handleTry}
              disabled={trying}
              className="h-9 rounded-lg bg-indigo-500 text-white text-[13px] font-medium hover:bg-indigo-600 disabled:opacity-50"
            >
              {trying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
              {trying ? "Calling..." : `Call Skill — $${skill.pricePerCall} USDC`}
            </Button>
            {tryResult && (
              <div className="relative">
                <label className="text-[12px] text-zinc-500 mb-2 block">Response</label>
                <pre className="rounded-xl border border-white/[0.08] bg-[#09090b] p-4 text-[13px] text-emerald-400/80 font-mono leading-relaxed overflow-x-auto">
                  {tryResult}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Integration */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden mb-10">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <h2 className="text-[15px] font-semibold">Integration</h2>
            <button
              onClick={() => handleCopy(curlCommand)}
              className="flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-white transition"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="text-[12px] text-zinc-500 mb-2 block">cURL</label>
              <pre className="rounded-xl border border-white/[0.06] bg-[#09090b] p-4 text-[13px] text-zinc-400 font-mono leading-relaxed overflow-x-auto">{curlCommand}</pre>
            </div>
            <div>
              <label className="text-[12px] text-zinc-500 mb-2 block">x402 Fetch (auto-pay)</label>
              <pre className="rounded-xl border border-white/[0.06] bg-[#09090b] p-4 text-[13px] text-zinc-400 font-mono leading-relaxed overflow-x-auto">{`import { x402Fetch } from "@x402/fetch";

const res = await x402Fetch(
  "https://clawmart.co${skill.endpoint}",
  {
    method: "${skill.method}",
    body: JSON.stringify(${skill.exampleInput || "{}"}),
  },
  walletClient
);`}</pre>
            </div>
          </div>
        </div>

        {/* Example response */}
        {skill.exampleOutput && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <div className="border-b border-white/[0.06] px-6 py-4">
              <h2 className="text-[15px] font-semibold">Example Response</h2>
            </div>
            <pre className="p-6 text-[13px] text-zinc-400 font-mono leading-relaxed overflow-x-auto">
              {skill.exampleOutput}
            </pre>
          </div>
        )}

        {/* Endpoint info */}
        <div className="mt-10 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center gap-3">
            <ExternalLink className="h-4 w-4 text-zinc-600" />
            <code className="text-[13px] text-zinc-400">{skill.method} https://clawmart.co{skill.endpoint}</code>
          </div>
          <div className="text-[13px] text-emerald-400 font-semibold">${skill.pricePerCall}/call</div>
        </div>
      </div>
    </div>
  );
}
