import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import stripe, { getCreditPackage } from "@/lib/stripe"
import { getConvexClient } from "@/lib/convex"
import { api } from "../../../../../convex/_generated/api"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { packageId } = await request.json()
    
    const creditPackage = getCreditPackage(packageId)
    if (!creditPackage) {
      return NextResponse.json({ error: "Invalid package" }, { status: 400 })
    }

    const convex = getConvexClient()
    
    // Get or create user in Convex
    let user = await convex.query(api.users.getByClerkId, { clerkId: userId })
    if (!user) {
      // Create user record - we'll need the user ID for the checkout session
      return NextResponse.json({ 
        error: "User not found. Please sign up first." 
      }, { status: 400 })
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: creditPackage.name,
              description: creditPackage.description,
            },
            unit_amount: creditPackage.price * 100, // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/credits`,
      client_reference_id: user._id, // Pass Convex user ID to webhook
      metadata: {
        packageId: creditPackage.id,
        credits: creditPackage.credits.toString(),
        convexUserId: user._id,
      },
    })

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error("Checkout error:", error)
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    )
  }
}