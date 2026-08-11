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
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Clickjacking. This mattered less when Clerk hosted the login on its
          // own origin; we now serve a password form at /signin, and an
          // invisible cross-origin frame over it is the classic way to harvest
          // one. X-Frame-Options for old browsers, frame-ancestors for current.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          // microphone stays `self` ON PURPOSE — Firefox dictation records via
          // MediaRecorder, and `microphone=()` would silently kill it.
          {
            key: "Permissions-Policy",
            value: "camera=(), geolocation=(), microphone=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
