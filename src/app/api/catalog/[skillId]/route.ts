import { NextRequest, NextResponse } from "next/server";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;
const BASE_URL = "https://clawmart.co";
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const PAYMENT_ADDRESS =
  process.env.PAYMENT_ADDRESS ||
  "0x0000000000000000000000000000000000000000";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-PAYMENT, Authorization",
};

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=120",
};

interface ConvexSkill {
  _id: string;
  slug?: string;
  name: string;
  description: string;
  longDescription?: string;
  category: string;
  endpoint: string;
  method: "GET" | "POST";
  pricePerCall: number;
  authorName: string;
  tags: string[];
  exampleInput?: string;
  exampleOutput?: string;
  responseTime?: string;
  totalCalls: number;
  totalReviews: number;
  averageRating: number;
  status: "active" | "pending" | "disabled";
  createdAt: number;
}

function parseJsonSafe(raw?: string): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function fetchSkillBySlug(slug: string): Promise<ConvexSkill | null> {
  // Try by slug first
  const res = await fetch(`${CONVEX_URL}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: "skills:getBySlug",
      args: { slug },
      format: "json",
    }),
    next: { revalidate: 60 },
  });

  if (res.ok) {
    const data = await res.json();
    const skill = data.value || data;
    if (skill && skill._id) return skill as ConvexSkill;
  }

  return null;
}

async function fetchAllSkills(): Promise<ConvexSkill[]> {
  const res = await fetch(`${CONVEX_URL}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: "skills:list",
      args: {},
      format: "json",
    }),
    next: { revalidate: 60 },
  });

  if (!res.ok) return [];
  const data = await res.json();
  return (data.value || data || []) as ConvexSkill[];
}

async function resolveSkill(skillId: string): Promise<ConvexSkill | null> {
  // 1. Try slug lookup via dedicated query
  const bySlug = await fetchSkillBySlug(skillId);
  if (bySlug) return bySlug;

  // 2. Fall back to listing all and matching by slug or _id
  const all = await fetchAllSkills();
  return (
    all.find((s) => s.slug === skillId || s._id === skillId) ?? null
  );
}

/**
 * GET /api/catalog/[skillId]
 *
 * Returns full x402 payment instructions for a single skill.
 * This is the canonical endpoint agents should call to learn how to pay.
 *
 * The response mirrors the 402 Payment Required body from the skill's own
 * endpoint, enriched with extra metadata for agent discovery.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ skillId: string }> }
) {
  const { skillId } = await params;

  if (!skillId) {
    return NextResponse.json(
      { error: "Missing skillId" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  let skill: ConvexSkill | null = null;
  try {
    skill = await resolveSkill(skillId);
  } catch (err) {
    console.error(`[catalog/${skillId}] lookup error:`, err);
    return NextResponse.json(
      { error: "Failed to query catalog", detail: String(err) },
      { status: 502, headers: CORS_HEADERS }
    );
  }

  if (!skill) {
    return NextResponse.json(
      { error: "Skill not found", skillId },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  if (skill.status !== "active") {
    return NextResponse.json(
      { error: "Skill is not active", skillId, status: skill.status },
      { status: 410, headers: CORS_HEADERS }
    );
  }

  const id = skill.slug || skill._id;
  const endpoint = skill.endpoint.startsWith("http")
    ? skill.endpoint
    : `${BASE_URL}${skill.endpoint}`;

  const priceRaw = skill.pricePerCall;
  // USDC has 6 decimals; multiply to get raw units
  const maxAmountRequired = String(Math.round(priceRaw * 1_000_000));

  const exampleInput = parseJsonSafe(skill.exampleInput);
  const exampleOutput = parseJsonSafe(skill.exampleOutput);

  // x402 payment instructions (same structure as 402 response from the skill)
  const x402PaymentInstructions = {
    x402Version: 1,
    accepts: [
      {
        scheme: "exact",
        network: "eip155:8453",
        maxAmountRequired,
        resource: endpoint,
        description: `${skill.name} — ${skill.description}`,
        mimeType: "application/json",
        payTo: PAYMENT_ADDRESS,
        maxTimeoutSeconds: 30,
        asset: USDC_BASE,
        extra: {
          name: skill.name,
          version: "1",
          priceDisplay: `$${priceRaw.toFixed(3)} per call`,
          provider: "clawmart.co",
          skillId: id,
          category: skill.category,
        },
      },
    ],
  };

  return NextResponse.json(
    {
      skill: {
        id,
        name: skill.name,
        description: skill.description,
        longDescription: skill.longDescription ?? skill.description,
        category: skill.category,
        tags: skill.tags,
        author: skill.authorName,
        endpoint,
        method: skill.method,
        price: {
          amount: priceRaw.toFixed(3),
          currency: "USD",
          asset: "USDC",
          raw: priceRaw,
          maxAmountRequired,
        },
        rating: Number(skill.averageRating.toFixed(1)),
        totalCalls: skill.totalCalls,
        totalReviews: skill.totalReviews,
        responseTime: skill.responseTime || "~2.0s",
        input: {
          required: Object.keys(exampleInput).length
            ? Object.keys(exampleInput)
            : [],
          optional: [],
        },
        example: {
          input: exampleInput,
          output: exampleOutput,
        },
        links: {
          self: `${BASE_URL}/api/catalog/${id}`,
          catalog: `${BASE_URL}/api/catalog`,
          marketplace: `${BASE_URL}/skills/${id}`,
          endpoint,
        },
        network: "eip155:8453",
        protocol: "x402",
        createdAt: new Date(skill.createdAt).toISOString(),
      },
      // Full x402 payment instructions — copy this to call the skill
      payment: x402PaymentInstructions,
      howToCall: {
        step1: `Send a POST request to: ${endpoint}`,
        step2: "Include X-PAYMENT header with your signed x402 payment",
        step3: "Include your input in the request body as JSON",
        example: {
          method: skill.method,
          url: endpoint,
          headers: {
            "Content-Type": "application/json",
            "X-PAYMENT": "<your-signed-x402-payment>",
          },
          body: exampleInput,
        },
        demo: {
          description: "To test without payment, add X-Demo: true header",
          headers: {
            "Content-Type": "application/json",
            "X-Demo": "true",
          },
        },
      },
    },
    {
      headers: {
        ...CORS_HEADERS,
        ...CACHE_HEADERS,
        "Content-Type": "application/json",
      },
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
