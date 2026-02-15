"use client";
import { useUser } from "@clerk/nextjs";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    features: ["1 workforce", "3 agents", "100 messages/day", "Community support"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$49",
    features: ["3 workforces", "Unlimited agents", "1,000 messages/day", "Priority support", "API access"],
    priceId: "pro",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$199",
    features: ["Unlimited workforces", "Unlimited agents", "Unlimited messages", "Dedicated support", "Custom templates", "SSO"],
    priceId: "enterprise",
  },
];

export default function BillingPage() {
  const { user } = useUser();
  const dbUser = useQuery(api.users.getByClerkId, user ? { clerkId: user.id } : "skip");
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    setLoading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, clerkId: user?.id }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      alert("Failed to start checkout");
    } finally {
      setLoading(null);
    }
  };

  const currentPlan = dbUser?.plan || "free";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="mt-1 text-zinc-400">Manage your subscription</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`border ${
              currentPlan === plan.id
                ? "border-white/20 bg-white/5"
                : "border-white/5 bg-zinc-900/50"
            }`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                {currentPlan === plan.id && (
                  <Badge className="bg-white text-[#09090b]">Current</Badge>
                )}
              </div>
              <div className="my-4">
                <span className="text-3xl font-bold">{plan.price}</span>
                {plan.price !== "$0" && <span className="text-zinc-400">/mo</span>}
              </div>
              <ul className="mb-6 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                    <Check className="h-4 w-4 text-white" />
                    {f}
                  </li>
                ))}
              </ul>
              {currentPlan === plan.id ? (
                <Button disabled className="w-full" variant="outline">
                  Current Plan
                </Button>
              ) : plan.priceId ? (
                <Button
                  className="w-full bg-white text-[#09090b] hover:bg-zinc-200"
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading === plan.id}
                >
                  {loading === plan.id ? "..." : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Upgrade
                    </>
                  )}
                </Button>
              ) : (
                <Button disabled variant="outline" className="w-full">
                  Free Forever
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
