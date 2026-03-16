"use client";

import { useState } from "react";
import Link from "next/link";
import { use } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
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
  ShoppingCart,
  LogIn,
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
  const { isSignedIn } = useUser();
  const skill = useQuery(api.skills.getBySlug, { slug: id });
  const creditBalance = useQuery(api.credits.getBalance);
  const spendAndCall = useMutation(api.credits.spendAndCall);

  const [copied, setCopied] = useState(false);
  // Demo mode state (unauthenticated)
  const [trying, setTrying] = useState(false);
  const [tryResult, setTryResult] = useState<string | null>(null);
  // Credit call state (authenticated)
  const [callingWithCredits, setCallingWithCredits] = useState(false);
  const [creditCallResult, setCreditCallResult] = useState<string | null>(null);
  const [remainingAfterCall, setRemainingAfterCall] = useState<number | null>(null);

  const [inputValue, setInputValue] = useState("");

  // Update input when skill loads
  const effectiveInput = inputValue || skill?.exampleInput || "";

  // Credit math: 1 credit = $0.001
  const creditsRequired = skill ? Math.ceil(skill.pricePerCall / 0.001) : 0;
  const hasEnoughCredits = typeof creditBalance === "number" && creditBalance >= creditsRequired;

  const displayBalance = remainingAfterCall !== null ? remainingAfterCall : (creditBalance ?? 0);

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

  // Demo mode: free call with X-Demo header (no credits deducted)
  const handleDemoTry = async () => {
    setTrying(true);
    setTryResult(null);
    try {
      const isInternalSkill = skill.endpoint.startsWith("/api/skills/");
      const res = await fetch(skill.endpoint, {
        method: skill.method,
        headers: {
          "Content-Type": "application/json",
          ...(isInternalSkill ? { "X-Demo": "true" } : {}),
        },
        body: skill.method !== "GET" ? effectiveInput : undefined,
      });

      const data = await res.json();

      if (res.status === 402) {
        setTryResult(
          JSON.stringify(
            {
              status: 402,
              message: "Payment Required",
              ...data,
              note: "In production, @x402/fetch handles this automatically with your wallet.",
            },
            null,
            2,
          ),
        );
      } else {
        setTryResult(JSON.stringify(data, null, 2));
      }
    } catch {
      setTryResult(JSON.stringify({ error: "Request failed. This is a demo endpoint." }, null, 2));
    } finally {
      setTrying(false);
    }
  };

  // Credit call: deduct credits then call the real endpoint
  const handleCreditCall = async () => {
    if (!skill) return;
    setCallingWithCredits(true);
    setCreditCallResult(null);
    setRemainingAfterCall(null);
    try {
      // 1. Deduct credits via Convex mutation
      const result = await spendAndCall({ skillId: skill._id, input: effectiveInput });
      setRemainingAfterCall(result.remainingCredits);

      // 2. Call the real skill endpoint (no X-Demo header)
      const res = await fetch(skill.endpoint, {
        method: skill.method,
        headers: { "Content-Type": "application/json" },
        body: skill.method !== "GET" ? effectiveInput : undefined,
      });
      const data = await res.json();
      setCreditCallResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setCreditCallResult(
        JSON.stringify(
          { error: err instanceof Error ? err.message : "Call failed" },
          null,
          2,
        ),
      );
    } finally {
      setCallingWithCredits(false);
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
          <div className="flex items-center gap-3">
            {/* Credit balance pill — only shown when signed in */}
            {isSignedIn && typeof creditBalance === "number" && (
              <Link
                href="/credits"
                className="flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/[0.06] px-3 py-1 text-[12px] font-medium text-indigo-300 transition hover:border-indigo-500/40 hover:bg-indigo-500/[0.1]"
              >
                <Zap className="h-3 w-3" />
                {displayBalance.toLocaleString()} credits
              </Link>
            )}
            <Link href="/sign-up">
              <Button size="sm" className="h-8 rounded-lg bg-white text-[#09090b] text-[13px] font-medium hover:bg-zinc-200">
                List a Skill
              </Button>
            </Link>
          </div>
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
            <span className="text-[11px] text-indigo-400">{creditsRequired.toLocaleString()} credits</span>
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
            {/* Request body */}
            <div>
              <label className="text-[12px] text-zinc-500 mb-2 block">Request Body</label>
              <textarea
                value={effectiveInput}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-[#09090b] p-4 text-[13px] text-zinc-300 font-mono leading-relaxed resize-none focus:outline-none focus:border-indigo-500/30 min-h-[80px]"
                rows={3}
              />
            </div>

            {/* Credit info + call button — varies by auth state */}
            {isSignedIn ? (
              <div className="space-y-3">
                {/* Balance + cost info */}
                <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                  <div className="flex items-center gap-2 text-[13px] text-zinc-400">
                    <Zap className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Your balance:</span>
                    <span className="font-semibold text-white">{displayBalance.toLocaleString()} credits</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[12px] text-zinc-500">
                    <span>Cost:</span>
                    <span className="font-semibold text-indigo-400">{creditsRequired} credits</span>
                  </div>
                </div>

                {hasEnoughCredits ? (
                  <Button
                    onClick={handleCreditCall}
                    disabled={callingWithCredits}
                    className="h-9 rounded-lg bg-indigo-500 text-white text-[13px] font-medium hover:bg-indigo-600 disabled:opacity-50"
                  >
                    {callingWithCredits ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Zap className="h-4 w-4 mr-2" />
                    )}
                    {callingWithCredits ? "Calling..." : `Call Skill — ${creditsRequired} credits`}
                  </Button>
                ) : (
                  <Link href="/credits">
                    <Button className="h-9 w-full rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[13px] font-medium hover:bg-amber-500/20">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Buy Credits — need {(creditsRequired - (creditBalance ?? 0)).toLocaleString()} more
                    </Button>
                  </Link>
                )}

                {/* Credit call result */}
                {creditCallResult && (
                  <div className="relative">
                    <label className="text-[12px] text-zinc-500 mb-2 block flex items-center gap-2">
                      Response
                      {remainingAfterCall !== null && (
                        <span className="text-indigo-400">
                          — ⚡ {remainingAfterCall.toLocaleString()} credits remaining
                        </span>
                      )}
                    </label>
                    <pre className="rounded-xl border border-white/[0.08] bg-[#09090b] p-4 text-[13px] text-emerald-400/80 font-mono leading-relaxed overflow-x-auto">
                      {creditCallResult}
                    </pre>
                  </div>
                )}

                {/* Demo mode divider */}
                <div className="flex items-center gap-3 pt-1">
                  <div className="flex-1 h-px bg-white/[0.06]" />
                  <span className="text-[11px] text-zinc-600">or try free demo</span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>
                <Button
                  onClick={handleDemoTry}
                  disabled={trying}
                  variant="ghost"
                  className="h-8 w-full rounded-lg border border-white/[0.06] text-zinc-500 text-[12px] hover:text-white hover:border-white/[0.12] disabled:opacity-50"
                >
                  {trying ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : null}
                  {trying ? "Running demo..." : "Run Demo (no credits)"}
                </Button>
                {tryResult && (
                  <div className="relative">
                    <label className="text-[12px] text-zinc-500 mb-2 block">Demo Response</label>
                    <pre className="rounded-xl border border-white/[0.08] bg-[#09090b] p-4 text-[13px] text-emerald-400/80 font-mono leading-relaxed overflow-x-auto">
                      {tryResult}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              /* Not signed in: show demo button + sign-in CTA */
              <div className="space-y-3">
                <Button
                  onClick={handleDemoTry}
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

                {/* Sign in CTA */}
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                  <LogIn className="h-4 w-4 text-indigo-400 shrink-0" />
                  <span className="text-[13px] text-zinc-400">
                    <Link href="/sign-in" className="text-indigo-400 hover:underline font-medium">Sign in</Link>
                    {" "}to call with credits and track your usage
                  </span>
                </div>
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
