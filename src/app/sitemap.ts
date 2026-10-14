import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";
import { listPublicPlans } from "@/lib/plans";

export const dynamic = "force-dynamic";

const STATIC_PAGES: { path: string; priority: number }[] = [
  { path: "/", priority: 1 },
  { path: "/catalogue-premium", priority: 0.9 },
  { path: "/catalogue", priority: 0.9 },
  { path: "/catalogue-villa", priority: 0.7 },
  { path: "/catalogue-duplex", priority: 0.7 },
  { path: "/plans-personnalises", priority: 0.6 },
  { path: "/a-propos", priority: 0.4 },
  { path: "/contact", priority: 0.4 },
  { path: "/conditions-generales-de-vente", priority: 0.2 },
  { path: "/mentions-legales", priority: 0.1 },
  { path: "/confidentialite", priority: 0.1 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const plans = await listPublicPlans().catch(() => []);
  return [
    ...STATIC_PAGES.map((p) => ({ url: siteUrl(p.path), priority: p.priority, changeFrequency: "weekly" as const })),
    ...plans.map((plan) => ({
      url: siteUrl(`/catalogue/${plan.slug}`),
      lastModified: plan.updatedAt,
      priority: 0.8,
      changeFrequency: "monthly" as const,
      images: [plan.coverImage, ...plan.renders].filter(Boolean).slice(0, 5).map((src) => (src.startsWith("http") ? src : siteUrl(src))),
    })),
  ];
}
