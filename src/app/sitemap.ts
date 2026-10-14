import type { MetadataRoute } from "next";
import { listPlans } from "@/lib/db";
export const runtime="edge";
export const dynamic="force-dynamic";
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const base="https://wooplans.com";const plans=await listPlans({published:true});
 return [...["/","/plans","/abonnement","/plans-personnalises"].map(path=>({url:base+path})),...plans.map(p=>({url:`${base}/plans/${p.slug}`,lastModified:p.updatedAt}))];
}
