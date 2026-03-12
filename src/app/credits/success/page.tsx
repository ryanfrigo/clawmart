"use client"

import { Suspense } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle, ArrowRight, Zap } from "lucide-react"

function SuccessContent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090b] px-6 pt-14 text-white">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
          <CheckCircle className="h-8 w-8 text-emerald-400" />
        </div>

        <h1 className="mb-4 text-3xl font-bold tracking-tight">
          Credits Added!
        </h1>

        <p className="mb-8 text-[15px] leading-relaxed text-zinc-400">
          Your credits have been added to your account. You can now start calling
          any skill in the marketplace.
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild className="bg-white text-[#09090b] hover:bg-zinc-200">
            <Link href="/skills">
              <Zap className="mr-2 h-4 w-4" />
              Browse Skills
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-white/[0.08] bg-transparent text-zinc-300 hover:bg-white/[0.05]"
          >
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function CreditSuccessPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#09090b]"><div className="text-zinc-500">Loading...</div></div>}>
      <SuccessContent />
    </Suspense>
  )
}
