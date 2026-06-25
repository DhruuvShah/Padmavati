import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React's dev-only double-invoke of effects (Strict Mode) double-opens
  // camera streams (getUserMedia isn't cancelable mid-flight), causing a
  // second <video> to briefly stack on top of the first on the Scan page.
  // This never happens in production builds — Strict Mode's double-invoke
  // is dev-only — so disabling it removes the bug at the source instead of
  // fighting timing races against it.
  reactStrictMode: false,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
