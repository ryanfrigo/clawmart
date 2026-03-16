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

// Types matching Convex schema
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

interface CatalogSkill {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  method: string;
  price: {
    amount: string;
    currency: string;
    asset: string;
    raw: number;
  };
  category: string;
  tags: string[];
  rating: number;
  totalCalls: number;
  responseTime: string;
  author: string;
  input: {
    required: string[];
    optional: string[];
  };
  example: {
    input: Record<string, unknown>;
    output: Record<string, unknown>;
  };
  paymentAddress: string;
  usdcContract: string;
  network: string;
  detailUrl: string;
  catalogUrl: string;
}

async function fetchActiveSkills(): Promise<ConvexSkill[]> {
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

  if (!res.ok) {
    throw new Error(`Convex query failed: ${res.status}`);
  }

  const data = await res.json();
  const skills = (data.value || data || []) as ConvexSkill[];
  // Only return active skills
  return skills.filter((s) => s.status === "active");
}

function parseJsonSafe(raw?: string): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function shapeCatalogSkill(s: ConvexSkill): CatalogSkill {
  const id = s.slug || s._id;
  const exampleInput = parseJsonSafe(s.exampleInput);
  const exampleOutput = parseJsonSafe(s.exampleOutput);

  return {
    id,
    name: s.name,
    description: s.description,
    endpoint: s.endpoint.startsWith("http")
      ? s.endpoint
      : `${BASE_URL}${s.endpoint}`,
    method: s.method,
    price: {
      amount: s.pricePerCall.toFixed(3),
      currency: "USD",
      asset: "USDC",
      raw: s.pricePerCall,
    },
    category: s.category,
    tags: s.tags,
    rating: Number(s.averageRating.toFixed(1)),
    totalCalls: s.totalCalls,
    responseTime: s.responseTime || "~2.0s",
    author: s.authorName,
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
    paymentAddress: PAYMENT_ADDRESS,
    usdcContract: USDC_BASE,
    network: "eip155:8453",
    detailUrl: `${BASE_URL}/skills/${id}`,
    catalogUrl: `${BASE_URL}/api/catalog/${id}`,
  };
}

function applyFilters(
  skills: CatalogSkill[],
  {
    category,
    search,
    sort,
  }: { category?: string; search?: string; sort?: string }
): CatalogSkill[] {
  let result = [...skills];

  if (category) {
    const cat = category.toLowerCase();
    result = result.filter((s) => s.category.toLowerCase() === cat);
  }

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q)) ||
        s.category.toLowerCase().includes(q)
    );
  }

  if (sort === "popular") {
    result.sort((a, b) => b.totalCalls - a.totalCalls);
  } else if (sort === "price") {
    result.sort((a, b) => a.price.raw - b.price.raw);
  } else if (sort === "rating") {
    result.sort((a, b) => b.rating - a.rating);
  }

  return result;
}

/**
 * GET /api/catalog
 *
 * Agent discovery endpoint — returns the full x402-compatible skill catalog.
 *
 * Query params:
 *   ?category=Research   — filter by category (case-insensitive)
 *   ?search=summarize    — full-text search across name/description/tags
 *   ?sort=popular|price|rating — sort order (default: none)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const category = searchParams.get("category") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const sort = searchParams.get("sort") ?? undefined;

  try {
    const raw = await fetchActiveSkills();
    const shaped = raw.map(shapeCatalogSkill);
    const skills = applyFilters(shaped, { category, search, sort });

    // Derive available categories for discovery
    const categories = [...new Set(shaped.map((s) => s.category))].sort();

    return NextResponse.json(
      {
        catalog: {
          version: "1.0",
          provider: "clawmart.co",
          protocol: "x402",
          network: "eip155:8453",
          asset: "USDC",
          usdcContract: USDC_BASE,
          paymentAddress: PAYMENT_ADDRESS,
          skills,
          totalSkills: skills.length,
          categories,
          filters: {
            category: category ?? null,
            search: search ?? null,
            sort: sort ?? null,
          },
          links: {
            self: `${BASE_URL}/api/catalog`,
            marketplace: BASE_URL,
            docs: `${BASE_URL}/docs/api`,
          },
          lastUpdated: new Date().toISOString(),
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
  } catch (err) {
    console.error("[catalog] fetch error:", err);
    return NextResponse.json(
      { error: "Failed to load catalog", detail: String(err) },
      {
        status: 502,
        headers: CORS_HEADERS,
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
