import Link from "next/link";
import { asc, desc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { Badge, fmtDate, PageTitle, Table } from "@/components/admin/ui";
import { CATEGORY_LABELS, formatFcfa } from "@/lib/plans";

const STATUS = { published: ["Publié", "good"], draft: ["Brouillon", "warn"], archived: ["Archivé", "neutral"] } as const;

const SORTS = {
  statut: "Statut puis mise à jour",
  recent: "Mis à jour récemment",
  nom: "Nom / référence",
  surface_asc: "Surface croissante",
  surface_desc: "Surface décroissante",
  devis_asc: "Devis croissant",
  devis_desc: "Devis décroissant",
} as const;

type Filters = {
  q?: string;
  categorie?: string;
  statut?: string;
  chambres?: string;
  premium?: string;
  vedette?: string;
  tri?: string;
};

type Plan = typeof schema.plans.$inferSelect;

const isComplete = (p: Plan) => p.floorPlans.length > 0 && p.estimateLots.length > 0;

function sortPlans(plans: Plan[], tri: keyof typeof SORTS) {
  const byNumber = (get: (p: Plan) => number | null, dir: 1 | -1) => (a: Plan, b: Plan) => {
    const va = get(a);
    const vb = get(b);
    if (va === vb) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    return (va - vb) * dir;
  };
  const sorted = [...plans];
  switch (tri) {
    case "recent":
      return sorted.sort(byNumber((p) => p.updatedAt.getTime(), -1));
    case "nom":
      return sorted.sort((a, b) => a.code.localeCompare(b.code, "fr", { numeric: true }) || a.name.localeCompare(b.name, "fr"));
    case "surface_asc":
      return sorted.sort(byNumber((p) => p.surfaceTotal, 1));
    case "surface_desc":
      return sorted.sort(byNumber((p) => p.surfaceTotal, -1));
    case "devis_asc":
      return sorted.sort(byNumber((p) => p.estimateTotal || null, 1));
    case "devis_desc":
      return sorted.sort(byNumber((p) => p.estimateTotal || null, -1));
    default:
      return sorted;
  }
}

export default async function AdminPlansPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const f = await searchParams;
  const plans = await getDb().query.plans.findMany({ orderBy: [asc(schema.plans.status), desc(schema.plans.updatedAt)] });
  const published = plans.filter((p) => p.status === "published").length;

  const term = (f.q || "").trim().toLowerCase();
  const bedrooms = f.chambres ? Number(f.chambres) : null;
  const tri = f.tri && f.tri in SORTS ? (f.tri as keyof typeof SORTS) : "statut";
  const bedroomOptions = [...new Set(plans.map((p) => p.bedrooms))].sort((a, b) => a - b);

  const filtered = sortPlans(
    plans.filter((p) => {
      if (term && ![p.name, p.code, p.slug].some((v) => v.toLowerCase().includes(term))) return false;
      if (f.categorie && p.category !== f.categorie) return false;
      if (f.statut && p.status !== f.statut) return false;
      if (bedrooms !== null && p.bedrooms !== bedrooms) return false;
      if (f.premium === "complet" && !isComplete(p)) return false;
      if (f.premium === "incomplet" && isComplete(p)) return false;
      if (f.vedette === "oui" && !p.featured) return false;
      if (f.vedette === "non" && p.featured) return false;
      return true;
    }),
    tri,
  );
  const hasFilters = Boolean(term || f.categorie || f.statut || f.chambres || f.premium || f.vedette || tri !== "statut");

  return (
    <>
      <PageTitle title="Modèles" subtitle={`${published} publiés sur ${plans.length}`} actions={<Link href="/admin/plans/nouveau" className="btn-primary py-2">+ Nouveau modèle</Link>} />

      <form className="card mb-4 grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <input name="q" defaultValue={f.q ?? ""} placeholder="Rechercher nom, référence, slug" className="input sm:col-span-2" />
        <select name="categorie" defaultValue={f.categorie ?? ""} className="input" aria-label="Catégorie">
          <option value="">Toutes catégories</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select name="statut" defaultValue={f.statut ?? ""} className="input" aria-label="Statut">
          <option value="">Tous statuts</option>
          {Object.entries(STATUS).map(([value, [label]]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select name="chambres" defaultValue={f.chambres ?? ""} className="input" aria-label="Chambres">
          <option value="">Toutes chambres</option>
          {bedroomOptions.map((n) => <option key={n} value={n}>{n} chambre{n > 1 ? "s" : ""}</option>)}
        </select>
        <select name="premium" defaultValue={f.premium ?? ""} className="input" aria-label="Contenu Premium">
          <option value="">Contenu Premium : tous</option>
          <option value="complet">Complet (distributions + devis)</option>
          <option value="incomplet">Incomplet</option>
        </select>
        <select name="vedette" defaultValue={f.vedette ?? ""} className="input" aria-label="Vedette">
          <option value="">Vedette : tous</option>
          <option value="oui">En vedette</option>
          <option value="non">Pas en vedette</option>
        </select>
        <select name="tri" defaultValue={tri} className="input" aria-label="Tri">
          {Object.entries(SORTS).map(([value, label]) => <option key={value} value={value}>Tri : {label}</option>)}
        </select>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-4 lg:justify-end">
          {hasFilters ? <Link href="/admin/plans" className="btn-ghost py-2">Effacer</Link> : null}
          <button className="btn-primary py-2">Filtrer</button>
        </div>
      </form>

      <p className="mb-2 text-xs text-muted">
        {filtered.length} modèle{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""} sur {plans.length}
      </p>

      <Table head={["Modèle", "Catégorie", "Chambres", "Surface", "Devis", "Contenu Premium", "Statut", "Mis à jour"]} empty={filtered.length === 0}>
        {filtered.map((p) => (
          <tr key={p.id}>
            <td className="px-4 py-2.5">
              <Link href={`/admin/plans/${p.id}`} className="flex items-center gap-3 font-medium hover:text-primary">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.coverImage ? <img src={p.coverImage} alt="" className="h-10 w-14 rounded object-cover" /> : null}
                <span>{p.name}<span className="block text-xs text-muted">{p.code}{p.featured ? " · ★ vedette" : ""}</span></span>
              </Link>
            </td>
            <td className="px-4 py-2.5">{CATEGORY_LABELS[p.category]}</td>
            <td className="px-4 py-2.5">{p.bedrooms}</td>
            <td className="px-4 py-2.5">{p.surfaceTotal} m²</td>
            <td className="px-4 py-2.5">{formatFcfa(p.estimateTotal)}</td>
            <td className="px-4 py-2.5 text-xs">
              {p.floorPlans.length ? "✓ distributions" : <span className="text-secondary">✗ distributions</span>} ·{" "}
              {p.estimateLots.length ? "✓ devis" : <span className="text-secondary">✗ devis</span>}
            </td>
            <td className="px-4 py-2.5"><Badge tone={STATUS[p.status][1]}>{STATUS[p.status][0]}</Badge></td>
            <td className="px-4 py-2.5">{fmtDate(p.updatedAt)}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
