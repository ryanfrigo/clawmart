import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ConvexError } from "convex/values";
import { api } from "../../../../convex/_generated/api";
import { getConvexClient } from "@/lib/convex-server";

/**
 * POST /api/check — kick off a free AI Visibility Check.
 *
 * Body: { domain: string }
 * 200 { checkId }            — check started (or fresh cached result reused)
 * 400 { error: "invalid_domain" }
 * 429 { error: "rate_limited" }
 * 503 { error: "at_capacity" }  — daily LLM spend breaker tripped
 *
 * Rate limiting, domain normalization, and the 24h cache all live in
 * Convex (api.checks.run). This route only derives a salted IP hash so the
 * raw IP never reaches Convex.
 */
export async function POST(request: NextRequest) {
  let domain: string;
  try {
    const body = await request.json();
    domain = typeof body?.domain === "string" ? body.domain.trim() : "";
  } catch {
    domain = "";
  }
  if (!domain || domain.length > 253) {
    return NextResponse.json({ error: "invalid_domain" }, { status: 400 });
  }

  const secret = process.env.SERVER_SHARED_SECRET;
  if (!secret) {
    console.error("/api/check: SERVER_SHARED_SECRET is not set");
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  // First value of x-forwarded-for is the client IP on Vercel.
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
  const ipHash = createHash("sha256").update(ip + secret).digest("hex");

  try {
    const { checkId } = await getConvexClient().action(api.checks.run, {
      domain,
      ipHash,
      secret,
    });
    return NextResponse.json({ checkId });
  } catch (err) {
    if (err instanceof ConvexError) {
      const code = typeof err.data === "string" ? err.data : err.data?.code;
      switch (code) {
        case "rate_limited":
          return NextResponse.json({ error: "rate_limited" }, { status: 429 });
        case "at_capacity":
          return NextResponse.json({ error: "at_capacity" }, { status: 503 });
        case "invalid_domain":
          return NextResponse.json({ error: "invalid_domain" }, { status: 400 });
      }
    }
    console.error("/api/check: unexpected error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
