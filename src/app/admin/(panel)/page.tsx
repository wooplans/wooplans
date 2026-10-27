import { DailyBars } from "@/components/admin/DailyBars";
import { DayPicker, PageTitle, PeriodTabs, pct, Stat, Table } from "@/components/admin/ui";
import { getChannelBreakdown, getDailySeries, getFunnelKpis, getSalesPageStats, getTopCtas, getTopPlans } from "@/lib/analytics";
import { localDay, parseRange } from "@/lib/date-range";
import { formatFcfa } from "@/lib/plans";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ jours?: string; jour?: string }> }) {
  const range = parseRange(await searchParams);
  const [k, breakdown, ctas, plans, series, salesPage] = await Promise.all([
    getFunnelKpis(range),
    getChannelBreakdown(range),
    getTopCtas(range),
    getTopPlans(range),
    getDailySeries(range),
    getSalesPageStats(range),
  ]);
  const n = (v: number) => v.toLocaleString("fr-FR");
  const funnel = [
    { label: "Visiteurs", value: k.visitors },
    { label: "Visiteurs page de vente", value: k.salesPageVisitors },
    { label: "Paiements démarrés", value: k.checkoutStarts },
    { label: "Achats confirmés", value: k.purchases },
  ];
  const periodLabel = range.day
    ? new Date(range.day).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    : range.days === 365
      ? "Les 12 derniers mois"
      : `Les ${range.days} derniers jours`;
  const perLabel = range.day ? "par heure" : "par jour";
  const channelName = (c: { channel: string; paid: boolean }) => (c.paid ? `${c.channel} · publicité` : c.channel);
  const conversion = (r: { visitors: number; purchases: number }) => (r.visitors ? pct(r.purchases / r.visitors) : "—");

  return (
    <>
      <PageTitle
        title="Tableau de bord"
        subtitle={`${periodLabel} · heure du Cameroun`}
        actions={
          <>
            <PeriodTabs current={range.day ? null : range.days} base="/admin" />
            <DayPicker day={range.day ?? null} today={localDay(new Date())} base="/admin" />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <Stat label="Revenu catalogue" value={formatFcfa(k.catalogueRevenue)} hint={`${n(k.purchases)} achats`} />
        <Stat
          label="Revenu plan et devis"
          value={formatFcfa(k.planDevisRevenue)}
          hint={`${n(k.planDevisPurchases)} achats · ${n(k.planDevisCheckouts)} paiements démarrés`}
        />
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
        <DailyBars title={`Visiteurs ${perLabel}`} data={series.map((s) => ({ day: s.day, value: s.visitors }))} format={n} />
        <DailyBars title={`Revenu catalogue ${perLabel}`} data={series.map((s) => ({ day: s.day, value: s.revenue }))} format={formatFcfa} />
      </div>

      <section className="mt-8">
        <h2 className="mb-1 text-lg font-semibold">D&apos;où viennent les visiteurs</h2>
        <p className="mb-3 text-sm text-muted">
          Un canal par ligne (Facebook, YouTube, Google…). « Direct » : lien ouvert sans aucune trace de provenance (WhatsApp, appli, favori,
          adresse tapée). Pour qu&apos;un lien soit reconnu à coup sûr, ajoutez-lui <code>?utm_source=facebook</code>, <code>youtube</code>,{" "}
          <code>tiktok</code> ou <code>whatsapp</code>.
        </p>
        <Table head={["Canal", "Visiteurs", "Paiements démarrés", "Achats", "Revenu", "Conversion"]} empty={breakdown.channels.length === 0}>
          {breakdown.channels.map((c) => (
            <tr key={`${c.channel}-${c.paid}`}>
              <td className="px-4 py-2.5 font-medium">{channelName(c)}</td>
              <td className="px-4 py-2.5">{n(c.visitors)}</td>
              <td className="px-4 py-2.5">{n(c.checkouts)}</td>
              <td className="px-4 py-2.5">{n(c.purchases)}</td>
              <td className="px-4 py-2.5">{c.revenue ? formatFcfa(c.revenue) : "—"}</td>
              <td className="px-4 py-2.5">{conversion(c)}</td>
            </tr>
          ))}
        </Table>
        {breakdown.untracked.purchases ? (
          <p className="mt-2 text-xs text-muted">
            + {n(breakdown.untracked.purchases)} vente{breakdown.untracked.purchases > 1 ? "s" : ""} sans visite suivie ({formatFcfa(breakdown.untracked.revenue)}),
            importée{breakdown.untracked.purchases > 1 ? "s" : ""} de l&apos;ancienne boutique Chariow.
          </p>
        ) : null}
        {breakdown.campaigns.length ? (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium text-primary">Détail par campagne UTM ({n(breakdown.campaigns.length)})</summary>
            <div className="mt-3">
              <Table head={["Canal", "Campagne", "Visiteurs", "Paiements démarrés", "Achats", "Revenu"]}>
                {breakdown.campaigns.map((c) => (
                  <tr key={`${c.channel}-${c.paid}-${c.campaign}`}>
                    <td className="px-4 py-2.5">{channelName(c)}</td>
                    <td className="px-4 py-2.5 font-medium">{c.campaign}</td>
                    <td className="px-4 py-2.5">{n(c.visitors)}</td>
                    <td className="px-4 py-2.5">{n(c.checkouts)}</td>
                    <td className="px-4 py-2.5">{n(c.purchases)}</td>
                    <td className="px-4 py-2.5">{c.revenue ? formatFcfa(c.revenue) : "—"}</td>
                  </tr>
                ))}
              </Table>
            </div>
          </details>
        ) : null}
      </section>

      <section className="mt-8">
        <h2 className="mb-1 text-lg font-semibold">Page de vente</h2>
        <p className="mb-3 text-sm text-muted">Une seule page de vente (l&apos;ancienne variante A est retirée et exclue des chiffres).</p>
        <Table head={["Visiteurs", "Ont cliqué", "Paiements démarrés", "Échoués", "Abandonnés", "Achats", "Conversion", "WhatsApp"]}>
          <tr>
            <td className="px-4 py-2.5 font-medium">{n(salesPage.visitors)}</td>
            <td className="px-4 py-2.5">{n(salesPage.ctaVisitors)}{salesPage.visitors ? ` (${pct(salesPage.ctaVisitors / salesPage.visitors)})` : ""}</td>
            <td className="px-4 py-2.5">{n(salesPage.checkouts)}</td>
            <td className="px-4 py-2.5">{n(salesPage.failed)}</td>
            <td className="px-4 py-2.5">{n(salesPage.abandoned)}</td>
            <td className="px-4 py-2.5">{n(salesPage.purchases)}</td>
            <td className="px-4 py-2.5">{salesPage.visitors ? pct(salesPage.conversion) : "—"}</td>
            <td className="px-4 py-2.5">{n(salesPage.whatsapp)}</td>
          </tr>
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
