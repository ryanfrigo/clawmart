import { NextRequest, NextResponse } from "next/server";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

/**
 * GET /api/skills — Public REST API for agents to browse the skill registry.
 *
 * Query params:
 *   ?category=NLP     — filter by category
 *
 * Returns JSON array of active skills with metadata.
 */
export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category") || undefined;

  try {
    const body: Record<string, unknown> = {
      path: "skills:list",
      args: { category },
      format: "json",
    };

    const res = await fetch(`${CONVEX_URL}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "Failed to fetch skills", detail: text },
        { status: 502 },
      );
    }

    const data = await res.json();
    const skills = (data.value || data) as Record<string, unknown>[];

    // Shape the response for external agents
    const listings = skills.map((s) => ({
      slug: s.slug,
      name: s.name,
      description: s.description,
      category: s.category,
      endpoint: `https://clawmart.co${s.endpoint}`,
      method: s.method,
      pricePerCall: s.pricePerCall,
      currency: "USDC",
      chain: "Base",
      tags: s.tags,
      responseTime: s.responseTime,
      rating: s.averageRating,
      totalCalls: s.totalCalls,
      detailUrl: `https://clawmart.co/skills/${s.slug || s._id}`,
    }));

    return NextResponse.json({
      protocol: "x402",
      marketplace: "ClawMart",
      count: listings.length,
      skills: listings,
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal error", detail: String(err) },
      { status: 500 },
    );
  }
}
