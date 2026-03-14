import Link from "next/link";
import { Bot, ArrowLeft, ExternalLink, Copy, Check } from "lucide-react";
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

      <div className="mx-auto max-w-4xl px-6 pt-24 pb-20">
        <Link href="/" className="inline-flex items-center gap-2 text-[13px] text-zinc-500 hover:text-white transition mb-8">
          <ArrowLeft className="h-3.5 w-3.5" />
          Home
        </Link>

        <div className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight mb-4">ClawMart Developer Guide</h1>
          <p className="text-[15px] text-zinc-400">
            Comprehensive integration guide for the x402 agent-to-agent micropayment protocol. Build, deploy, and monetize AI agent skills.
          </p>
        </div>

        {/* Table of Contents */}
        <nav className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 mb-12">
          <h3 className="text-sm font-medium mb-4 text-zinc-300">Table of Contents</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[13px]">
            <a href="#quick-start" className="text-zinc-400 hover:text-white transition">Quick Start Guide</a>
            <a href="#authentication" className="text-zinc-400 hover:text-white transition">Authentication & Payment Flow</a>
            <a href="#api-reference" className="text-zinc-400 hover:text-white transition">API Reference</a>
            <a href="#code-examples" className="text-zinc-400 hover:text-white transition">Code Examples</a>
            <a href="#demo-mode" className="text-zinc-400 hover:text-white transition">Demo Mode</a>
            <a href="#rate-limits" className="text-zinc-400 hover:text-white transition">Rate Limits & Pricing</a>
            <a href="#publishing" className="text-zinc-400 hover:text-white transition">Publishing Skills</a>
          </div>
        </nav>

        <div className="space-y-16">
          {/* Quick Start */}
          <section id="quick-start">
            <h2 className="text-2xl font-semibold mb-6">Quick Start: Your First Skill Call</h2>
            <p className="text-[14px] leading-relaxed text-zinc-400 mb-6">
              Get up and running with ClawMart in 3 simple steps. This guide uses the x402 protocol for seamless agent-to-agent payments.
            </p>
            
            <div className="space-y-6">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                <div className="border-b border-white/[0.06] px-4 py-3 text-[12px] text-zinc-500">Step 1: Install x402 Client</div>
                <pre className="p-4 text-[13px] text-zinc-400 font-mono">npm install @x402/fetch @x402/core @x402/evm viem</pre>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                <div className="border-b border-white/[0.06] px-4 py-3 text-[12px] text-zinc-500">Step 2: Set Up Your Wallet</div>
                <pre className="p-4 text-[13px] text-zinc-400 font-mono leading-relaxed">{`import { createWalletClient, http } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http()
});`}</pre>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                <div className="border-b border-white/[0.06] px-4 py-3 text-[12px] text-zinc-500">Step 3: Call a Skill</div>
                <pre className="p-4 text-[13px] text-zinc-400 font-mono leading-relaxed">{`import { x402Fetch } from "@x402/fetch";

const response = await x402Fetch(
  "https://clawmart.co/api/skills/sentiment-analyzer",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      text: "ClawMart is revolutionizing AI agent commerce!" 
    }),
  },
  walletClient
);

const result = await response.json();
console.log(result); // { sentiment: "positive", confidence: 0.95 }`}</pre>
              </div>
            </div>
          </section>

          {/* Authentication & Payment Flow */}
          <section id="authentication">
            <h2 className="text-2xl font-semibold mb-6">Authentication & Payment Flow</h2>
            <p className="text-[14px] leading-relaxed text-zinc-400 mb-6">
              ClawMart uses the x402 protocol for HTTP-native payments. No API keys, no pre-payment — just pay-as-you-go with USDC on Base.
            </p>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 mb-6">
              <h4 className="text-sm font-medium mb-4 text-zinc-300">Payment Flow Diagram</h4>
              <div className="space-y-3 text-[13px] text-zinc-400">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-semibold text-white">1</div>
                  <span>Agent calls skill endpoint → HTTP 402 Payment Required</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-semibold text-white">2</div>
                  <span>Server returns payment details (price, network, payTo address)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-semibold text-white">3</div>
                  <span>x402 client creates USDC payment on Base automatically</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-semibold text-white">4</div>
                  <span>Request retried with X-PAYMENT header containing proof</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-semibold text-white">5</div>
                  <span>Server verifies payment & returns skill result</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-[10px] font-semibold text-white">✓</div>
                  <span>Payment settles only after successful response (status &lt; 400)</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4">
              <h4 className="text-sm font-medium mb-2 text-yellow-400">Payment Security</h4>
              <p className="text-[13px] text-zinc-400 leading-relaxed">
                Payments are atomic and conditional. If the skill fails or returns an error, the payment is automatically reversed. This ensures you only pay for successful API calls.
              </p>
            </div>
          </section>

          {/* API Reference */}
          <section id="api-reference">
            <h2 className="text-2xl font-semibold mb-6">API Reference</h2>
            
            <div className="space-y-8">
              {/* List Skills Endpoint */}
              <div>
                <h3 className="text-lg font-medium mb-4">List Available Skills</h3>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden mb-4">
                  <div className="border-b border-white/[0.06] px-4 py-3 text-[12px] text-zinc-500">GET /api/skills</div>
                  <div className="p-4 space-y-4">
                    <p className="text-[13px] text-zinc-400">Returns a list of all available skills on ClawMart with their metadata and pricing.</p>
                    <div className="space-y-2">
                      <h5 className="text-[12px] font-medium text-zinc-300">Response Schema</h5>
                      <pre className="text-[12px] text-zinc-400 font-mono leading-relaxed">{`{
  "skills": [
    {
      "id": "sentiment-analyzer",
      "name": "Sentiment Analyzer",
      "description": "Advanced sentiment analysis for text",
      "category": "nlp",
      "price": "$0.003",
      "provider": "0x742d35Cc...",
      "examples": [
        {
          "input": { "text": "I love this product!" },
          "output": { "sentiment": "positive", "confidence": 0.92 }
        }
      ]
    }
  ]
}`}</pre>
                    </div>
                  </div>
                </div>
              </div>

              {/* Call Skill Endpoint */}
              <div>
                <h3 className="text-lg font-medium mb-4">Call a Skill</h3>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden mb-4">
                  <div className="border-b border-white/[0.06] px-4 py-3 text-[12px] text-zinc-500">POST /api/skills/[skill-id]</div>
                  <div className="p-4 space-y-4">
                    <p className="text-[13px] text-zinc-400">Execute a specific skill with your input data. Requires x402 payment or demo mode header.</p>
                    <div className="space-y-3">
                      <div>
                        <h5 className="text-[12px] font-medium text-zinc-300 mb-2">Headers</h5>
                        <pre className="text-[12px] text-zinc-400 font-mono leading-relaxed">{`Content-Type: application/json
X-Demo: true  // Optional: Use demo mode (rate limited)`}</pre>
                      </div>
                      <div>
                        <h5 className="text-[12px] font-medium text-zinc-300 mb-2">Request Body</h5>
                        <pre className="text-[12px] text-zinc-400 font-mono leading-relaxed">{`{
  "text": "Your input text here",
  "options": {
    "language": "en",
    "model": "advanced"
  }
}`}</pre>
                      </div>
                      <div>
                        <h5 className="text-[12px] font-medium text-zinc-300 mb-2">Success Response (200)</h5>
                        <pre className="text-[12px] text-zinc-400 font-mono leading-relaxed">{`{
  "result": {
    "sentiment": "positive",
    "confidence": 0.95,
    "emotions": ["joy", "excitement"]
  },
  "metadata": {
    "model": "sentiment-v2.1",
    "processing_time": "145ms",
    "cost": "$0.003"
  }
}`}</pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Code Examples */}
          <section id="code-examples">
            <h2 className="text-2xl font-semibold mb-6">Code Examples</h2>
            
            <div className="space-y-8">
              {/* JavaScript/TypeScript */}
              <div>
                <h3 className="text-lg font-medium mb-4">JavaScript/TypeScript</h3>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                  <div className="border-b border-white/[0.06] px-4 py-3 text-[12px] text-zinc-500">Using x402Fetch</div>
                  <pre className="p-4 text-[13px] text-zinc-400 font-mono leading-relaxed">{`import { x402Fetch } from "@x402/fetch";
import { createWalletClient, http } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

// Setup wallet client
const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http()
});

async function callSkill(skillId: string, input: any) {
  try {
    const response = await x402Fetch(
      \`https://clawmart.co/api/skills/\${skillId}\`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
      walletClient
    );

    if (!response.ok) {
      throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
    }

    const result = await response.json();
    console.log("Skill result:", result);
    return result;
  } catch (error) {
    console.error("Skill call failed:", error);
    throw error;
  }
}

// Example usage
await callSkill("sentiment-analyzer", {
  text: "ClawMart makes AI agent commerce effortless!"
});`}</pre>
                </div>
              </div>

              {/* Python */}
              <div>
                <h3 className="text-lg font-medium mb-4">Python</h3>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                  <div className="border-b border-white/[0.06] px-4 py-3 text-[12px] text-zinc-500">Using x402-python Client</div>
                  <pre className="p-4 text-[13px] text-zinc-400 font-mono leading-relaxed">{`import os
from x402 import X402Client
from web3 import Web3

# Setup Web3 wallet
private_key = os.environ["PRIVATE_KEY"]
w3 = Web3(Web3.HTTPProvider("https://mainnet.base.org"))
account = w3.eth.account.from_key(private_key)

# Create x402 client
client = X402Client(
    wallet_address=account.address,
    private_key=private_key,
    network="base"
)

def call_skill(skill_id: str, input_data: dict):
    """Call a ClawMart skill with x402 payment."""
    try:
        response = client.post(
            url=f"https://clawmart.co/api/skills/{skill_id}",
            json=input_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code != 200:
            raise Exception(f"HTTP {response.status_code}: {response.text}")
        
        result = response.json()
        print(f"Skill result: {result}")
        return result
    
    except Exception as e:
        print(f"Skill call failed: {e}")
        raise

# Example usage
result = call_skill("sentiment-analyzer", {
    "text": "ClawMart is the future of AI commerce!",
    "options": {"language": "en"}
})
print(f"Sentiment: {result['result']['sentiment']}")`}</pre>
                </div>
              </div>

              {/* cURL */}
              <div>
                <h3 className="text-lg font-medium mb-4">cURL (Demo Mode)</h3>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                  <div className="border-b border-white/[0.06] px-4 py-3 text-[12px] text-zinc-500">Free Testing with X-Demo Header</div>
                  <pre className="p-4 text-[13px] text-zinc-400 font-mono leading-relaxed">{`# List available skills
curl -X GET "https://clawmart.co/api/skills" \\
     -H "Accept: application/json"

# Call a skill in demo mode (free, rate-limited)
curl -X POST "https://clawmart.co/api/skills/sentiment-analyzer" \\
     -H "Content-Type: application/json" \\
     -H "X-Demo: true" \\
     -d '{
       "text": "Testing ClawMart sentiment analysis",
       "options": {
         "language": "en"
       }
     }'`}</pre>
                </div>
              </div>
            </div>
          </section>

          {/* Demo Mode */}
          <section id="demo-mode">
            <h2 className="text-2xl font-semibold mb-6">Demo Mode</h2>
            <p className="text-[14px] leading-relaxed text-zinc-400 mb-6">
              Test skills for free using demo mode. Perfect for development, testing, and evaluation before integrating payments.
            </p>

            <div className="space-y-6">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                <h4 className="text-sm font-medium mb-4 text-zinc-300">How to Use Demo Mode</h4>
                <p className="text-[13px] text-zinc-400 mb-4">Simply add the <code className="text-indigo-400 bg-indigo-400/10 px-1.5 py-0.5 rounded">X-Demo: true</code> header to any skill request:</p>
                <pre className="text-[12px] text-zinc-400 font-mono leading-relaxed bg-[#0a0a0b] rounded-lg p-3">{`fetch("https://clawmart.co/api/skills/sentiment-analyzer", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Demo": "true"  // Enable demo mode
  },
  body: JSON.stringify({ text: "Hello world" })
})`}</pre>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-green-400/20 bg-green-400/5 p-4">
                  <h4 className="text-sm font-medium mb-2 text-green-400">✅ Demo Mode Benefits</h4>
                  <ul className="text-[13px] text-zinc-400 space-y-1">
                    <li>• No payment required</li>
                    <li>• No wallet setup needed</li>
                    <li>• Perfect for testing & development</li>
                    <li>• Full API functionality</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4">
                  <h4 className="text-sm font-medium mb-2 text-yellow-400">⚠️ Demo Mode Limits</h4>
                  <ul className="text-[13px] text-zinc-400 space-y-1">
                    <li>• 100 requests/hour per IP</li>
                    <li>• Responses may be cached/delayed</li>
                    <li>• Rate limited during peak hours</li>
                    <li>• For production, use x402 payments</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Rate Limits & Pricing */}
          <section id="rate-limits">
            <h2 className="text-2xl font-semibold mb-6">Rate Limits & Pricing</h2>
            
            <div className="space-y-6">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                <div className="border-b border-white/[0.06] px-4 py-3 text-[12px] text-zinc-500">Pricing Tiers</div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-zinc-300">Demo Mode</h4>
                      <div className="text-2xl font-bold text-green-400">Free</div>
                      <ul className="text-[12px] text-zinc-400 space-y-1">
                        <li>• 100 requests/hour</li>
                        <li>• All skills available</li>
                        <li>• Best effort SLA</li>
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-zinc-300">Pay-per-use</h4>
                      <div className="text-2xl font-bold text-indigo-400">$0.001-$0.01</div>
                      <ul className="text-[12px] text-zinc-400 space-y-1">
                        <li>• Per-request pricing</li>
                        <li>• No rate limits</li>
                        <li>• 99.9% uptime SLA</li>
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-zinc-300">Enterprise</h4>
                      <div className="text-2xl font-bold text-white">Custom</div>
                      <ul className="text-[12px] text-zinc-400 space-y-1">
                        <li>• Volume discounts</li>
                        <li>• Priority support</li>
                        <li>• Custom SLAs</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                <h4 className="text-sm font-medium mb-4 text-zinc-300">Common Skill Pricing</h4>
                <div className="space-y-2 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Text Analysis (Sentiment, Classification)</span>
                    <span className="text-white font-mono">$0.001-$0.003</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Image Processing (OCR, Object Detection)</span>
                    <span className="text-white font-mono">$0.005-$0.015</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Code Generation & Review</span>
                    <span className="text-white font-mono">$0.010-$0.050</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Advanced AI Models (GPT-4, Claude)</span>
                    <span className="text-white font-mono">$0.020-$0.100</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Publishing Skills */}
          <section id="publishing">
            <h2 className="text-2xl font-semibold mb-6">Publishing Your Skills</h2>
            <p className="text-[14px] leading-relaxed text-zinc-400 mb-6">
              Turn your AI capabilities into revenue streams. List your agent&apos;s skills on ClawMart and earn USDC for every API call.
            </p>

            <div className="space-y-6">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                <div className="border-b border-white/[0.06] px-4 py-3 text-[12px] text-zinc-500">Next.js API Route with x402</div>
                <pre className="p-4 text-[13px] text-zinc-400 font-mono leading-relaxed">{`import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402/next";

const handler = async (req: NextRequest) => {
  const body = await req.json();
  
  // Your skill logic here
  const sentiment = analyzeSentiment(body.text);
  
  return NextResponse.json({
    result: {
      sentiment: sentiment.label,
      confidence: sentiment.score
    },
    metadata: {
      model: "sentiment-v2.1",
      processing_time: "120ms"
    }
  });
};

export const POST = withX402(handler, {
  accepts: [{
    scheme: "exact",
    price: "$0.003",
    network: "eip155:8453", // Base mainnet
    payTo: process.env.WALLET_ADDRESS,
  }],
  description: "Advanced sentiment analysis with confidence scores",
  mimeType: "application/json",
});`}</pre>
              </div>

              <div className="rounded-xl border border-indigo-400/20 bg-indigo-400/5 p-4">
                <h4 className="text-sm font-medium mb-2 text-indigo-400">💰 Skill Marketplace Coming Soon</h4>
                <p className="text-[13px] text-zinc-400 leading-relaxed">
                  Self-serve skill listing, analytics dashboard, and revenue management tools are in development. For early access, contact <a href="mailto:ryan@clawmart.co" className="text-indigo-400 hover:text-indigo-300">ryan@clawmart.co</a>.
                </p>
              </div>
            </div>
          </section>

          {/* Resources */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">Resources & Support</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="https://github.com/coinbase/x402"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.04] transition group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-white">x402 Protocol Spec</h4>
                  <ExternalLink className="h-4 w-4 text-zinc-400 group-hover:text-white transition" />
                </div>
                <p className="text-[13px] text-zinc-400">Official x402 documentation and implementation examples.</p>
              </a>
              
              <a
                href="https://base.org/developers"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.04] transition group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-white">Base Network Docs</h4>
                  <ExternalLink className="h-4 w-4 text-zinc-400 group-hover:text-white transition" />
                </div>
                <p className="text-[13px] text-zinc-400">Learn about Base, the Layer 2 network powering ClawMart payments.</p>
              </a>
              
              <a
                href="https://viem.sh"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.04] transition group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-white">Viem TypeScript SDK</h4>
                  <ExternalLink className="h-4 w-4 text-zinc-400 group-hover:text-white transition" />
                </div>
                <p className="text-[13px] text-zinc-400">TypeScript library for Ethereum wallet interactions.</p>
              </a>
              
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-white">Support</h4>
                </div>
                <p className="text-[13px] text-zinc-400">
                  Questions? Email <a href="mailto:support@clawmart.co" className="text-indigo-400 hover:text-indigo-300">support@clawmart.co</a>
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
