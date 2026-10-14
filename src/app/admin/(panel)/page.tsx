import { DailyBars } from "@/components/admin/DailyBars";
import { PageTitle, PeriodTabs, pct, Stat, Table } from "@/components/admin/ui";
import { getDailySeries, getFunnelKpis, getSourceBreakdown, getTopCtas, getTopPlans, type Period } from "@/lib/analytics";
import { formatFcfa } from "@/lib/plans";

const PERIODS = [7, 30, 90, 365] as const;

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ jours?: string }> }) {
  const requested = Number((await searchParams).jours);
  const days: Period = (PERIODS as readonly number[]).includes(requested) ? (requested as Period) : 30;
  const [k, sources, ctas, plans, series] = await Promise.all([
    getFunnelKpis(days),
    getSourceBreakdown(days),
    getTopCtas(days),
    getTopPlans(days),
    getDailySeries(days),
  ]);
  const n = (v: number) => v.toLocaleString("fr-FR");
  const funnel = [
    { label: "Visiteurs", value: k.visitors },
    { label: "Visiteurs page de vente", value: k.salesPageVisitors },
    { label: "Paiements démarrés", value: k.checkoutStarts },
    { label: "Achats confirmés", value: k.purchases },
  ];

  return (
    <>
      <PageTitle title="Tableau de bord" subtitle="Le tunnel de vente, de la visite à l'achat." actions={<PeriodTabs current={days} base="/admin" />} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Revenu catalogue" value={formatFcfa(k.catalogueRevenue)} hint={`${n(k.purchases)} achats`} />
        <Stat label="Encaissements plans complets" value={formatFcfa(k.customPlanRevenue)} hint="saisis dans le CRM" />
        <Stat label="Conversion page de vente" value={pct(k.salesPageConversion)} hint="achats / visiteurs de la page" />
        <Stat label="Membres actifs" value={n(k.activeMembers)} hint={`+${n(k.newMembers)} sur la période`} />
      </div>

      <section className="mt-6 card p-5">
        <h2 className="text-sm font-semibold">Tunnel</h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-4">
          {funnel.map((step, i) => {
            const prev = i > 0 ? funnel[i - 1].value : null;
            return (
              <li key={step.label} className="rounded-xl bg-background p-4">
                <p className="text-xs text-muted">{step.label}</p>
                <p className="mt-1 text-2xl font-bold">{n(step.value)}</p>
                {prev ? <p className="text-xs text-muted">{pct(step.value / prev)} de l&apos;étape précédente</p> : null}
              </li>
            );
          })}
        </ol>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <p><span className="text-muted">Clics « Obtenir le catalogue » :</span> <strong>{n(k.ctaClicks)}</strong></p>
          <p><span className="text-muted">Paniers abandonnés :</span> <strong>{n(k.abandonedCheckouts)}</strong></p>
          <p><span className="text-muted">Clics WhatsApp :</span> <strong>{n(k.whatsappClicks)}</strong></p>
          <p><span className="text-muted">Demandes de plans complets :</span> <strong>{n(k.newLeads)}</strong></p>
        </div>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <DailyBars title="Visiteurs par jour" data={series.map((s) => ({ day: s.day, value: s.visitors }))} format={n} />
        <DailyBars title="Revenu catalogue par jour" data={series.map((s) => ({ day: s.day, value: s.revenue }))} format={formatFcfa} />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Sources et campagnes (UTM)</h2>
        <Table head={["Source", "Campagne", "Visiteurs", "Paiements démarrés", "Achats", "Revenu", "Conversion"]} empty={sources.length === 0}>
          {sources.map((s) => (
            <tr key={`${s.source}-${s.campaign}`}>
              <td className="px-4 py-2.5 font-medium">{s.source}</td>
              <td className="px-4 py-2.5">{s.campaign}</td>
              <td className="px-4 py-2.5">{n(s.visitors)}</td>
              <td className="px-4 py-2.5">{n(s.checkouts)}</td>
              <td className="px-4 py-2.5">{n(s.purchases)}</td>
              <td className="px-4 py-2.5">{formatFcfa(s.revenue)}</td>
              <td className="px-4 py-2.5">{s.visitors ? pct(s.purchases / s.visitors) : "—"}</td>
            </tr>
          ))}
        </Table>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Boutons les plus cliqués</h2>
          <Table head={["Bouton", "Clics"]} empty={ctas.length === 0}>
            {ctas.map((c) => (
              <tr key={c.ctaId ?? "?"}><td className="px-4 py-2.5">{c.ctaId ?? "—"}</td><td className="px-4 py-2.5">{n(c.n)}</td></tr>
            ))}
          </Table>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-semibold">Modèles les plus vus</h2>
          <Table head={["Modèle", "Vues"]} empty={plans.length === 0}>
            {plans.map((p) => (
              <tr key={p.slug ?? "?"}><td className="px-4 py-2.5">{p.slug}</td><td className="px-4 py-2.5">{n(p.n)}</td></tr>
            ))}
          </Table>
        </section>
      </div>
    </>
  );
}
