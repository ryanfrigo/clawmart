import type { NextConfig } from "next";

/** Routes from the pre-relaunch products — everything redirects home. */
const DEAD_ROUTES = [
  "/report/:path*",
  "/methodology",
  "/agents/:path*",
  "/skills",
  "/skills/:path*",
  "/credits",
  "/credits/:path*",
  "/categories/:path*",
  "/dashboard/:path*",
  "/docs/:path*",
  "/onboard/:path*",
  "/admin/:path*",
  "/sign-in/:path*",
  "/sign-up/:path*",
];

/**
 * Packs-era surfaces retired in the 2026-07-12 Studio pivot. These were
 * indexed/shared SEO pages, so redirect permanently (308) to transfer equity.
 */
const RETIRED_ROUTES = [
  "/packs",
  "/packs/:path*",
  "/free",
  "/openclaw/:path*",
  "/api/free-download", // the /free page linked the zip as a direct GET URL
];

const nextConfig: NextConfig = {
  async redirects() {
    return [
      ...DEAD_ROUTES.map((source) => ({
        source,
        destination: "/",
        permanent: false,
      })),
      ...RETIRED_ROUTES.map((source) => ({
        source,
        destination: "/",
        permanent: true,
      })),
      {
        // Crypto buyers' delivery page shared the purchases token — /pay/<t>
        // was the ONLY link that rail handed out (no email collected), so it
        // must land on the equivalent delivery page, never the homepage.
        source: "/pay/:token",
        destination: "/purchase/:token",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        // Belt-and-suspenders with the page metadata: private tokened download
        // pages must never be indexed.
        source: "/purchase/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
    ];
  },
};

export default nextConfig;
