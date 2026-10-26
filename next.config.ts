import { readFileSync } from "node:fs";
import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { legacyRedirects } from "./src/lib/redirects";

/**
 * Variables publiques de wrangler.jsonc (« vars ») injectées au build : les pages pré-rendues
 * (à propos, contact…) n'ont pas accès aux variables du Worker. Sans cela, elles partaient sans
 * Pixel ni PostHog et avec le numéro WhatsApp par défaut.
 */
const PUBLIC_VARS = ["SITE_URL", "WHATSAPP_NUMBER", "FB_PIXEL_ID", "POSTHOG_KEY", "POSTHOG_HOST", "CHARIOW_STORE_DOMAIN", "CHARIOW_CATALOGUE_PRODUCT_ID"];

function wranglerVars() {
  const text = readFileSync(new URL("./wrangler.jsonc", import.meta.url), "utf8");
  const block = /"vars"\s*:\s*\{([\s\S]*?)\n\s*\}/.exec(text)?.[1] ?? "";
  const vars = Object.fromEntries([...block.matchAll(/"([A-Z0-9_]+)"\s*:\s*"([^"]*)"/g)].map((m) => [m[1], m[2]]));
  return Object.fromEntries(PUBLIC_VARS.filter((k) => k in vars).map((k) => [k, vars[k]]));
}

const nextConfig: NextConfig = {
  env: wranglerVars(),
  images: { unoptimized: true },
  poweredByHeader: false,
  async redirects() {
    return legacyRedirects;
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
        source: "/(espace-premium|admin|temoignage)/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();
