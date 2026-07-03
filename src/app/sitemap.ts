import { MetadataRoute } from "next";
import { PACKS, BUNDLE } from "@/lib/packs";
import { LANDING_PAGES } from "@/lib/landing";

const BASE_URL = "https://clawmart.co";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const packRoutes: MetadataRoute.Sitemap = [
    ...PACKS.map((p) => ({
      url: `${BASE_URL}/packs/${p.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    })),
    {
      url: `${BASE_URL}/packs/${BUNDLE.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    },
  ];

  const landingRoutes: MetadataRoute.Sitemap = LANDING_PAGES.map((p) => ({
    url: `${BASE_URL}/openclaw/${p.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [
    { url: BASE_URL, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/packs`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/studio`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    ...packRoutes,
    ...landingRoutes,
    { url: `${BASE_URL}/free`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
