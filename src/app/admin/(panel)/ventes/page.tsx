import { and, desc, eq, gte, sum } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { Badge, fmtDateTime, PageTitle, Table } from "@/components/admin/ui";
import { formatFcfa } from "@/lib/plans";

const TONES = { completed: "good", abandoned: "warn", failed: "bad", refunded: "neutral" } as const;
const LABELS = { completed: "Payée", abandoned: "Abandonnée", failed: "Échouée", refunded: "Remboursée" } as const;

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ statut?: string }> }) {
  const { statut } = await searchParams;
  const status = (["completed", "abandoned", "failed"] as const).find((s) => s === statut);
  const db = getDb();
  const sales = await db.query.sales.findMany({
    where: status ? eq(schema.sales.status, status) : undefined,
    orderBy: desc(schema.sales.occurredAt),
    limit: 300,
  });
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [month] = await db
    .select({ total: sum(schema.sales.amount) })
    .from(schema.sales)
    .where(and(eq(schema.sales.status, "completed"), gte(schema.sales.occurredAt, monthStart)));

  return (
    <>
      <PageTitle
        title="Ventes du Catalogue Premium"
        subtitle={`Ce mois-ci : ${formatFcfa(Number(month?.total ?? 0))}. Les paniers abandonnés sont à relancer sur WhatsApp.`}
      />
      <div className="mb-4 flex gap-2 text-sm">
        {[["", "Toutes"], ["completed", "Payées"], ["abandoned", "Abandonnées"], ["failed", "Échouées"]].map(([v, l]) => (
          <a key={v} href={v ? `/admin/ventes?statut=${v}` : "/admin/ventes"} className={`rounded-full px-3 py-1 ${statut === v || (!statut && !v) ? "bg-primary text-white" : "bg-surface"}`}>
            {l}
          </a>
        ))}
      </div>
      <Table head={["Date", "Client", "Montant", "Statut", "Source / campagne", "Produit"]} empty={sales.length === 0}>
        {sales.map((s) => {
          const phone = (s.phone || "").replace(/\D/g, "");
          return (
            <tr key={s.id}>
              <td className="px-4 py-2.5 whitespace-nowrap">{fmtDateTime(s.occurredAt)}</td>
              <td className="px-4 py-2.5">
                <p className="font-medium">{s.name || "—"}</p>
                <p className="text-xs text-muted">
                  {s.email}
                  {phone ? <> · <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer" className="text-primary">{s.phone}</a></> : null}
                </p>
              </td>
              <td className="px-4 py-2.5">{formatFcfa(s.amount)}</td>
              <td className="px-4 py-2.5"><Badge tone={TONES[s.status]}>{LABELS[s.status]}</Badge></td>
              <td className="px-4 py-2.5">{s.source || "—"}{s.utmCampaign ? ` · ${s.utmCampaign}` : ""}</td>
              <td className="px-4 py-2.5 text-xs text-muted">{s.productName}</td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
