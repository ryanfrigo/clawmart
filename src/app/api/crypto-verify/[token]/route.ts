import { NextRequest, NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";
import { getConvexClient } from "@/lib/convex-server";

/** GET /api/crypto-verify/[token] — poll the chain; returns { paid }. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  try {
    const result = await getConvexClient().action(api.crypto.verify, { token });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ paid: false }, { status: 200 });
  }
}
