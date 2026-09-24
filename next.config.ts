import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Emit a self-contained server for the Docker image. Gated so that plain
  // `next start` (buildpack hosts like Railway/Render) keeps working locally
  // and in a non-container deploy.
  ...(process.env.BUILD_STANDALONE === "1" ? { output: "standalone" as const } : {}),
  images: {
    // Object storage / CDN hosts are allow-listed via env so the storage
    // provider can be swapped without touching code.
    remotePatterns: (process.env.IMAGE_REMOTE_HOSTS ?? "images.unsplash.com")
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean)
      .map((hostname) => ({ protocol: "https" as const, hostname })),
  },
  // Nodemailer resolves parts of itself at runtime, so it is kept out of the
  // bundle and copied into the standalone output as a real package instead.
  serverExternalPackages: ["nodemailer"],
  experimental: { optimizePackageImports: [] },
  async redirects() {
    // The course catalogue is gone — courses live inside a circle now. This
    // is a config redirect rather than a page that calls redirect(), because
    // a page with no data of its own is STATIC: Next prerenders it at build
    // time, prerendering renders the layout, and the layout reads the
    // database. There is no database during a Docker build, so that version
    // failed the build outright. A redirect here never renders anything.
    //
    // Exact paths only: /courses/[slug] must keep working for direct links,
    // receipts and the classroom.
    return [
      { source: "/courses", destination: "/communities", permanent: false },
      { source: "/en/courses", destination: "/en/communities", permanent: false },
      { source: "/categories", destination: "/communities", permanent: false },
      { source: "/en/categories", destination: "/en/communities", permanent: false },
      // No separate creators directory for now: a creator is found through
      // their circle. "Become a creator" is the same thing as starting one.
      { source: "/instructors", destination: "/", permanent: false },
      { source: "/en/instructors", destination: "/en", permanent: false },
      { source: "/become-instructor", destination: "/start", permanent: false },
      { source: "/en/become-instructor", destination: "/en/start", permanent: false },
      // The public catalogue is gone entirely: a lesson is something inside a
      // circle, reached from its classroom, and a creator is found through
      // the circle they run. Old links land on the nearest live thing rather
      // than a 404 — a creator's slug IS their circle's slug.
      { source: "/courses/:slug", destination: "/communities", permanent: false },
      { source: "/en/courses/:slug", destination: "/en/communities", permanent: false },
      { source: "/category/:slug", destination: "/communities?category=:slug", permanent: false },
      { source: "/en/category/:slug", destination: "/en/communities?category=:slug", permanent: false },
      { source: "/creator/:slug", destination: "/community/:slug", permanent: false },
      { source: "/en/creator/:slug", destination: "/en/community/:slug", permanent: false },
      { source: "/dashboard/wishlist", destination: "/dashboard/profile", permanent: false },
      // A course is a class now, in the address bar as well.
      { source: "/learn/:slug", destination: "/class/:slug", permanent: false },
      { source: "/en/learn/:slug", destination: "/en/class/:slug", permanent: false },
      { source: "/dashboard/creator/courses", destination: "/dashboard/creator/classes", permanent: false },
      { source: "/dashboard/creator/courses/:path*", destination: "/dashboard/creator/classes/:path*", permanent: false },
      { source: "/admin/courses", destination: "/admin/classes", permanent: false },
      { source: "/en/dashboard/wishlist", destination: "/en/dashboard/profile", permanent: false },
    ];
  },
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
