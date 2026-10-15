import Image from "next/image";
import Link from "next/link";
import { getFunnelAnalytics, type FunnelAnalytics } from "@/lib/funnel-db";
import {
  getEdgeAnalyticsDashboard,
  listRecentEdgePlans,
  type AnalyticsDashboard,
} from "@/lib/edge-db";

export const dynamic = "force-dynamic";
export const runtime = "edge";

type RecentPlan = {
  id: string;
  name: string;
  category: string;
  surface: number;
  bedrooms: number;
  bathrooms: number;
  floors: number;
  thumbnail: string;
  published: boolean;
  featured: boolean;
  estimatedCost: number;
  updatedAt: Date;
};

const emptyAnalytics: AnalyticsDashboard = {
  totalPlans: 0,
  publishedPlans: 0,
  featuredPlans: 0,
  totalSubscribers: 0,
  activeSubscribers: 0,
  draftPlans: 0,
  inactiveSubscribers: 0,
  expiredSubscribers: 0,
  expiringSoonSubscribers: 0,
  newSubscribers30d: 0,
  newPlans30d: 0,
  totalEstimatedCost: 0,
  averageEstimatedCost: 0,
  averageSurface: 0,
  publicationRate: 0,
  activeSubscriberRate: 0,
  categoryBreakdown: [],
  surfaceBreakdown: [],
  subscriberGrowth: [],
  recentSubscribers: [],
};

function formatNumber(value: number) {
  return value.toLocaleString("fr-FR");
}

function formatMoney(value: number) {
  if (value <= 0) return "-";
  return `${value.toLocaleString("fr-FR")} FCFA`;
}

function formatDate(value: Date | string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
    <div className={`bg-surface border-2 border-outline p-5 border-t-4 ${accentClass}`}>
      <p className="text-xs font-black uppercase tracking-widest text-foreground/50">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-foreground">{value}</p>
      <p className="mt-2 text-xs font-semibold text-foreground/50">{detail}</p>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  total,
  caption,
}: {
  label: string;
  value: number;
  total: number;
  caption?: string;
}) {
  const width = total > 0 ? Math.max(4, Math.round((value / total) * 100)) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <p className="text-sm font-bold text-foreground">{label}</p>
        <p className="text-sm font-black text-foreground">{formatNumber(value)}</p>
      </div>
      <div className="h-2 bg-foreground/10">
        <div className="h-full bg-primary" style={{ width: `${width}%` }} />
      </div>
      {caption && <p className="mt-1 text-xs font-semibold text-foreground/45">{caption}</p>}
    </div>
  );
}

function MiniBarChart({ data }: { data: { label: string; total: number }[] }) {
  const max = Math.max(...data.map((item) => item.total), 1);

  return (
    <div className="grid h-48 grid-cols-6 items-end gap-3">
      {data.map((item) => {
        const height = item.total > 0 ? Math.max(12, Math.round((item.total / max) * 100)) : 4;
        return (
          <div key={item.label} className="flex h-full flex-col justify-end gap-2">
            <div className="flex flex-1 items-end">
              <div
                className="w-full bg-secondary transition-colors"
                style={{ height: `${height}%` }}
                title={`${item.label}: ${item.total}`}
              />
            </div>
            <div className="text-center">
              <p className="text-xs font-black text-foreground">{item.total}</p>
              <p className="text-[11px] font-semibold uppercase text-foreground/45">{item.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SubscriberStatus({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex border-2 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
        isActive
          ? "border-green-700 bg-green-50 text-green-700 dark:border-green-500 dark:bg-green-950 dark:text-green-300"
          : "border-foreground/20 bg-foreground/5 text-foreground/50"
      }`}
    >
      {isActive ? "Actif" : "Inactif"}
    </span>
  );
}

export default async function AdminDashboardPage() {
  let analytics = emptyAnalytics;
  let recentPlans: RecentPlan[] = [];
  let funnel: FunnelAnalytics | null = null;
  let loadError = false;

  try {
    [analytics, recentPlans] = await Promise.all([
      getEdgeAnalyticsDashboard(),
      listRecentEdgePlans(6),
    ]);
  } catch (error) {
    console.error("Failed to load admin analytics dashboard:", error);
    loadError = true;
  }

  try {
    funnel = await getFunnelAnalytics(30);
  } catch (error) {
    console.error("Failed to load funnel sales for dashboard:", error);
  }

  const maxSurfaceBucket = Math.max(
    ...analytics.surfaceBreakdown.map((item) => item.total),
    1,
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-primary">
            Vue analytics
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">
            Dashboard admin
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-foreground/60">
            Ventes, plans, publications, abonnés Premium et tendances récentes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/subscribers"
            className="border-2 border-outline bg-surface px-4 py-2 text-sm font-bold text-foreground transition-colors hover:bg-foreground hover:text-surface"
          >
            Abonnés
          </Link>
          <Link
            href="/admin/plans/new"
            className="border-2 border-primary bg-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:border-primary-dark hover:bg-primary-dark"
          >
            + Nouveau plan
          </Link>
        </div>
      </div>

      {loadError && (
        <div className="border-2 border-red-700 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-500 dark:bg-red-950 dark:text-red-300">
          Impossible de charger les analytics pour le moment.
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Ventes 30 jours"
          value={funnel ? formatMoney(funnel.totals.revenue) : "-"}
          detail={
            funnel
              ? `${formatNumber(funnel.totals.salesCompleted)} achat(s) / ${formatNumber(funnel.totals.sessions)} visite(s)`
              : "Données du tunnel indisponibles"
          }
          accentClass="border-t-highlight"
        />
        <MetricCard
          label="Plans publiés"
          value={`${formatNumber(analytics.publishedPlans)} / ${formatNumber(analytics.totalPlans)}`}
          detail={`${analytics.publicationRate}% du catalogue visible`}
          accentClass="border-t-primary"
        />
        <MetricCard
          label="Abonnés actifs"
          value={`${formatNumber(analytics.activeSubscribers)} / ${formatNumber(analytics.totalSubscribers)}`}
          detail={`${analytics.activeSubscriberRate}% du parc Premium`}
          accentClass="border-t-secondary"
        />
        <MetricCard
          label="Nouveaux 30 jours"
          value={formatNumber(analytics.newSubscribers30d)}
          detail={`abonné(s) · ${formatNumber(analytics.newPlans30d)} plan(s) ajouté(s)`}
          accentClass="border-t-accent"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <div className="bg-surface border-2 border-outline p-5">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black tracking-tight text-foreground">
                Croissance Premium
              </h2>
              <p className="mt-1 text-sm font-medium text-foreground/55">
                Nouveaux abonnés sur les 6 derniers mois
              </p>
            </div>
            <span className="border-2 border-outline px-3 py-1 text-xs font-black uppercase tracking-wider text-foreground/60">
              {formatNumber(analytics.totalSubscribers)} total
            </span>
          </div>
          <MiniBarChart data={analytics.subscriberGrowth} />
        </div>

        <div className="bg-surface border-2 border-outline p-5">
          <h2 className="text-lg font-black tracking-tight text-foreground">État du catalogue</h2>
          <div className="mt-5 space-y-5">
            <ProgressRow
              label="Plans publiés"
              value={analytics.publishedPlans}
              total={analytics.totalPlans}
              caption={`${analytics.draftPlans} brouillon(s) restent à publier`}
            />
            <ProgressRow
              label="Plans mis en avant"
              value={analytics.featuredPlans}
              total={analytics.totalPlans}
              caption="Plans prioritaires dans les zones de sélection"
            />
            <ProgressRow
              label="Abonnés actifs"
              value={analytics.activeSubscribers}
              total={analytics.totalSubscribers}
              caption={`${analytics.inactiveSubscribers} compte(s) inactif(s)`}
            />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="border-2 border-outline p-4">
              <p className="text-2xl font-black text-foreground">
                {formatNumber(analytics.expiringSoonSubscribers)}
              </p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-foreground/50">
                Expirent sous 30j
              </p>
            </div>
            <div className="border-2 border-outline p-4">
              <p className="text-2xl font-black text-foreground">
                {formatNumber(analytics.expiredSubscribers)}
              </p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-foreground/50">
                Déjà expirés
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="bg-surface border-2 border-outline p-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-lg font-black tracking-tight text-foreground">
              Répartition par catégorie
            </h2>
            <Link href="/admin/plans" className="text-sm font-black text-primary hover:text-primary-dark">
              Voir les plans
            </Link>
          </div>

          {analytics.categoryBreakdown.length === 0 ? (
            <div className="border-2 border-dashed border-outline/40 p-8 text-center text-sm font-semibold text-foreground/50">
              Aucune catégorie disponible.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-outline text-left text-xs font-black uppercase tracking-wider text-foreground/50">
                    <th className="pb-3">Catégorie</th>
                    <th className="pb-3 text-right">Plans</th>
                    <th className="pb-3 text-right">Publiés</th>
                    <th className="pb-3 text-right">Surface moy.</th>
                    <th className="pb-3 text-right">Coût moy.</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.categoryBreakdown.map((category) => (
                    <tr key={category.category} className="border-b border-outline/30 last:border-b-0">
                      <td className="py-3 font-black capitalize text-foreground">{category.category}</td>
                      <td className="py-3 text-right font-semibold text-foreground/70">
                        {formatNumber(category.total)}
                      </td>
                      <td className="py-3 text-right font-semibold text-foreground/70">
                        {formatNumber(category.published)}
                      </td>
                      <td className="py-3 text-right font-semibold text-foreground/70">
                        {formatNumber(category.averageSurface)} m²
                      </td>
                      <td className="py-3 text-right font-semibold text-foreground/70">
                        {formatMoney(category.averageEstimatedCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-surface border-2 border-outline p-5">
          <h2 className="text-lg font-black tracking-tight text-foreground">
            Distribution des surfaces
          </h2>
          <div className="mt-5 space-y-4">
            {analytics.surfaceBreakdown.map((bucket) => (
              <ProgressRow
                key={bucket.label}
                label={bucket.label}
                value={bucket.total}
                total={maxSurfaceBucket}
              />
            ))}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="border-2 border-outline bg-foreground/5 p-4">
              <p className="text-xs font-black uppercase tracking-wider text-foreground/50">
                Coût moyen
              </p>
              <p className="mt-2 text-lg font-black text-foreground">
                {formatMoney(analytics.averageEstimatedCost)}
              </p>
            </div>
            <div className="border-2 border-outline bg-foreground/5 p-4">
              <p className="text-xs font-black uppercase tracking-wider text-foreground/50">
                Surface moyenne
              </p>
              <p className="mt-2 text-lg font-black text-foreground">
                {formatNumber(analytics.averageSurface)} m²
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <div>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-black tracking-tight text-foreground">Plans récents</h2>
            <Link href="/admin/plans" className="text-sm font-black text-primary hover:text-primary-dark">
              Voir tout
            </Link>
          </div>

          {recentPlans.length === 0 ? (
            <div className="border-2 border-outline bg-surface p-10 text-center">
              <p className="text-sm font-semibold text-foreground/50">Aucun plan pour le moment.</p>
              <Link href="/admin/plans/new" className="mt-3 inline-block text-sm font-black text-primary">
                Créer un plan
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {recentPlans.map((plan) => (
                <Link
                  key={plan.id}
                  href={`/admin/plans/${plan.id}`}
                  className="group grid grid-cols-[96px_minmax(0,1fr)] overflow-hidden border-2 border-outline bg-surface transition-colors hover:border-primary"
                >
                  <div className="relative h-full min-h-28 bg-foreground/10">
                    {plan.thumbnail ? (
                      <Image
                        src={plan.thumbnail}
                        alt={plan.name}
                        fill
                        sizes="96px"
                        quality={45}
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs font-bold text-foreground/30">
                        Image
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 p-4">
                    <div className="mb-2 flex flex-wrap gap-1">
                      <span
                        className={`border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                          plan.published
                            ? "border-green-700/40 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                            : "border-foreground/20 bg-foreground/5 text-foreground/45"
                        }`}
                      >
                        {plan.published ? "Publié" : "Brouillon"}
                      </span>
                      {plan.featured && (
                        <span className="border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary">
                          Vedette
                        </span>
                      )}
                    </div>
                    <h3 className="truncate text-sm font-black text-foreground">{plan.name}</h3>
                    <p className="mt-1 text-xs font-semibold capitalize text-foreground/55">
                      {plan.category} / {plan.surface} m² / {plan.bedrooms} ch.
                    </p>
                    <p className="mt-3 text-[11px] font-semibold text-foreground/40">
                      Modifié le {formatDate(plan.updatedAt)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface border-2 border-outline p-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-lg font-black tracking-tight text-foreground">Abonnés récents</h2>
            <Link
              href="/admin/subscribers"
              className="text-sm font-black text-primary hover:text-primary-dark"
            >
              Gérer
            </Link>
          </div>

          {analytics.recentSubscribers.length === 0 ? (
            <div className="border-2 border-dashed border-outline/40 p-8 text-center text-sm font-semibold text-foreground/50">
              Aucun abonné récent.
            </div>
          ) : (
            <div className="divide-y divide-outline/30">
              {analytics.recentSubscribers.map((subscriber) => (
                <div key={subscriber.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-bold text-foreground">
                      {subscriber.email}
                    </p>
                    <SubscriberStatus isActive={subscriber.isActive} />
                  </div>
                  <p className="mt-1 text-xs font-semibold text-foreground/45">
                    Inscrit le {formatDate(subscriber.createdAt)} / expire le{" "}
                    {formatDate(subscriber.expiresAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
