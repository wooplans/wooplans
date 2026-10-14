import Link from "next/link";
import { asc, desc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { Badge, fmtDate, PageTitle } from "@/components/admin/ui";
import { CHANNEL_LABELS, STAGES } from "@/lib/crm";
import { formatFcfa } from "@/lib/plans";

export default async function CrmPage({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const { vue } = await searchParams;
  const db = getDb();
  const [leads, payments] = await Promise.all([
    db.query.leads.findMany({ orderBy: [asc(schema.leads.nextFollowUpAt), desc(schema.leads.updatedAt)] }),
    db.query.leadPayments.findMany({ columns: { leadId: true, amount: true } }),
  ]);
  const paid = new Map<string, number>();
  for (const p of payments) paid.set(p.leadId, (paid.get(p.leadId) ?? 0) + p.amount);
  const now = Date.now();
  const due = leads.filter(
    (l) => l.nextFollowUpAt && l.nextFollowUpAt.getTime() <= now + 86400_000 && !["termine", "perdu"].includes(l.stage),
  );
  const showClosed = vue === "tout";
  const stages = STAGES.filter((s) => showClosed || !["termine", "perdu"].includes(s.id));

  return (
    <>
      <PageTitle
        title="CRM plans complets"
        subtitle="Demande → qualification → devis → commande → production → livraison"
        actions={
          <>
            <Link href={showClosed ? "/admin/crm" : "/admin/crm?vue=tout"} className="btn-ghost py-2">
              {showClosed ? "Masquer terminés/perdus" : "Afficher terminés/perdus"}
            </Link>
            <Link href="/admin/crm/nouveau" className="btn-primary py-2">+ Nouvelle demande</Link>
          </>
        }
      />

      {due.length > 0 ? (
        <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">À relancer aujourd&apos;hui ({due.length})</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {due.map((l) => (
              <li key={l.id}>
                <Link href={`/admin/crm/${l.id}`} className="inline-flex rounded-full bg-white px-3 py-1 text-sm shadow-sm hover:text-primary">
                  {l.name} · {fmtDate(l.nextFollowUpAt)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const items = leads.filter((l) => l.stage === stage.id);
          const value = items.reduce((s, l) => s + (l.agreedPrice ?? 0), 0);
          return (
            <section key={stage.id} className="w-72 shrink-0 rounded-2xl bg-outline/40 p-3">
              <header className="mb-3 flex items-baseline justify-between px-1">
                <h2 className="text-sm font-semibold">{stage.label} <span className="text-muted">({items.length})</span></h2>
                {value ? <span className="text-xs text-muted">{formatFcfa(value)}</span> : null}
              </header>
              <div className="space-y-2">
                {items.map((l) => (
                  <Link key={l.id} href={`/admin/crm/${l.id}`} className="card block p-3 hover:border-primary">
                    <p className="font-medium">{l.name}</p>
                    <p className="text-xs text-muted">{l.planLabel || "Modèle non choisi"} · {CHANNEL_LABELS[l.channel]}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {l.agreedPrice ? <Badge tone="info">{formatFcfa(l.agreedPrice)}</Badge> : null}
                      {paid.get(l.id) ? <Badge tone="good">Payé {formatFcfa(paid.get(l.id))}</Badge> : null}
                      {l.nextFollowUpAt ? (
                        <Badge tone={l.nextFollowUpAt.getTime() < now ? "warn" : "neutral"}>Relance {fmtDate(l.nextFollowUpAt)}</Badge>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
