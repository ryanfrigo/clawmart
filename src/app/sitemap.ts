import { MetadataRoute } from "next";
import { getConvexClient } from "@/lib/convex-server";
import { api } from "../../convex/_generated/api";

const BASE_URL = "https://clawmart.co";

// Company pages are created by users at any time, so a build-time snapshot goes
// stale immediately. Revalidate hourly rather than per-request: crawlers hit
// this far more often than we publish, and each hit is a Convex query.
export const revalidate = 3600;

/**
 * Static marketing routes plus every live company page.
 *
 * The generated /c/[slug] pages are the product's whole public surface — one
 * per company a user builds — and until now none of them were listed here, so
 * the only indexable pages were the five hardcoded below.
 *
 * /studio and /purchase stay out: robots.txt disallows both.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/agency`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  // A sitemap that throws is a 500, which tells a crawler the whole file is
  // broken. Degrading to the static routes keeps the marketing pages indexed
  // through a Convex outage or an unconfigured build.
  let companies: { slug: string; updatedAt: number }[] = [];
  try {
    companies = await getConvexClient().query(api.companies.listPublic, {});
  } catch {
    return staticRoutes;
  }

  return [
    ...staticRoutes,
    ...companies.map((c) => ({
      url: `${BASE_URL}/c/${encodeURIComponent(c.slug)}`,
      lastModified: new Date(c.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
