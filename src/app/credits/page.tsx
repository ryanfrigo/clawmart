"use client"

import { useState } from "react"
import { CREDIT_PACKAGES } from "@/lib/stripe"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Zap, CreditCard, Check, ArrowRight } from "lucide-react"
import { toast } from "sonner"

export default function CreditsPage() {
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const handlePurchase = async (packageId: string) => {

    setIsLoading(packageId)
    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session")
      }

      // Redirect to Stripe Checkout via URL
      const { loadStripe } = await import("@stripe/stripe-js")
      const stripeInstance = await loadStripe(
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
      )
      if (stripeInstance) {
        await (stripeInstance as any).redirectToCheckout({ sessionId: data.sessionId })
      }
    } catch (error) {
      console.error("Purchase error:", error)
      toast.error(error instanceof Error ? error.message : "Purchase failed")
    } finally {
      setIsLoading(null)
    }
  }

  const getValue = (packageId: string) => {
    const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId)
    if (!pkg) return ""
    const costPer1000 = ((pkg.price / pkg.credits) * 1000).toFixed(2)
    return `$${costPer1000}/1K calls`
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white pt-20">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-16 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/[0.06] px-3.5 py-1.5 text-[13px] text-indigo-300">
            <Zap className="h-3.5 w-3.5" />
            Pay-per-use pricing
          </div>

          <h1 className="mb-6 text-[clamp(2rem,5vw,3.5rem)] font-bold leading-tight tracking-[-0.035em]">
            Buy Agent Skill Credits
          </h1>

          <p className="mx-auto max-w-xl text-[17px] leading-relaxed text-zinc-400">
            Purchase credits to call any skill in the marketplace. No subscriptions, no
            expiration. Pay once, use whenever.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {CREDIT_PACKAGES.map((pkg, index) => (
            <Card
              key={pkg.id}
              className={`relative border-white/[0.06] bg-white/[0.02] transition-all hover:border-white/[0.12] ${
                index === 1 ? "ring-2 ring-indigo-500 md:scale-105" : ""
              }`}
            >
              {index === 1 && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-indigo-500 text-white hover:bg-indigo-600">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-4 text-center">
                <CardTitle className="text-xl font-bold text-white">
                  {pkg.name}
                </CardTitle>
                <CardDescription className="text-zinc-500">
                  {pkg.description}
                </CardDescription>

                <div className="mt-4">
                  <span className="text-4xl font-bold text-white">${pkg.price}</span>
                  <span className="ml-2 text-sm text-zinc-500">
                    for {pkg.credits.toLocaleString()} credits
                  </span>
                </div>

                <Badge
                  variant="secondary"
                  className="mx-auto mt-2 border-white/[0.08] bg-white/[0.04] text-zinc-400"
                >
                  {getValue(pkg.id)}
                </Badge>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="mb-6 space-y-3 text-[14px] text-zinc-400">
                  {[
                    "Access to all marketplace skills",
                    "No expiration date",
                    "API access included",
                    "Usage analytics dashboard",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={isLoading === pkg.id}
                  className={`w-full ${
                    index === 1
                      ? "bg-indigo-500 hover:bg-indigo-600"
                      : "bg-white text-[#09090b] hover:bg-zinc-200"
                  }`}
                >
                  {isLoading === pkg.id ? (
                    "Processing..."
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Buy Credits
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mx-auto mt-20 max-w-3xl text-center">
          <h3 className="mb-8 text-2xl font-bold tracking-tight">How credits work</h3>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Buy Credits",
                desc: "Purchase a package that fits your usage",
              },
              {
                step: "2",
                title: "Call Skills",
                desc: "Credits deducted automatically per API call",
              },
              {
                step: "3",
                title: "Track Usage",
                desc: "Monitor balance and history in your dashboard",
              },
            ].map((s) => (
              <div key={s.step}>
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-[15px] font-bold text-zinc-400">
                  {s.step}
                </div>
                <h4 className="mb-2 text-[15px] font-semibold">{s.title}</h4>
                <p className="text-[13px] text-zinc-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
