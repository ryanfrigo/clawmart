import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import stripe from "@/lib/stripe";
import { getAgentTemplateBySlug } from "@/lib/agent-templates";

/**
 * Pre-authorize a 30-day free trial on an agent subscription.
 *
 * v0 flow: capture a card on file via Stripe Checkout (subscription mode + trial).
 * No charge happens today — first invoice fires after the trial ends, which
 * gives us ~30 days to actually provision the agent (v1 work) before the buyer
 * is billed. Stripe subscription metadata is the source of truth; no Convex
 * write lives on this path yet (per tick 5 scope).
 *
 * Mirrors /api/payments/checkout/route.ts (same auth + stripe client, inline
 * price_data so no pre-created Stripe prices are required).
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const agentSlug = typeof body?.agentSlug === "string" ? body.agentSlug : null;

    if (!agentSlug) {
      return NextResponse.json(
        { error: "agentSlug is required" },
        { status: 400 },
      );
    }

    const agent = getAgentTemplateBySlug(agentSlug);
    if (!agent) {
      return NextResponse.json(
        { error: `Unknown agent: ${agentSlug}` },
        { status: 400 },
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://clawmart.co";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${agent.role} - Clawmart Agent`,
              description: agent.description,
            },
            unit_amount: Math.round(agent.pricePerMonth * 100),
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 30,
        metadata: {
          clerkId: userId,
          agentSlug,
        },
      },
      success_url: `${appUrl}/agents/${agentSlug}/hire/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/agents/${agentSlug}/hire`,
      metadata: {
        clerkId: userId,
        agentSlug,
        kind: "agent_hire_v0",
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL" },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const stripeType =
      error && typeof error === "object" && "type" in error
        ? String((error as { type?: string }).type)
        : undefined;
    const stripeCode =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code)
        : undefined;
    console.error("/api/agents/hire error:", {
      type: stripeType,
      code: stripeCode,
      message: detail,
    });
    return NextResponse.json(
      {
        error: "Failed to create hire session",
        detail,
        stripeType,
        stripeCode,
      },
      { status: 500 },
    );
  }
}
