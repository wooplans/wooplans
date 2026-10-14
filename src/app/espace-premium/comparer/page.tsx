import Link from "next/link";
import { inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireMember } from "@/lib/auth";
import { CATEGORY_LABELS, formatDimensions, formatFcfa, getPremiumPlansBySlugs, levelsLabel, type PlanRow } from "@/lib/plans";
import { getFavoriteIds } from "@/lib/premium";

type Row = { label: string; value: (p: PlanRow) => string };

const ROWS: Row[] = [
  { label: "Type", value: (p) => `${CATEGORY_LABELS[p.category]} · ${levelsLabel(p.levels)}` },
  { label: "Chambres", value: (p) => String(p.bedrooms) },
  { label: "Salles de bain", value: (p) => String(p.bathrooms) },
  { label: "Surface totale", value: (p) => (p.surfaceTotal ? `${p.surfaceTotal} m²` : "—") },
  { label: "Emprise au sol", value: (p) => (p.footprint ? `${p.footprint} m²` : "—") },
  { label: "Dimensions", value: (p) => formatDimensions(p.buildingWidth, p.buildingDepth) ?? "—" },
  { label: "Terrain nécessaire", value: (p) => (p.landArea ? `${p.landArea} m²` : "—") },
  {
    label: "Devis estimatif",
    value: (p) => formatFcfa(p.estimateTotal || p.estimateLots.reduce((s, l) => s + l.amount, 0) || p.budgetMin),
  },
  {
    label: "Coût au m²",
    value: (p) => {
      const total = p.estimateTotal || p.estimateLots.reduce((s, l) => s + l.amount, 0);
      return total && p.surfaceTotal ? formatFcfa(total / p.surfaceTotal) : "—";
    },
  },
  { label: "Atouts", value: (p) => p.strengths.slice(0, 3).join(" · ") || "—" },
  { label: "Points d'attention", value: (p) => p.watchouts.slice(0, 3).join(" · ") || "—" },
];

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const member = await requireMember();
  const { m } = await searchParams;
  let slugs = (m || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3);
  if (slugs.length === 0) {
    const ids = [...(await getFavoriteIds(member.id))];
    const favs = ids.length ? await getDb().query.plans.findMany({ where: inArray(schema.plans.id, ids), columns: { slug: true } }) : [];
    slugs = favs.map((f) => f.slug).slice(0, 3);
  }
  const found = await getPremiumPlansBySlugs(slugs);
  const plans = slugs.map((s) => found.find((p) => p.slug === s)).filter((p): p is PlanRow => Boolean(p));

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold tracking-tight">Comparer mes modèles</h1>
      <p className="mt-1 text-foreground/70">Jusqu&apos;à trois modèles côte à côte. Ajoutez des favoris pour les retrouver ici.</p>
      {plans.length === 0 ? (
        <div className="card mt-8 p-8 text-center text-muted">
          Ajoutez des modèles à vos favoris, puis revenez ici pour les comparer.
          <div className="mt-4"><Link href="/espace-premium" className="btn-ghost">Parcourir les modèles</Link></div>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="w-40" />
                {plans.map((p) => (
                  <th key={p.id} className="p-2 text-left align-top">
                    <Link href={`/espace-premium/plans/${p.slug}`} className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.coverImage} alt={p.name} className="aspect-[4/3] w-full rounded-xl object-cover" />
                      <span className="mt-2 block font-semibold">{p.name}</span>
                      <span className="text-xs font-normal text-muted">{p.code}</span>
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label}>
                  <th className="border-t border-outline p-3 text-left font-medium text-muted">{row.label}</th>
                  {plans.map((p) => (
                    <td key={p.id} className="border-t border-outline p-3 align-top">{row.value(p)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
