import { NextRequest, NextResponse } from "next/server";
import { getSkillById } from "@/lib/agents";

/**
 * Demo skill endpoint.
 * In production with x402 configured (FACILITATOR_URL + EVM_ADDRESS),
 * this would be wrapped with withX402() for real payment gating.
 *
 * For the MVP, we return a 402 response that demonstrates the protocol
 * flow to callers, showing exactly what x402 would return.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ skillId: string }> }
) {
  const { skillId } = await params;
  const skill = getSkillById(skillId);

  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  // Check for x402 payment header (would be set by @x402/fetch client)
  const paymentHeader = request.headers.get("X-PAYMENT");

  if (!paymentHeader) {
    // Return 402 Payment Required — this is the x402 protocol flow
    return NextResponse.json(
      {
        x402Version: 1,
        accepts: [
          {
            scheme: "exact",
            network: "eip155:8453", // Base mainnet
            price: skill.pricePerCall.replace("$", ""),
            asset: "USDC",
            payTo: "0x0000000000000000000000000000000000000000", // Placeholder — set real address in production
          },
        ],
        description: skill.description,
        mimeType: "application/json",
      },
      {
        status: 402,
        headers: {
          "X-PAYMENT-REQUIRED": "true",
        },
      }
    );
  }

  // If payment header exists, simulate successful response
  // In production, x402 middleware verifies the payment before reaching here
  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  // Return example output for demo purposes
  return NextResponse.json({
    skill: skill.name,
    input: body,
    result: JSON.parse(skill.exampleOutput || "{}"),
    meta: {
      latency: skill.responseTime,
      model: "demo",
      paid: skill.pricePerCall,
    },
  });
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
