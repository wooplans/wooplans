"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { EstimateLot, PlanRoom } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { buildCostEstimate, isPlanCategory } from "@/lib/cost-estimate";
import { randomId } from "@/lib/crypto";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const n = (f: FormData, k: string) => {
  const v = s(f, k).replace(/[\s  ]/g, "").replace(",", ".");
  if (!v) return null;
  const num = Number(v);
  return Number.isFinite(num) ? num : null;
};
const lines = (f: FormData, k: string) =>
  s(f, k)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
const json = (f: FormData, k: string): string[] => {
  try {
    const v = JSON.parse(s(f, k) || "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/** « Séjour | 32 | RDC » → { name, area, level } */
function parseRooms(f: FormData): PlanRoom[] {
  return lines(f, "rooms")
    .map((line) => {
      const [name, area, level] = line.split("|").map((p) => p.trim());
      return { name, area: Number((area || "0").replace(",", ".")) || 0, ...(level ? { level } : {}) };
    })
    .filter((r) => r.name);
}

/** « Fondation | 3 784 200 » → { label, amount } */
function parseLots(f: FormData): EstimateLot[] {
  return lines(f, "estimateLots")
    .map((line) => {
      const [label, amount] = line.split("|").map((p) => p.trim());
      return { label, amount: Math.round(Number((amount || "0").replace(/[\s  ]/g, ""))) || 0 };
    })
    .filter((l) => l.label);
}

function readPlan(f: FormData) {
  const name = s(f, "name");
  const code = s(f, "code").toUpperCase();
  const category = s(f, "category");
  if (!name || !code) throw new Error("Nom et référence obligatoires");
  if (!["villa", "duplex", "immeuble", "autre"].includes(category)) throw new Error("Catégorie invalide");
  const surfaceTotal = Math.round(n(f, "surfaceTotal") ?? 0);
  let estimateLots = parseLots(f);
  let estimateTotal = n(f, "estimateTotal");
  const rate = n(f, "ratePerM2");
  if (estimateLots.length === 0 && rate && surfaceTotal && isPlanCategory(category)) {
    const estimate = buildCostEstimate(category, surfaceTotal, rate);
    estimateLots = estimate.lines.map((l) => ({ label: l.label.charAt(0) + l.label.slice(1).toLowerCase(), amount: l.amount }));
    estimateTotal = estimate.total;
  }
  const lotsTotal = estimateLots.reduce((sum, l) => sum + l.amount, 0);
  estimateTotal = estimateTotal || lotsTotal || null;
  const renders = json(f, "renders");
  return {
    name,
    code,
    slug: slugify(s(f, "slug") || `${category}-${code}`),
    category: category as "villa" | "duplex" | "immeuble" | "autre",
    status: (["draft", "published", "archived"].includes(s(f, "status")) ? s(f, "status") : "draft") as "draft" | "published" | "archived",
    summary: s(f, "summary"),
    description: s(f, "description"),
    seoTitle: s(f, "seoTitle") || null,
    seoDescription: s(f, "seoDescription") || null,
    bedrooms: Math.round(n(f, "bedrooms") ?? 0),
    bathrooms: Math.round(n(f, "bathrooms") ?? 0),
    levels: Math.max(1, Math.round(n(f, "levels") ?? 1)),
    surfaceTotal,
    footprint: n(f, "footprint") !== null ? Math.round(n(f, "footprint")!) : null,
    buildingWidth: n(f, "buildingWidth"),
    buildingDepth: n(f, "buildingDepth"),
    landArea: n(f, "landArea") !== null ? Math.round(n(f, "landArea")!) : null,
    landWidth: n(f, "landWidth"),
    landDepth: n(f, "landDepth"),
    budgetMin: n(f, "budgetMin") ?? (estimateTotal ? Math.round((estimateTotal * 0.9) / 100000) * 100000 : null),
    budgetMax: n(f, "budgetMax") ?? (estimateTotal ? Math.round((estimateTotal * 1.1) / 100000) * 100000 : null),
    coverImage: s(f, "coverImage") || renders[0] || "",
    renders,
    featured: f.get("featured") === "on",
    sortOrder: Math.round(n(f, "sortOrder") ?? 0),
    rooms: parseRooms(f),
    floorPlans: json(f, "floorPlans"),
    estimateTotal,
    estimateLots,
    costAssumptions: s(f, "costAssumptions"),
    strengths: lines(f, "strengths"),
    watchouts: lines(f, "watchouts"),
    premiumNotes: s(f, "premiumNotes"),
  };
}

export async function createPlan(form: FormData) {
  await requireAdmin();
  const data = readPlan(form);
  const id = randomId();
  await getDb()
    .insert(schema.plans)
    .values({ id, ...data, publishedAt: data.status === "published" ? new Date() : null });
  revalidatePath("/admin/plans");
  redirect(`/admin/plans/${id}?ok=1`);
}

export async function updatePlan(id: string, form: FormData) {
  await requireAdmin();
  const db = getDb();
  const existing = await db.query.plans.findFirst({ where: eq(schema.plans.id, id) });
  if (!existing) throw new Error("Modèle introuvable");
  const data = readPlan(form);
  await db
    .update(schema.plans)
    .set({
      ...data,
      publishedAt: data.status === "published" ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
      updatedAt: new Date(),
    })
    .where(eq(schema.plans.id, id));
  revalidatePath("/admin/plans");
  revalidatePath(`/plans/${data.slug}`);
  redirect(`/admin/plans/${id}?ok=1`);
}

export async function deletePlan(id: string) {
  await requireAdmin();
  await getDb().update(schema.plans).set({ status: "archived", updatedAt: new Date() }).where(eq(schema.plans.id, id));
  revalidatePath("/admin/plans");
  redirect("/admin/plans");
}
