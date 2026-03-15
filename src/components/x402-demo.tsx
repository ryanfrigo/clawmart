"use client";

import { useState } from "react";
import { Zap, Loader2, CreditCard, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface X402Step {
  id: string;
  label: string;
  status: "pending" | "active" | "complete";
  description: string;
}

export function X402Demo() {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const steps: X402Step[] = [
    {
      id: "call",
      label: "1. Call API",
      status: "pending",
      description: "Agent calls skill endpoint without payment",
    },
    {
      id: "402",
      label: "2. 402 Response",
      status: "pending", 
      description: "Server returns payment instructions",
    },
    {
      id: "pay",
      label: "3. Pay USDC",
      status: "pending",
      description: "Wallet automatically pays on Base",
    },
    {
      id: "result",
      label: "4. Get Result", 
      status: "pending",
      description: "Receive API response after payment",
    },
  ];

  const stepsWithStatus = steps.map((step, index) => ({
    ...step,
    status: index < currentStep 
      ? "complete" as const
      : index === currentStep 
        ? "active" as const 
        : "pending" as const,
  }));

  const runDemo = async () => {
    setLoading(true);
    setResult(null);
    setCurrentStep(0);

    // Step 1: Call without payment
    await new Promise(resolve => setTimeout(resolve, 800));
    setCurrentStep(1);
    
    // Step 2: Receive 402
    await new Promise(resolve => setTimeout(resolve, 600));
    setCurrentStep(2);
    
    // Step 3: Payment processing 
    await new Promise(resolve => setTimeout(resolve, 1200));
    setCurrentStep(3);
    
    // Step 4: Get result
    await new Promise(resolve => setTimeout(resolve, 800));
    setCurrentStep(4);
    
    // Demo result
    const mockResult = {
      overall: "positive",
      score: 0.87,
      confidence: 0.94,
      emotions: { joy: 0.82, trust: 0.65 },
      payment: {
        amount: "0.001 USDC",
        tx: "0x1a2b3c4d...",
        network: "Base",
        block: 12345678,
      }
    };
    
    setResult(JSON.stringify(mockResult, null, 2));
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
        <div className="border-b border-white/[0.06] p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">x402 Payment Flow</h3>
              <p className="text-[14px] text-zinc-500 mt-1">
                See how one HTTP call handles discovery, payment, and execution
              </p>
            </div>
            <Button
              onClick={runDemo}
              disabled={loading}
              className="bg-indigo-500 hover:bg-indigo-600 text-white"
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
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="border-b border-white/[0.06] p-6">
          <div className="flex items-center justify-between">
            {stepsWithStatus.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                      step.status === "complete"
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : step.status === "active"
                        ? "border-indigo-500 bg-indigo-500 text-white"
                        : "border-zinc-700 bg-zinc-800 text-zinc-500"
                    }`}
                  >
                    {step.status === "complete" ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : step.status === "active" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <span className="text-xs font-medium">{index + 1}</span>
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <div className={`text-xs font-medium ${
                      step.status === "pending" ? "text-zinc-600" : "text-zinc-300"
                    }`}>
                      {step.label}
                    </div>
                    <div className="text-[10px] text-zinc-600 max-w-[80px] leading-tight mt-1">
                      {step.description}
                    </div>
                  </div>
                </div>
                {index < stepsWithStatus.length - 1 && (
                  <ArrowRight className={`h-4 w-4 mx-4 ${
                    index < currentStep ? "text-emerald-500" : "text-zinc-700"
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Code Example */}
        <div className="grid md:grid-cols-2">
          <div className="border-b md:border-b-0 md:border-r border-white/[0.06] p-6">
            <div className="mb-3 text-xs text-zinc-500 font-medium">AGENT CODE</div>
            <pre className="text-[12px] leading-relaxed text-zinc-400 font-mono">
{`import { x402Fetch } from "@x402/fetch";

// That's it. One line.
const result = await x402Fetch(
  "https://clawmart.co/api/skills/sentiment",
  {
    method: "POST", 
    body: JSON.stringify({
      text: "ClawMart is incredible!"
    })
  },
  walletClient // Your USDC wallet
);

// Payment happens automatically on 402
console.log(result.data);`}
            </pre>
          </div>

          <div className="p-6">
            <div className="mb-3 text-xs text-zinc-500 font-medium">
              {loading || currentStep === 4 ? "RESPONSE" : "WAITING..."}
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-[#09090b] p-4 min-h-[200px] overflow-auto">
              {loading && currentStep < 4 && (
                <div className="flex items-center gap-2 text-[13px] text-zinc-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {currentStep === 0 && "Calling API endpoint..."}
                  {currentStep === 1 && "Received 402 Payment Required..."}
                  {currentStep === 2 && "Processing USDC payment on Base..."}
                  {currentStep === 3 && "Payment confirmed, executing skill..."}
                </div>
              )}
              {result && (
                <pre className="text-[12px] text-emerald-400/80 font-mono leading-relaxed whitespace-pre-wrap">
                  {result}
                </pre>
              )}
              {!result && !loading && (
                <div className="text-[12px] text-zinc-700 font-mono">
                  {`// Click "Run Demo" to see the x402 flow`}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment Info */}
        {currentStep >= 2 && (
          <div className="border-t border-white/[0.06] p-4 bg-indigo-500/[0.03]">
            <div className="flex items-center gap-2 text-[13px] text-indigo-300">
              <CreditCard className="h-4 w-4" />
              <span>Payment: 0.001 USDC on Base • Gas: ~$0.001 • Total: ~$0.002</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}