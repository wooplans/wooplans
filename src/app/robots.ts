import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/espace-premium", "/api/", "/merci", "/lp/", "/televersement", "/en/premium/", "/en/login", "/en/thank-you"] }],
    sitemap: siteUrl("/sitemap.xml"),
    host: siteUrl(),
  };
}
