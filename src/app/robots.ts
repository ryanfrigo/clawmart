import { MetadataRoute } from "next";

/**
 * Public pages are open to everyone, including AI answer engines. Private
 * surfaces are excluded: tokened download pages, the API, and in-progress
 * Studio builds.
 */
const DISALLOW = ["/purchase/", "/api/", "/studio/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      { userAgent: "GPTBot", allow: "/", disallow: DISALLOW },
      { userAgent: "PerplexityBot", allow: "/", disallow: DISALLOW },
      { userAgent: "ClaudeBot", allow: "/", disallow: DISALLOW },
      { userAgent: "Google-Extended", allow: "/", disallow: DISALLOW },
    ],
    sitemap: "https://clawmart.co/sitemap.xml",
  };
}
