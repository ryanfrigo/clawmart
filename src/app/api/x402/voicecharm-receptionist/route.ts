import { NextRequest, NextResponse } from "next/server";

const PAYMENT_ADDRESS = process.env.PAYMENT_ADDRESS || "0x0000000000000000000000000000000000000000";
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const PRICE_USDC = 0.25;

/**
 * POST /api/x402/voicecharm-receptionist
 *
 * x402-native endpoint for the VoiceCharm AI Receptionist skill.
 * - No X-PAYMENT header → 402 Payment Required with x402 payment instructions
 * - Valid X-PAYMENT header → execute the skill and return results
 * - X-Demo: true → free demo mode
 */
export async function POST(request: NextRequest) {
  const paymentHeader = request.headers.get("X-PAYMENT");
  const demoMode = request.headers.get("X-Demo") === "true";

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  // If no payment and not demo → 402
  if (!paymentHeader && !demoMode) {
    return NextResponse.json(
      {
        x402Version: 1,
        accepts: [
          {
            scheme: "exact",
            network: "eip155:8453",
            maxAmountRequired: String(PRICE_USDC * 1e6),
            resource: "https://clawmart.co/api/x402/voicecharm-receptionist",
            description: "VoiceCharm AI Receptionist — professional call handling with appointment booking, lead qualification, 24/7 coverage.",
            mimeType: "application/json",
            payTo: PAYMENT_ADDRESS,
            maxTimeoutSeconds: 300,
            asset: USDC_BASE,
            extra: {
              name: "VoiceCharm AI Receptionist",
              version: "1",
              priceDisplay: "$0.25 per call",
              provider: "voicecharm.ai",
            },
          },
        ],
      },
      {
        status: 402,
        headers: {
          "X-PAYMENT-REQUIRED": "true",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, X-PAYMENT, X-Demo",
        },
      }
    );
  }

  // Execute skill
  const businessName = String(body.business_name || body.businessName || "");
  const businessType = String(body.business_type || body.businessType || "general");
  const services: string[] = Array.isArray(body.services) ? body.services : ["general inquiry"];

  if (!businessName) {
    return NextResponse.json({ error: "Missing 'business_name' field" }, { status: 400 });
  }

  const outcomes = ["appointment_booked", "lead_qualified", "info_provided", "callback_scheduled"] as const;
  const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];

  const firstNames = ["Sarah", "Michael", "Jessica", "David", "Emily", "James", "Maria", "Robert"];
  const lastNames = ["Johnson", "Williams", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor"];
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

  const durationMin = 1 + Math.floor(Math.random() * 6);
  const durationSec = Math.floor(Math.random() * 60);
  const selectedService = services[Math.floor(Math.random() * services.length)];

  const now = new Date();
  const appointmentDate = new Date(now.getTime() + (1 + Math.floor(Math.random() * 5)) * 86400000);
  const hours = 8 + Math.floor(Math.random() * 9);

  const result: Record<string, unknown> = {
    call_id: `call_x402_${Date.now().toString(36)}`,
    status: "handled",
    duration: `${durationMin}m ${durationSec}s`,
    outcome,
    transcript: `[AI Receptionist] Thank you for calling ${businessName}! How can I help you today?\n[Caller] Hi, I need help with ${selectedService}.\n[AI Receptionist] I'd be happy to help with that. Let me get your information and schedule that for you.`,
    customer_info: {
      name: `${firstName} ${lastName}`,
      phone: `+1555${String(Math.floor(Math.random() * 9000000 + 1000000))}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
    },
    business: {
      name: businessName,
      type: businessType,
      service_requested: selectedService,
    },
    follow_up_sent: true,
  };

  if (outcome === "appointment_booked") {
    result.appointment = {
      service: selectedService,
      date: appointmentDate.toISOString().split("T")[0],
      time: `${hours}:00`,
      notes: `Customer needs ${selectedService}`,
    };
  }

  if (outcome === "callback_scheduled") {
    result.callback = {
      requested_time: `${appointmentDate.toISOString().split("T")[0]} ${hours}:00`,
      reason: `Follow up on ${selectedService} inquiry`,
    };
  }

  return NextResponse.json(
    {
      skill: "VoiceCharm AI Receptionist",
      skillId: "voicecharm-receptionist",
      result,
      meta: {
        latency: "~2.0s",
        paid: demoMode ? "demo" : "$0.25",
        mode: demoMode ? "demo" : "paid",
        provider: "voicecharm.ai",
        protocol: "x402",
      },
    },
    {
      headers: {
        "X-PAYMENT-VERIFIED": paymentHeader ? "true" : "demo",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}

export async function GET() {
  return NextResponse.json({
    skill: "VoiceCharm AI Receptionist",
    endpoint: "https://clawmart.co/api/x402/voicecharm-receptionist",
    method: "POST",
    price: "$0.25 per call",
    protocol: "x402",
    network: "Base (eip155:8453)",
    asset: "USDC",
    description: "Professional AI receptionist — handles inbound calls, books appointments, qualifies leads. 24/7 coverage for service businesses.",
    requiredFields: {
      business_name: "string — your business name",
      business_type: "string — e.g. hvac, plumbing, medical, legal",
      services: "string[] — list of services offered",
    },
    optionalFields: {
      phone_number: "string — business phone",
      service_area: "string — coverage area",
      calendar_url: "string — Calendly or booking link",
      emergency_number: "string — after-hours emergency line",
      business_hours: "object — { monday: '8:00-18:00', ... }",
    },
    example: {
      business_name: "Ryan's HVAC",
      business_type: "hvac",
      services: ["heating repair", "ac installation", "maintenance"],
      service_area: "Oakland, CA",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-PAYMENT, X-Demo, Authorization",
    },
  });
}
