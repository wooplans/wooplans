import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { getDb, schema } from "@/db";

export type PlanRow = typeof schema.plans.$inferSelect;

/** Champs visibles par tous. Les distributions cotées et le devis détaillé n'y figurent jamais. */
export type PublicPlan = Pick<
  PlanRow,
  | "id"
  | "slug"
  | "code"
  | "name"
  | "category"
  | "summary"
  | "description"
  | "seoTitle"
  | "seoDescription"
  | "bedrooms"
  | "bathrooms"
  | "levels"
  | "surfaceTotal"
  | "footprint"
  | "buildingWidth"
  | "buildingDepth"
  | "landArea"
  | "landWidth"
  | "landDepth"
  | "budgetMin"
  | "budgetMax"
  | "coverImage"
  | "renders"
  | "featured"
  | "publishedAt"
  | "updatedAt"
>;

const publicColumns = {
  id: true,
  slug: true,
  code: true,
  name: true,
  category: true,
  summary: true,
  description: true,
  seoTitle: true,
  seoDescription: true,
  bedrooms: true,
  bathrooms: true,
  levels: true,
  surfaceTotal: true,
  footprint: true,
  buildingWidth: true,
  buildingDepth: true,
  landArea: true,
  landWidth: true,
  landDepth: true,
  budgetMin: true,
  budgetMax: true,
  coverImage: true,
  renders: true,
  featured: true,
  publishedAt: true,
  updatedAt: true,
} as const;

const published = eq(schema.plans.status, "published");
const order = [desc(schema.plans.featured), asc(schema.plans.sortOrder), desc(schema.plans.publishedAt)];

export async function listPublicPlans(filter?: { category?: string; featured?: boolean; limit?: number }) {
  const conditions = [published];
  if (filter?.category) conditions.push(eq(schema.plans.category, filter.category as PlanRow["category"]));
  if (filter?.featured) conditions.push(eq(schema.plans.featured, true));
  return getDb().query.plans.findMany({
    columns: publicColumns,
    where: and(...conditions),
    orderBy: order,
    limit: filter?.limit,
  }) as Promise<PublicPlan[]>;
}

export async function getPublicPlan(slug: string) {
  return (await getDb().query.plans.findFirst({
    columns: publicColumns,
    where: and(published, eq(schema.plans.slug, slug)),
  })) as PublicPlan | undefined;
}

export async function getSimilarPublicPlans(plan: PublicPlan, limit = 3) {
  return getDb().query.plans.findMany({
    columns: publicColumns,
    where: and(published, eq(schema.plans.category, plan.category), ne(schema.plans.id, plan.id)),
    orderBy: order,
    limit,
  }) as Promise<PublicPlan[]>;
}

/* ─── Premium : réservé aux membres authentifiés (appelé après requireMember) ─── */

export async function listPremiumPlans() {
  return getDb().query.plans.findMany({ where: published, orderBy: order });
}

export async function getPremiumPlan(slug: string) {
  return getDb().query.plans.findFirst({ where: and(published, eq(schema.plans.slug, slug)) });
}

export async function getPremiumPlansBySlugs(slugs: string[]) {
  if (slugs.length === 0) return [];
  return getDb().query.plans.findMany({ where: and(published, inArray(schema.plans.slug, slugs)) });
}

/* ─── Formatage ─── */

export const CATEGORY_LABELS: Record<PlanRow["category"], string> = {
  villa: "Villa",
  duplex: "Duplex",
  immeuble: "Immeuble",
  autre: "Autre",
};

export function formatFcfa(value: number | null | undefined) {
  if (!value) return "—";
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(value)).replace(/ | /g, " ")} FCFA`;
}

/** « 25 – 30 millions FCFA » : budget arrondi pour la vitrine. */
export function formatBudgetRange(min: number | null, max: number | null) {
  const toM = (v: number) => {
    const m = v / 1_000_000;
    return m >= 10 ? Math.round(m).toString() : m.toFixed(1).replace(".", ",").replace(",0", "");
  };
  if (min && max && max > min) return `${toM(min)} – ${toM(max)} millions FCFA`;
  const single = min || max;
  return single ? `≈ ${toM(single)} millions FCFA` : null;
}

export function formatDimensions(width: number | null, depth: number | null) {
  if (!width || !depth) return null;
  const f = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  return `${f(width)} m × ${f(depth)} m`;
}

export function levelsLabel(levels: number) {
  if (levels <= 1) return "Plain-pied";
  return levels === 2 ? "R+1" : `R+${levels - 1}`;
}
