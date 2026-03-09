import { NextRequest, NextResponse } from "next/server";
import { getSkillById } from "@/lib/agents";
import { calculateRequiredCredits } from "@/lib/stripe";

/**
 * Skill endpoint with payment gating.
 * For now, returns 402 with credit requirements until user purchases credits.
 * TODO: Integrate full Convex credit system once dependencies are resolved.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ skillId: string }> }
) {
  try {
    const { skillId } = await params;
    const skill = getSkillById(skillId);

    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    // Check for payment header or credits
    const paymentHeader = request.headers.get("X-PAYMENT");
    const authHeader = request.headers.get("Authorization");
    
    // Calculate required credits
    const creditsRequired = calculateRequiredCredits(skillId);

    // For now, require payment header to proceed
    if (!paymentHeader && !authHeader) {
      return NextResponse.json(
        {
          error: "Payment required",
          required: creditsRequired,
          pricePerCall: skill.pricePerCall,
          purchaseUrl: "/credits",
          message: `This skill requires ${creditsRequired} credits (${skill.pricePerCall}). Purchase credits at /credits to use this skill.`
        },
        { 
          status: 402,
          headers: {
            "X-PAYMENT-REQUIRED": "true",
          }
        }
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    // Simulate skill execution (since payment was provided)
    const response = {
      skill: skill.name,
      input: body,
      result: JSON.parse(skill.exampleOutput || "{}"),
      meta: {
        latency: skill.responseTime,
        model: "demo",
        creditsUsed: creditsRequired,
        paid: skill.pricePerCall,
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("Skill execution error:", error)
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ skillId: string }> }
) {
  const { skillId } = await params;
  const skill = getSkillById(skillId);

  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  // Return skill metadata
  return NextResponse.json({
    id: skill.id,
    name: skill.name,
    description: skill.description,
    pricePerCall: skill.pricePerCall,
    method: skill.method,
    endpoint: `https://clawmart.co${skill.endpoint}`,
    rating: skill.rating,
    reviews: skill.reviews,
    tags: skill.tags,
    exampleInput: skill.exampleInput ? JSON.parse(skill.exampleInput) : null,
    exampleOutput: skill.exampleOutput ? JSON.parse(skill.exampleOutput) : null,
  });
}
