import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/espace-premium", "/api/", "/merci", "/guide-budget", "/lp/", "/televersement"] }],
    sitemap: siteUrl("/sitemap.xml"),
    host: siteUrl(),
  };
}
