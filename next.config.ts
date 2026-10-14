import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { legacyRedirects } from "./src/lib/redirects";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  poweredByHeader: false,
  async redirects() {
    return legacyRedirects;
  },
  async rewrites() {
    // Page de vente : HTML statique optimisé, servi directement par les assets Cloudflare.
    return [{ source: "/catalogue-premium", destination: "/lp/catalogue-premium.html" }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      {
        source: "/lp/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
      {
        source: "/assets/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/(espace-premium|admin)/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();
