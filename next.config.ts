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

const nextConfig: NextConfig = {
  async redirects() {
    return DEAD_ROUTES.map((source) => ({
      source,
      destination: "/",
      permanent: false,
    }));
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
