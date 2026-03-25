import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard/",
        "/admin/",
        "/sign-in/",
        "/sign-up/",
        "/credits/",
        "/onboard/",
      ],
    },
    sitemap: "https://clawmart.co/sitemap.xml",
  };
}
