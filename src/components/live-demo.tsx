"use client";

import { useState } from "react";
import { Zap, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const DEMOS = [
  {
    id: "sentiment-analyzer",
    label: "Sentiment Analyzer",
    price: "$0.001",
    placeholder: "Enter any text to analyze...",
    defaultInput: '{ "text": "I love the ClawMart marketplace — it\'s exactly what agent devs need!" }',
    field: "text",
  },
  {
    id: "code-reviewer",
    label: "Code Reviewer",
    price: "$0.005",
    placeholder: "Paste code to review...",
    defaultInput: '{ "code": "function fetchData(url) { return eval(url) }", "language": "javascript" }',
    field: "code",
  },
  {
    id: "data-extractor",
    label: "Data Extractor",
    price: "$0.004",
    placeholder: "Enter unstructured text...",
    defaultInput: '{ "text": "Invoice #9821 from NovaTech Corp, due 2026-04-15, total $12,500.00. Contact: sarah@novatech.io" }',
    field: "text",
  },
  {
    id: "web-summarizer",
    label: "Web Summarizer",
    price: "$0.003",
    placeholder: '{ "url": "https://..." }',
    defaultInput: '{ "url": "https://x402.org" }',
    field: "url",
  },
  {
    id: "voicecharm-receptionist",
    label: "🎙️ AI Receptionist",
    price: "$0.25",
    placeholder: "Configure your business...",
    defaultInput: '{ "business_name": "Ryan\'s HVAC", "business_type": "hvac", "services": ["heating repair", "ac installation", "maintenance"], "service_area": "Oakland, CA" }',
    field: "business_name",
  },
];

export function LiveDemo() {
  const [activeDemo, setActiveDemo] = useState(DEMOS[0]);
  const [input, setInput] = useState(DEMOS[0].defaultInput);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [callCount, setCallCount] = useState(0);

  const handleTabChange = (demo: typeof DEMOS[0]) => {
    setActiveDemo(demo);
    setInput(demo.defaultInput);
    setResult(null);
  };

  const handleRun = async () => {
    setLoading(true);
    setResult(null);
    try {
      let body: Record<string, unknown> = {};
      try { body = JSON.parse(input); } catch { body = {}; }

      const res = await fetch(`/api/skills/${activeDemo.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Demo": "true",
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setResult(JSON.stringify(data.result ?? data, null, 2));
      setCallCount((c) => c + 1);
    } catch {
      setResult(JSON.stringify({ error: "Request failed" }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center gap-1 border-b border-white/[0.06] px-4 py-3 overflow-x-auto">
          {DEMOS.map((demo) => (
            <button
              key={demo.id}
              onClick={() => handleTabChange(demo)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${
                activeDemo.id === demo.id
                  ? "bg-white/[0.06] text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {demo.label}
              <span className="ml-1.5 text-[10px] text-zinc-600">{demo.price}</span>
            </button>
          ))}
          {callCount > 0 && (
            <div className="ml-auto flex items-center gap-1.5 text-[11px] text-emerald-500 whitespace-nowrap pl-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {callCount} call{callCount !== 1 ? "s" : ""} made
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2">
          {/* Input */}
          <div className="border-b md:border-b-0 md:border-r border-white/[0.06] p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-zinc-500 font-medium">REQUEST BODY</span>
              <span className="text-[11px] text-zinc-600 font-mono">
                POST /api/skills/{activeDemo.id}
              </span>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 min-h-[160px] rounded-xl border border-white/[0.06] bg-[#09090b] p-4 text-[13px] text-zinc-300 font-mono leading-relaxed resize-none focus:outline-none focus:border-indigo-500/20 transition"
              spellCheck={false}
            />
            <Button
              onClick={handleRun}
              disabled={loading}
              className="h-10 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-[13px] font-medium disabled:opacity-50 w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Running...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Run Demo
                  <ChevronRight className="h-4 w-4 ml-1 opacity-60" />
                </>
              )}
            </Button>
            <p className="text-[11px] text-zinc-600 text-center">
              Free demo · No wallet needed · Real AI results
            </p>
          </div>

          {/* Output */}
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-zinc-500 font-medium">RESPONSE</span>
              {result && (
                <span className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  200 OK
                </span>
              )}
              {!result && !loading && (
                <span className="text-[11px] text-zinc-700">Waiting...</span>
              )}
            </div>
            <div className="flex-1 min-h-[160px] rounded-xl border border-white/[0.06] bg-[#09090b] p-4 overflow-auto">
              {loading && (
                <div className="flex items-center gap-2 text-[13px] text-zinc-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </div>
              )}
              {result && !loading && (
                <pre className="text-[13px] text-emerald-400/80 font-mono leading-relaxed whitespace-pre-wrap">
                  {result}
                </pre>
              )}
              {!result && !loading && (
                <div className="text-[13px] text-zinc-700 font-mono">
                  {`// Click "Run Demo" to see real results`}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
