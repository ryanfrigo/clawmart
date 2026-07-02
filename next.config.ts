import type { NextConfig } from "next";

/** Routes from the pre-relaunch product — everything redirects home. */
const DEAD_ROUTES = [
  "/skills/:path*",
  "/docs/:path*",
  "/credits/:path*",
  "/agents/:path*",
  "/categories/:path*",
  "/dashboard/:path*",
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
        // Belt-and-suspenders with the page metadata: private tokened reports
        // must never be indexed.
        source: "/report/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
    ];
  },
};

export default nextConfig;
