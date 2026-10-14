import Link from "next/link";
import { asc, desc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { Badge, fmtDate, PageTitle, Table } from "@/components/admin/ui";
import { CATEGORY_LABELS, formatFcfa } from "@/lib/plans";

const STATUS = { published: ["Publié", "good"], draft: ["Brouillon", "warn"], archived: ["Archivé", "neutral"] } as const;

export default async function AdminPlansPage() {
  const plans = await getDb().query.plans.findMany({ orderBy: [asc(schema.plans.status), desc(schema.plans.updatedAt)] });
  const published = plans.filter((p) => p.status === "published").length;
  return (
    <>
      <PageTitle title="Modèles" subtitle={`${published} publiés sur ${plans.length}`} actions={<Link href="/admin/plans/nouveau" className="btn-primary py-2">+ Nouveau modèle</Link>} />
      <Table head={["Modèle", "Catégorie", "Surface", "Devis", "Contenu Premium", "Statut", "Mis à jour"]} empty={plans.length === 0}>
        {plans.map((p) => (
          <tr key={p.id}>
            <td className="px-4 py-2.5">
              <Link href={`/admin/plans/${p.id}`} className="flex items-center gap-3 font-medium hover:text-primary">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.coverImage ? <img src={p.coverImage} alt="" className="h-10 w-14 rounded object-cover" /> : null}
                <span>{p.name}<span className="block text-xs text-muted">{p.code}</span></span>
              </Link>
            </td>
            <td className="px-4 py-2.5">{CATEGORY_LABELS[p.category]}</td>
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
