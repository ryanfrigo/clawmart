import { MetadataRoute } from "next";

/**
 * Public pages are open to everyone, including AI answer engines — we want
 * packs to be discoverable. Private tokened download pages are excluded.
 */
const DISALLOW = ["/purchase/", "/api/"];

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
