import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import stripe from "@/lib/stripe"
import { getConvexClient } from "@/lib/convex"
import { api } from "../../../../../convex/_generated/api"

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = (await headers()).get("stripe-signature")!

    let event
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
    } catch (err) {
      console.error("Webhook signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    const convex = getConvexClient()

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any

      // Extract metadata from the session
      const { packageId, credits, convexUserId } = session.metadata
      const paymentId = session.payment_intent

      if (!packageId || !credits || !convexUserId) {
        console.error("Missing required metadata in checkout session:", session.metadata)
        return NextResponse.json({ error: "Missing metadata" }, { status: 400 })
      }

      // Add credits to user's balance
      await convex.mutation(api.credits.addCredits, {
        userId: convexUserId as any,
        credits: parseInt(credits),
        description: `Purchased ${packageId} package`,
        paymentId: paymentId as string,
        packageId: packageId as string,
      })

      console.log(`Added ${credits} credits to user ${convexUserId} for payment ${paymentId}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook error" }, { status: 500 })
  }
}

// Next.js App Router handles raw body automatically for webhooks