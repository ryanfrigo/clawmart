import { NextRequest, NextResponse } from "next/server";
import { ConvexError } from "convex/values";
import { api } from "../../../../convex/_generated/api";
import { priceForSlug, titleForSlug } from "@/lib/packs";
import { getBaseBlock } from "@/lib/crypto";
import { ipFromHeaders, ipHash } from "@/lib/request-ip";
import { getConvexClient } from "@/lib/convex-server";

/**
 * POST /api/crypto-checkout — start a USDC-on-Base purchase (no card, no KYC).
 * Body: { slug }. Returns { token } → redirect to /pay/[token].
 */
export async function POST(request: NextRequest) {
  let slug = "";
  try {
    const body = await request.json();
    slug = typeof body?.slug === "string" ? body.slug.trim() : "";
  } catch {
    /* invalid_slug below */
  }

  const amountUsd = priceForSlug(slug);
  const title = titleForSlug(slug);
  if (amountUsd === null || title === null) {
    return NextResponse.json({ error: "invalid_slug" }, { status: 400 });
  }

  const secret = process.env.SERVER_SHARED_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  let fromBlock: number;
  try {
    fromBlock = await getBaseBlock();
  } catch {
    return NextResponse.json({ error: "chain_unavailable" }, { status: 502 });
  }

  try {
    const { token } = await getConvexClient().mutation(
      api.crypto.createCryptoPending,
      {
        slug,
        amountUsd,
        title,
        fromBlock,
        ipHash: ipHash(ipFromHeaders(request.headers), secret),
        secret,
      }
    );
    return NextResponse.json({ token });
  } catch (err) {
    if (err instanceof ConvexError && err.data === "rate_limited") {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    console.error("/api/crypto-checkout failed", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
