import { NextRequest, NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";
import { BUNDLE, PACKS } from "@/lib/packs";
import { PACK_FILES } from "@/lib/pack-contents";
import { buildZip, collectDownloadFiles } from "@/lib/zip";
import { getConvexClient } from "@/lib/convex-server";

/**
 * GET /api/download/[token] — gated pack download.
 *
 * Looks up the purchase by its delivery token. Until it's `paid`, returns
 * 403 JSON. Once paid, streams a zip of the purchased pack's files (the
 * All-Access bundle → every pack, each path prefixed with its slug).
 *
 * The archive is served with `X-Robots-Tag: noindex` and `no-store` so the
 * gated content never lands in a crawler or shared cache.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const purchase = await getConvexClient().query(api.purchases.getByToken, {
    token,
  });

  if (!purchase || purchase.status !== "paid") {
    return NextResponse.json(
      { error: "not_paid" },
      { status: 403, headers: { "X-Robots-Tag": "noindex" } }
    );
  }

  const files = collectDownloadFiles(
    purchase.slug,
    PACK_FILES,
    BUNDLE.slug,
    PACKS.map((p) => p.slug)
  );

  const zip = await buildZip(files);

  return new NextResponse(zip, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${purchase.slug}-clawmart.zip"`,
      "X-Robots-Tag": "noindex",
      "Cache-Control": "no-store",
    },
  });
}
