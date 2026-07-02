import { MetadataRoute } from "next";

/**
 * We sell AI visibility, so AI crawlers are explicitly welcome on the
 * public pages. Private tokened reports are excluded for everyone.
 */
const DISALLOW = ["/report/", "/api/"];

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
