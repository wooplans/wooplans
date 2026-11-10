import { inArray } from "drizzle-orm";
import Link from "next/link";
import { getDb, schema } from "@/db";
import { DailyBars } from "@/components/admin/DailyBars";
import { Badge, DayPicker, fmtDateTime, PageTitle, PeriodTabs, pct, Stat, Table } from "@/components/admin/ui";
import {
  getChannelBreakdown,
  getDailySeries,
  getFunnelKpis,
  getPlanDevisStats,
  getSalesOverview,
  getSalesPageStats,
  getTopCtas,
} from "@/lib/analytics";
import { localDay, parseRange } from "@/lib/date-range";
import { formatFcfa } from "@/lib/plans";

/**
 * Tableau de bord : l'offre principale est la fiche modèle (plan et devis + Catalogue Premium offert, prix selon le pays).
 * En haut l'essentiel (revenu, ventes des fiches, conversion, paiements à relancer), puis les ventes par offre,
 * le tunnel des fiches, les fiches qui déclenchent l'achat, les dernières ventes et la provenance des visiteurs.
 */
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ jours?: string; jour?: string }> }) {
  const range = parseRange(await searchParams);
  const [k, overview, fiche, breakdown, series, salesPage, ctas] = await Promise.all([
    getFunnelKpis(range),
    getSalesOverview(range),
    getPlanDevisStats(range),
    getChannelBreakdown(range),
    getDailySeries(range),
    getSalesPageStats(range),
    getTopCtas(range),
  ]);
  const slugs = [...new Set([...overview.models.map((m) => m.slug), ...overview.recent.map((r) => r.slug), ...fiche.models.map((m) => m.slug)].filter((s): s is string => Boolean(s)))];
  const plans = slugs.length ? await getDb().query.plans.findMany({ where: inArray(schema.plans.slug, slugs), columns: { slug: true, code: true } }) : [];
  const code = (slug: string | null) => (slug ? (plans.find((p) => p.slug === slug)?.code ?? slug) : "—");
  const views = new Map(fiche.models.map((m) => [m.slug, m]));

  const n = (v: number) => v.toLocaleString("fr-FR");
  const rate = (a: number, b: number) => (b ? pct(a / b) : "—");
  const periodLabel = range.day
    ? new Date(range.day).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    : range.days === 365
      ? "Les 12 derniers mois"
      : `Les ${range.days} derniers jours`;
  const perLabel = range.day ? "par heure" : "par jour";
  const channelName = (c: { channel: string; paid: boolean }) => (c.paid ? `${c.channel} · publicité` : c.channel);
  const funnel = [
    { label: "Visiteurs des fiches", value: fiche.ficheVisitors },
    { label: "Ont cliqué pour acheter", value: fiche.buyClickVisitors },
    { label: "Paiements démarrés", value: fiche.checkouts },
    { label: "Payés", value: fiche.paid },
  ];
  const toRelaunch = overview.abandoned + overview.failed;

  return (
    <>
      <PageTitle
        title="Tableau de bord"
        subtitle={`${periodLabel} · heure du Cameroun · essais du propriétaire exclus`}
        actions={
          <>
            <PeriodTabs current={range.day ? null : range.days} base="/admin" />
            <DayPicker day={range.day ?? null} today={localDay(new Date())} base="/admin" />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <Stat label="Revenu des ventes" value={formatFcfa(overview.total.revenue)} hint={`${n(overview.total.n)} ventes, toutes offres`} />
        <Stat label="Ventes des fiches" value={n(overview.fiche.n)} hint={`${formatFcfa(overview.fiche.revenue)} · plan et devis + catalogue offert`} />
        <Stat label="Conversion des fiches" value={rate(fiche.purchases, fiche.ficheVisitors)} hint={`achats / ${n(fiche.ficheVisitors)} visiteurs des fiches`} />
        <Stat label="Paiements à relancer" value={n(toRelaunch)} hint={`${n(overview.abandoned)} abandonnés · ${n(overview.failed)} échoués · relance email automatique`} />
        <Stat label="Plans complets encaissés" value={formatFcfa(k.customPlanRevenue)} hint={`${n(k.newLeads)} nouvelles fiches CRM · ${n(k.activeMembers)} membres actifs`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-sm font-semibold">Ventes par offre</h2>
          <p className="mt-1 text-xs text-muted">Prix selon le pays du visiteur ou le lien de la pub (?offre=…). Le Catalogue Premium est offert avec chaque fiche.</p>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {overview.offers.length === 0 ? (
                <tr><td className="py-2 text-muted">Aucune vente sur la période.</td></tr>
              ) : (
                overview.offers.map((o) => (
                  <tr key={o.key} className="border-t border-outline/60">
                    <td className="py-2 pr-2">{o.label}</td>
                    <td className="py-2 pr-2 text-right font-semibold">{n(o.n)}</td>
                    <td className="py-2 pr-2 text-right">{formatFcfa(o.revenue)}</td>
                    <td className="py-2 text-right text-muted">{rate(o.revenue, overview.total.revenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <section className="card p-5">
          <h2 className="text-sm font-semibold">Tunnel des fiches</h2>
          <ol className="mt-3 grid grid-cols-2 gap-3">
            {funnel.map((step, i) => {
              const prev = i > 0 ? funnel[i - 1].value : null;
              return (
                <li key={step.label} className="rounded-xl bg-background p-3">
                  <p className="text-xs text-muted">{step.label}</p>
                  <p className="mt-1 text-2xl font-bold">{n(step.value)}</p>
                  {prev ? <p className="text-xs text-muted">{rate(step.value, prev)} de l&apos;étape précédente</p> : null}
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-xs text-muted">
            Détail par campagne et jour par jour : <Link href="/admin/plan-devis" className="font-semibold text-primary">Fiches (détail)</Link> ·
            relances : <Link href="/admin/prospects" className="font-semibold text-primary">Prospects</Link>
          </p>
        </section>
      </div>

      <section className="mt-6">
        <h2 className="mb-1 text-lg font-semibold">Les fiches qui font vendre</h2>
        <p className="mb-3 text-sm text-muted">Modèle choisi sur la fiche avant le paiement : celui qui a déclenché l&apos;achat.</p>
        <Table head={["Modèle", "Ventes", "Revenu", "Visiteurs de la fiche", "Paiements démarrés", "Conversion", "Par offre"]} empty={overview.models.length === 0}>
          {overview.models.map((m) => {
            const v = views.get(m.slug);
            return (
              <tr key={m.slug}>
                <td className="px-4 py-2.5 font-medium">
                  <Link href={`/catalogue/${m.slug}`} target="_blank" className="hover:text-primary">{code(m.slug)}</Link>
                </td>
                <td className="px-4 py-2.5 font-semibold">{n(m.n)}</td>
                <td className="px-4 py-2.5">{formatFcfa(m.revenue)}</td>
                <td className="px-4 py-2.5">{v ? n(v.visitors) : "—"}</td>
                <td className="px-4 py-2.5">{v ? n(v.checkouts) : "—"}</td>
                <td className="px-4 py-2.5">{v ? rate(m.n, v.visitors) : "—"}</td>
                <td className="px-4 py-2.5 text-xs text-muted">{Object.entries(m.offers).map(([o, c]) => `${o === "plan_seul" ? "seul" : o} × ${c}`).join(" · ")}</td>
              </tr>
            );
          })}
        </Table>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Dernières ventes</h2>
        <Table head={["Date", "Client", "Pays", "Offre", "Fiche", "Montant", "Provenance"]} empty={overview.recent.length === 0}>
          {overview.recent.map((r) => (
            <tr key={r.id}>
              <td className="whitespace-nowrap px-4 py-2.5">{fmtDateTime(r.occurredAt)}</td>
              <td className="px-4 py-2.5">
                <span className="block font-medium">{r.name || "—"}</span>
                <span className="text-xs text-muted">{r.email || r.phone || ""}</span>
              </td>
              <td className="px-4 py-2.5">{r.country || "—"}</td>
              <td className="px-4 py-2.5">
                <Badge tone={r.offer.fiche ? "good" : "info"}>{r.offer.fiche ? (r.offer.key === "plan_seul" ? "Plan seul" : `Offre ${r.offer.key}`) : "Catalogue seul"}</Badge>
              </td>
              <td className="px-4 py-2.5 font-medium">{code(r.slug)}</td>
              <td className="px-4 py-2.5">{formatFcfa(r.amount)}</td>
              <td className="px-4 py-2.5 text-xs text-muted">{[r.source, r.utmCampaign].filter(Boolean).join(" · ") || "—"}</td>
            </tr>
          ))}
        </Table>
      </section>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <DailyBars title={`Visiteurs ${perLabel}`} data={series.map((s) => ({ day: s.day, value: s.visitors }))} format={n} />
        <DailyBars title={`Revenu des ventes ${perLabel}`} data={series.map((s) => ({ day: s.day, value: s.revenue }))} format={formatFcfa} />
      </div>

      <section className="mt-8">
        <h2 className="mb-1 text-lg font-semibold">D&apos;où viennent les visiteurs</h2>
        <p className="mb-3 text-sm text-muted">
          Un canal par ligne. « Direct » : lien ouvert sans trace de provenance (WhatsApp, appli, favori). Toutes offres confondues.
        </p>
        <Table head={["Canal", "Visiteurs", "Paiements démarrés", "Achats", "Revenu", "Conversion"]} empty={breakdown.channels.length === 0}>
          {breakdown.channels.map((c) => (
            <tr key={`${c.channel}-${c.paid}`}>
              <td className="px-4 py-2.5 font-medium">{channelName(c)}</td>
              <td className="px-4 py-2.5">{n(c.visitors)}</td>
              <td className="px-4 py-2.5">{n(c.checkouts)}</td>
              <td className="px-4 py-2.5">{n(c.purchases)}</td>
              <td className="px-4 py-2.5">{c.revenue ? formatFcfa(c.revenue) : "—"}</td>
              <td className="px-4 py-2.5">{rate(c.purchases, c.visitors)}</td>
            </tr>
          ))}
        </Table>
        {breakdown.untracked.purchases ? (
          <p className="mt-2 text-xs text-muted">
            + {n(breakdown.untracked.purchases)} vente{breakdown.untracked.purchases > 1 ? "s" : ""} sans visite suivie ({formatFcfa(breakdown.untracked.revenue)}).
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

      <details className="mt-8">
        <summary className="cursor-pointer text-lg font-semibold">Page de vente du Catalogue Premium (vente seule) et boutons cliqués</summary>
        <div className="mt-3">
          <Table head={["Visiteurs", "Ont cliqué", "Paiements démarrés", "Échoués", "Abandonnés", "Achats", "Conversion", "WhatsApp"]}>
            <tr>
              <td className="px-4 py-2.5 font-medium">{n(salesPage.visitors)}</td>
              <td className="px-4 py-2.5">{n(salesPage.ctaVisitors)}</td>
              <td className="px-4 py-2.5">{n(salesPage.checkouts)}</td>
              <td className="px-4 py-2.5">{n(salesPage.failed)}</td>
              <td className="px-4 py-2.5">{n(salesPage.abandoned)}</td>
              <td className="px-4 py-2.5">{n(salesPage.purchases)}</td>
              <td className="px-4 py-2.5">{salesPage.visitors ? pct(salesPage.conversion) : "—"}</td>
              <td className="px-4 py-2.5">{n(salesPage.whatsapp)}</td>
            </tr>
          </Table>
          <div className="mt-4">
            <Table head={["Bouton", "Clics"]} empty={ctas.length === 0}>
              {ctas.map((c) => (
                <tr key={c.ctaId ?? "?"}><td className="px-4 py-2.5">{c.ctaId ?? "—"}</td><td className="px-4 py-2.5">{n(c.n)}</td></tr>
              ))}
            </Table>
          </div>
        </div>
      </details>
    </>
  );
}
