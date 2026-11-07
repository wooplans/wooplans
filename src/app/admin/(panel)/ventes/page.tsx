import { and, desc, eq, gte, inArray, sum } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { Badge, fmtDateTime, PageTitle, Table } from "@/components/admin/ui";
import { siteUrl } from "@/lib/env";
import { formatFcfa } from "@/lib/plans";

const TONES = { completed: "good", abandoned: "warn", failed: "bad", refunded: "neutral" } as const;
const LABELS = { completed: "Payée", abandoned: "Abandonnée", failed: "Échouée", refunded: "Remboursée" } as const;

/** Message WhatsApp pour renvoyer à la main un plan et devis payé (email non reçu, adresse erronée…). */
function planDevisWhatsapp(params: { phone: string; name: string | null; code: string; intentId: string }) {
  const first = (params.name || "").trim().split(/\s+/)[0];
  const text = [
    `Bonjour${first ? ` ${first}` : ""}, merci pour votre achat chez WOOPLANS.`,
    `Voici votre plan et devis du modèle ${params.code} (document marqué à votre nom) : ${siteUrl(`/api/plan-devis/${params.intentId}`)}`,
    "Je vous l'envoie aussi en PDF ici. Pour toute modification du plan, répondez simplement à ce message.",
  ].join("\n\n");
  return `https://wa.me/${params.phone}?text=${encodeURIComponent(text)}`;
}

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ statut?: string }> }) {
  const { statut } = await searchParams;
  const status = (["completed", "abandoned", "failed"] as const).find((s) => s === statut);
  const db = getDb();
  const sales = await db.query.sales.findMany({
    where: status ? eq(schema.sales.status, status) : undefined,
    orderBy: desc(schema.sales.occurredAt),
    limit: 300,
  });
  // Achats du plan et devis : modèle acheté et nombre de téléchargements, pour le renvoi sur WhatsApp.
  const intentIds = sales.map((s) => s.intentId).filter((id): id is string => Boolean(id));
  const intents = intentIds.length
    ? await db.query.checkoutIntents.findMany({
        where: inArray(schema.checkoutIntents.id, intentIds),
        columns: { id: true, planSlug: true, status: true, downloads: true },
      })
    : [];
  const intentById = new Map(intents.map((i) => [i.id, i]));
  const slugs = [...new Set(intents.map((i) => i.planSlug).filter((v): v is string => Boolean(v)))];
  const plans = slugs.length
    ? await db.query.plans.findMany({ where: inArray(schema.plans.slug, slugs), columns: { slug: true, code: true } })
    : [];
  const codeBySlug = new Map(plans.map((p) => [p.slug, p.code]));
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [month] = await db
    .select({ total: sum(schema.sales.amount) })
    .from(schema.sales)
    .where(and(eq(schema.sales.status, "completed"), gte(schema.sales.occurredAt, monthStart)));

  return (
    <>
      <PageTitle
        title="Ventes"
        subtitle={`Ce mois-ci : ${formatFcfa(Number(month?.total ?? 0))}. Les paniers abandonnés sont à relancer sur WhatsApp. Plan et devis non reçu : bouton WhatsApp et PDF sur la ligne de la vente.`}
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
          const intent = s.intentId ? intentById.get(s.intentId) : undefined;
          const planDevis = s.status === "completed" && intent?.planSlug && (intent.status === "paid" || intent.status === "gift") ? intent : null;
          const code = planDevis?.planSlug ? (codeBySlug.get(planDevis.planSlug) ?? planDevis.planSlug) : null;
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
              <td className="px-4 py-2.5 text-xs text-muted">
                {s.productName}
                {planDevis && code ? (
                  <div className="mt-2 space-y-1.5">
                    <p className={planDevis.downloads === 0 ? "font-semibold text-secondary" : ""}>
                      {planDevis.downloads === 0 ? "Pas encore téléchargé" : `Téléchargé ${planDevis.downloads} fois`}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {phone ? (
                        <a
                          href={planDevisWhatsapp({ phone, name: s.name, code, intentId: planDevis.id })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full bg-[#25D366] px-3 py-1 font-semibold text-white"
                        >
                          Envoyer sur WhatsApp
                        </a>
                      ) : null}
                      <a href={`/api/admin/plan-devis/${planDevis.id}`} className="rounded-full border border-primary px-3 py-1 font-semibold text-primary">
                        Télécharger le PDF
                      </a>
                    </div>
                  </div>
                ) : null}
              </td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
