import { MetadataRoute } from "next";

const BASE_URL = "https://clawmart.co";

const CATEGORY_SLUGS = [
  "research",
  "development",
  "nlp",
  "vision",
  "data",
  "content",
  "finance",
  "marketing",
  "security",
  "other",
];

async function getActiveSkillIds(): Promise<string[]> {
  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) return [];

    const res = await fetch(`${convexUrl}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "skills:list",
        args: {},
        format: "json",
      }),
      next: { revalidate: 3600 }, // revalidate every hour
    });

    if (!res.ok) return [];

    const data = await res.json();
    const skills = data?.value ?? [];
    return skills.map((s: { _id: string }) => s._id);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const skillIds = await getActiveSkillIds();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/skills`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/categories`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/docs`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = CATEGORY_SLUGS.map((slug) => ({
    url: `${BASE_URL}/categories/${slug}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  const skillRoutes: MetadataRoute.Sitemap = skillIds.map((id) => ({
    url: `${BASE_URL}/skills/${id}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...categoryRoutes, ...skillRoutes];
}
