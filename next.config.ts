import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Object storage / CDN hosts are allow-listed via env so the storage
    // provider can be swapped without touching code.
    remotePatterns: (process.env.IMAGE_REMOTE_HOSTS ?? "images.unsplash.com")
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean)
      .map((hostname) => ({ protocol: "https" as const, hostname })),
  },
  experimental: { optimizePackageImports: [] },
  async rewrites() {
    // Informational pages live in one templated route but are served at the
    // short, memorable URLs the footer and sitemap advertise.
    return [
      { source: "/terms", destination: "/legal/terms" },
      { source: "/privacy", destination: "/legal/privacy" },
      { source: "/refund-policy", destination: "/legal/refund-policy" },
      { source: "/about", destination: "/legal/about" },
      { source: "/contact", destination: "/legal/contact" },
      { source: "/help", destination: "/legal/help" },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // Never let a CDN or browser cache a protected media stream.
        source: "/api/media/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
    ];
  },
};

export default config;
