import Link from "next/link";
import { formatFunnelMoney, getFunnelAnalytics } from "@/lib/funnel-db";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const PERIODS = [7, 30, 90];

function formatNumber(value: number) {
  return value.toLocaleString("fr-FR");
}

function formatPercent(value: number) {
  return `${value}%`;
}

function MetricCard({
  label,
  value,
  detail,
  accentClass,
}: {
  label: string;
  value: string;
  detail: string;
  accentClass: string;
}) {
  return (
    <div className={`border-2 border-outline bg-surface p-5 border-t-4 ${accentClass}`}>
      <p className="text-xs font-black uppercase tracking-[0.24em] text-foreground/50">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-foreground">{value}</p>
      <p className="mt-2 text-xs font-semibold text-foreground/50">{detail}</p>
    </div>
  );
}

function InsightCard({
  title,
  description,
  severity,
}: {
  title: string;
  description: string;
  severity: "info" | "warning" | "critical";
}) {
  const classes =
    severity === "critical"
      ? "border-red-700 bg-red-50 text-red-800 dark:border-red-500 dark:bg-red-950 dark:text-red-200"
      : severity === "warning"
        ? "border-amber-700 bg-amber-50 text-amber-800 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-200"
        : "border-primary bg-primary/5 text-foreground";

  return (
    <article className={`border-2 p-5 ${classes}`}>
      <p className="text-xs font-black uppercase tracking-[0.24em] opacity-70">{severity}</p>
      <h3 className="mt-2 text-base font-black tracking-tight">{title}</h3>
      <p className="mt-2 text-sm font-medium leading-relaxed opacity-90">{description}</p>
    </article>
  );
}

function sourceLabel(source: string) {
  return source === "facebook_ads" ? "Facebook Ads" : "Organique";
}

export default async function AdminTunnelPage({
  searchParams,
}: {
  searchParams?: { period?: string };
}) {
  const selectedPeriod = PERIODS.includes(Number(searchParams?.period))
    ? Number(searchParams?.period)
    : 30;

  let analytics = null;
  let loadError = false;

  try {
    analytics = await getFunnelAnalytics(selectedPeriod);
  } catch (error) {
    console.error("Failed to load funnel analytics:", error);
    loadError = true;
  }

  const comparisons = analytics?.comparisons ?? [];
  const organic = comparisons.find((item) => item.source === "organic");
  const facebook = comparisons.find((item) => item.source === "facebook_ads");

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-primary">Tunnel de vente</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">
            Organique vs Facebook Ads
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-foreground/60">
            Vue de conversion par étapes, avec attribution interne selon les données disponibles sur la période
            sélectionnée.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {PERIODS.map((period) => (
            <Link
              key={period}
              href={`/admin/tunnel?period=${period}`}
              className={`border-2 px-4 py-2 text-sm font-bold transition-colors ${
                period === selectedPeriod
                  ? "border-primary bg-primary text-white"
                  : "border-outline bg-surface text-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {period} jours
            </Link>
          ))}
        </div>
      </div>

      {loadError && (
        <div className="border-2 border-red-700 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-500 dark:bg-red-950 dark:text-red-300">
          Impossible de charger les analytics du tunnel pour le moment.
        </div>
      )}

      {analytics && (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Visites"
              value={formatNumber(analytics.totals.sessions)}
              detail="Sessions attribuées au tunnel"
              accentClass="border-t-primary"
            />
            <MetricCard
              label="Clics CTA"
              value={formatNumber(analytics.totals.ctaClicks)}
              detail={`${formatPercent(
                organic ? organic.visitToCtaRate : 0,
              )} organique / ${formatPercent(facebook ? facebook.visitToCtaRate : 0)} Facebook`}
              accentClass="border-t-secondary"
            />
            <MetricCard
              label="Checkouts démarrés"
              value={formatNumber(analytics.totals.checkoutsStarted)}
              detail="Formulaire Chariow envoyé avec attribution"
              accentClass="border-t-accent"
            />
            <MetricCard
              label="Achats complétés"
              value={formatNumber(analytics.totals.salesCompleted)}
              detail={formatFunnelMoney(analytics.totals.revenue)}
              accentClass="border-t-highlight"
            />
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="border-2 border-outline bg-surface p-5">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black tracking-tight text-foreground">
                    Comparatif Organique vs Facebook Ads
                  </h2>
                  <p className="mt-1 text-sm font-medium text-foreground/55">
                    Visites, conversions et CA attribué.
                  </p>
                </div>
                <span className="border-2 border-outline px-3 py-1 text-xs font-black uppercase tracking-wider text-foreground/60">
                  {selectedPeriod} jours
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-outline text-left text-xs font-black uppercase tracking-wider text-foreground/50">
                      <th className="pb-3">Source</th>
                      <th className="pb-3 text-right">Visites</th>
                      <th className="pb-3 text-right">CTA</th>
                      <th className="pb-3 text-right">Checkout</th>
                      <th className="pb-3 text-right">Achats</th>
                      <th className="pb-3 text-right">CV CTA</th>
                      <th className="pb-3 text-right">CV vente</th>
                      <th className="pb-3 text-right">CA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisons.map((row) => (
                      <tr key={row.source} className="border-b border-outline/30 last:border-b-0">
                        <td className="py-3 font-black text-foreground">{sourceLabel(row.source)}</td>
                        <td className="py-3 text-right font-semibold text-foreground/70">
                          {formatNumber(row.sessions)}
                        </td>
                        <td className="py-3 text-right font-semibold text-foreground/70">
                          {formatNumber(row.ctaClicks)}
                        </td>
                        <td className="py-3 text-right font-semibold text-foreground/70">
                          {formatNumber(row.checkoutsStarted)}
                        </td>
                        <td className="py-3 text-right font-semibold text-foreground/70">
                          {formatNumber(row.salesCompleted)}
                        </td>
                        <td className="py-3 text-right font-semibold text-foreground/70">
                          {formatPercent(row.visitToCtaRate)}
                        </td>
                        <td className="py-3 text-right font-semibold text-foreground/70">
                          {formatPercent(row.checkoutToSaleRate)}
                        </td>
                        <td className="py-3 text-right font-semibold text-foreground/70">
                          {formatFunnelMoney(row.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border-2 border-outline bg-surface p-5">
              <h2 className="text-lg font-black tracking-tight text-foreground">Point de chute principal</h2>
              {analytics.dropOff ? (
                <div className="mt-4 border-2 border-outline bg-foreground/5 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-foreground/50">
                    Étape la plus faible
                  </p>
                  <p className="mt-2 text-2xl font-black text-foreground">{analytics.dropOff.stage}</p>
                  <p className="mt-2 text-sm font-semibold text-foreground/60">
                    Taux de passage: {formatPercent(analytics.dropOff.rate)}.
                    Perte estimée: {formatPercent(analytics.dropOff.loss)}.
                  </p>
                </div>
              ) : (
                <div className="mt-4 border-2 border-dashed border-outline/40 p-8 text-center text-sm font-semibold text-foreground/50">
                  Pas assez de données pour calculer le point de chute.
                </div>
              )}

              <div className="mt-6 space-y-4">
                <div className="border-2 border-outline p-4">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-foreground/45">
                    Conversion globale
                  </p>
                  <p className="mt-2 text-2xl font-black text-foreground">
                    {formatPercent(
                      analytics.totals.sessions > 0
                        ? Math.round((analytics.totals.salesCompleted / analytics.totals.sessions) * 100)
                        : 0,
                    )}
                  </p>
                </div>
                <div className="border-2 border-outline p-4">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-foreground/45">
                    Source dominante
                  </p>
                  <p className="mt-2 text-2xl font-black text-foreground">
                    {organic && facebook
                      ? organic.sessions >= facebook.sessions
                        ? "Organique"
                        : "Facebook Ads"
                      : organic?.sessions
                        ? "Organique"
                        : "Facebook Ads"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="border-2 border-outline bg-surface p-5">
            <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-lg font-black tracking-tight text-foreground">
                  Comportement sur la page Catalogue Premium
                </h2>
                <p className="mt-1 text-sm font-medium text-foreground/55">
                  Scroll, sections consultees, clics et sorties de page.
                </p>
              </div>
              <span className="border-2 border-outline px-3 py-1 text-xs font-black uppercase tracking-wider text-foreground/60">
                {formatNumber(analytics.behavior.sessions)} session(s)
              </span>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="border-2 border-outline p-4">
                <h3 className="text-sm font-black uppercase tracking-[0.18em] text-foreground/50">
                  Profondeur de scroll
                </h3>
                <div className="mt-4 space-y-3">
                  {analytics.behavior.scrollDepth.map((row) => (
                    <div key={row.depth}>
                      <div className="mb-1 flex items-center justify-between text-xs font-bold text-foreground/60">
                        <span>{row.depth}% atteint</span>
                        <span>{formatPercent(row.rate)}</span>
                      </div>
                      <div className="h-2 bg-foreground/10">
                        <div className="h-full bg-primary" style={{ width: `${row.rate}%` }} />
                      </div>
                      <p className="mt-1 text-[11px] font-semibold text-foreground/40">
                        {formatNumber(row.sessions)} session(s)
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-2 border-outline p-4">
                <h3 className="text-sm font-black uppercase tracking-[0.18em] text-foreground/50">
                  Sections les plus lues
                </h3>
                {analytics.behavior.topSections.length === 0 ? (
                  <div className="mt-4 border-2 border-dashed border-outline/40 p-6 text-center text-sm font-semibold text-foreground/50">
                    Pas encore de donnees de sections.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {analytics.behavior.topSections.map((row) => (
                      <div key={row.sectionId} className="border-b border-outline/30 pb-3 last:border-b-0 last:pb-0">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-black text-foreground">{row.label}</p>
                          <p className="text-xs font-black text-primary">
                            {formatPercent(row.shareOfEngagement)}
                          </p>
                        </div>
                        <p className="mt-1 text-xs font-semibold text-foreground/50">
                          {formatNumber(row.sessions)} session(s) · {formatNumber(row.engagementPings)} ping(s) ·{" "}
                          {formatNumber(row.ctaClicks)} clic(s)
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-2 border-outline p-4">
                <h3 className="text-sm font-black uppercase tracking-[0.18em] text-foreground/50">
                  Sorties par niveau de scroll
                </h3>
                <div className="mt-4 space-y-3">
                  {analytics.behavior.exitsByScrollDepth.map((row) => (
                    <div key={row.bucket}>
                      <div className="mb-1 flex items-center justify-between text-xs font-bold text-foreground/60">
                        <span>{row.bucket}</span>
                        <span>{formatPercent(row.rate)}</span>
                      </div>
                      <div className="h-2 bg-foreground/10">
                        <div className="h-full bg-secondary" style={{ width: `${row.rate}%` }} />
                      </div>
                      <p className="mt-1 text-[11px] font-semibold text-foreground/40">
                        {formatNumber(row.sessions)} sortie(s)
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="border-2 border-outline bg-surface p-5">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="text-lg font-black tracking-tight text-foreground">
                  Top pages qui convertissent
                </h2>
                <span className="text-xs font-black uppercase tracking-wider text-foreground/45">
                  par checkout démarré
                </span>
              </div>

              {analytics.topPages.length === 0 ? (
                <div className="border-2 border-dashed border-outline/40 p-8 text-center text-sm font-semibold text-foreground/50">
                  Aucune page à analyser.
                </div>
              ) : (
                <div className="space-y-3">
                  {analytics.topPages.map((row) => (
                    <div key={row.key} className="border-2 border-outline p-4">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-black text-foreground">{row.path}</p>
                          <p className="text-xs font-semibold text-foreground/45">
                            CTA: {row.ctaId || "non renseigné"}
                          </p>
                        </div>
                        <p className="text-sm font-black text-foreground">
                          {formatPercent(row.conversionRate)}
                        </p>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-foreground/55">
                        {formatNumber(row.sales)} vente(s) / {formatNumber(row.sessions)} checkout(s)
                        démarré(s) · {formatFunnelMoney(row.revenue)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-2 border-outline bg-surface p-5">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="text-lg font-black tracking-tight text-foreground">
                  Top CTA qui convertissent
                </h2>
                <span className="text-xs font-black uppercase tracking-wider text-foreground/45">
                  par session
                </span>
              </div>

              {analytics.topCtas.length === 0 ? (
                <div className="border-2 border-dashed border-outline/40 p-8 text-center text-sm font-semibold text-foreground/50">
                  Aucun CTA convertissant n&apos;a été trouvé.
                </div>
              ) : (
                <div className="space-y-3">
                  {analytics.topCtas.map((row) => (
                    <div key={row.key} className="border-2 border-outline p-4">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-black text-foreground">{row.ctaId || "CTA"}</p>
                          <p className="text-xs font-semibold text-foreground/45">{row.path}</p>
                        </div>
                        <p className="text-sm font-black text-foreground">
                          {formatPercent(row.conversionRate)}
                        </p>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-foreground/55">
                        {formatNumber(row.sales)} vente(s) / {formatNumber(row.sessions)} session(s) ·{" "}
                        {formatFunnelMoney(row.revenue)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="border-2 border-outline bg-surface p-5">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black tracking-tight text-foreground">Insights</h2>
                <p className="mt-1 text-sm font-medium text-foreground/55">
                  Règles simples déclenchées sur les données de la période.
                </p>
              </div>
              <span className="border-2 border-outline px-3 py-1 text-xs font-black uppercase tracking-wider text-foreground/60">
                {analytics.insights.length} insight(s)
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {analytics.insights.map((insight) => (
                <InsightCard key={insight.title} {...insight} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
