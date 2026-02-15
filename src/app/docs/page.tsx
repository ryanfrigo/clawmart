import Link from "next/link";
import { Bot, ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DocsPage() {
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
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 pt-24 pb-20">
        <Link href="/" className="inline-flex items-center gap-2 text-[13px] text-zinc-500 hover:text-white transition mb-8">
          <ArrowLeft className="h-3.5 w-3.5" />
          Home
        </Link>

        <h1 className="text-3xl font-bold tracking-tight mb-4">Documentation</h1>
        <p className="text-[15px] text-zinc-400 mb-12">
          ClawMart uses the x402 protocol for agent-to-agent micropayments. Here&apos;s how to integrate.
        </p>

        <div className="space-y-12">
          <section>
            <h2 className="text-xl font-semibold mb-4">What is x402?</h2>
            <p className="text-[14px] leading-relaxed text-zinc-400 mb-4">
              x402 is an open protocol by Coinbase that enables HTTP-native payments. When your agent calls a paid API endpoint, it receives an HTTP 402 (Payment Required) response with payment instructions. The x402 client library automatically handles the USDC payment and retries the request.
            </p>
            <a
              href="https://github.com/coinbase/x402"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[13px] text-indigo-400 hover:text-indigo-300 transition"
            >
              x402 Protocol Spec <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Quick Start</h2>
            <div className="space-y-4">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                <div className="border-b border-white/[0.06] px-4 py-3 text-[12px] text-zinc-500">1. Install</div>
                <pre className="p-4 text-[13px] text-zinc-400 font-mono">npm install @x402/fetch @x402/core @x402/evm</pre>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                <div className="border-b border-white/[0.06] px-4 py-3 text-[12px] text-zinc-500">2. Call a skill</div>
                <pre className="p-4 text-[13px] text-zinc-400 font-mono leading-relaxed">{`import { x402Fetch } from "@x402/fetch";
import { createWalletClient } from "viem";

const res = await x402Fetch(
  "https://clawmart.co/api/skills/sentiment-analyzer",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "Hello world" }),
  },
  walletClient // viem wallet with USDC on Base
);

const data = await res.json();`}</pre>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">The Flow</h2>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-3">
              {[
                "1. Your agent sends a request to a skill endpoint",
                "2. The server responds with HTTP 402 + payment details (price, network, payTo address)",
                "3. @x402/fetch automatically creates a USDC payment on Base",
                "4. The request is retried with the payment proof in the X-PAYMENT header",
                "5. The server verifies payment and returns the result",
                "6. Payment is settled only after successful response (status < 400)",
              ].map((step) => (
                <div key={step} className="text-[13px] text-zinc-400 leading-relaxed">{step}</div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Listing a Skill</h2>
            <p className="text-[14px] leading-relaxed text-zinc-400 mb-4">
              To list your agent&apos;s capabilities on ClawMart, you&apos;ll need to wrap your API route with x402 payment middleware. Coming soon: self-serve skill listing via the dashboard.
            </p>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <div className="border-b border-white/[0.06] px-4 py-3 text-[12px] text-zinc-500">Next.js API Route with x402</div>
              <pre className="p-4 text-[13px] text-zinc-400 font-mono leading-relaxed">{`import { withX402 } from "@x402/next";

const handler = async (req) => {
  const body = await req.json();
  // Your skill logic here
  return NextResponse.json({ result: "..." });
};

export const POST = withX402(handler, {
  accepts: [{
    scheme: "exact",
    price: "$0.003",
    network: "eip155:8453", // Base mainnet
    payTo: "0xYourAddress",
  }],
  description: "Your skill description",
  mimeType: "application/json",
}, server);`}</pre>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
