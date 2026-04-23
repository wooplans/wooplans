import Image from "next/image";
import { getEdgeDashboardStats, listRecentEdgePlans } from "@/lib/edge-db";
import Link from "next/link";

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

export default async function AdminDashboardPage() {
  let totalPlans = 0;
  let publishedPlans = 0;
  let featuredPlans = 0;
  let totalSubscribers = 0;
  let activeSubscribers = 0;
  let recentPlans: RecentPlan[] = [];

  try {
    const stats = await getEdgeDashboardStats();
    totalPlans = stats.totalPlans;
    publishedPlans = stats.publishedPlans;
    featuredPlans = stats.featuredPlans;
    totalSubscribers = stats.totalSubscribers;
    activeSubscribers = stats.activeSubscribers;
    recentPlans = await listRecentEdgePlans();
  } catch (error) {
    console.error("Failed to load admin dashboard:", error);
  }

  const stats = [
    { label: "Plans total", value: totalPlans, borderColor: "border-blue-600", textColor: "text-blue-700" },
    { label: "Publiés", value: publishedPlans, borderColor: "border-green-600", textColor: "text-green-700" },
    { label: "Mis en avant", value: featuredPlans, borderColor: "border-primary", textColor: "text-primary" },
    { label: "Abonnés total", value: totalSubscribers, borderColor: "border-purple-600", textColor: "text-purple-700" },
    { label: "Abonnés actifs", value: activeSubscribers, borderColor: "border-emerald-600", textColor: "text-emerald-700" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-foreground tracking-tight">Dashboard</h1>
        <Link
          href="/admin/plans/new"
          className="bg-primary hover:bg-primary-dark text-white text-sm font-bold px-4 py-2 border-2 border-primary hover:border-primary-dark transition-colors"
        >
          + Nouveau plan
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-0 border-2 border-outline">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`p-5 border-outline ${stat.borderColor} border-l-4 bg-white`}
          >
            <p className="text-xs font-bold opacity-70 uppercase tracking-wider">{stat.label}</p>
            <p className={`text-3xl font-black mt-1 ${stat.textColor}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-foreground">Plans récents</h2>
          <Link href="/admin/plans" className="text-sm text-primary hover:text-primary-dark font-bold">
            Voir tout &rarr;
          </Link>
        </div>

        {recentPlans.length === 0 ? (
          <div className="bg-white border-2 border-outline p-12 text-center">
            <p className="text-foreground/50 mb-4">Aucun plan. Créez votre premier plan !</p>
            <Link href="/admin/plans/new" className="text-primary hover:text-primary-dark font-bold text-sm">
              Créer un plan &rarr;
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {recentPlans.map((plan) => (
              <Link
                key={plan.id}
                href={`/admin/plans/${plan.id}`}
                className="group block bg-surface overflow-hidden border border-outline/10 rounded-2xl transition-all duration-200 hover:shadow-sm hover:-translate-y-1"
              >
                <div className="aspect-[4/3] bg-background relative overflow-hidden">
                  {plan.thumbnail ? (
                    <Image
                      src={plan.thumbnail}
                      alt={plan.name}
                      width={800}
                      height={600}
                      sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
                      quality={50}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-foreground/20">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex gap-1">
                    <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wide border rounded-full ${
                      plan.published
                        ? "bg-green-50 text-green-700 border-green-600/30"
                        : "bg-white/90 text-foreground/50 border-outline/20"
                    }`}>
                      {plan.published ? "Publié" : "Brouillon"}
                    </span>
                    {plan.featured && (
                      <span className="px-2 py-0.5 text-[10px] font-black border border-primary/30 bg-primary/10 text-primary rounded-full uppercase tracking-wide">
                        Vedette
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5 border-t border-outline/10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-semibold px-2 py-0.5 border border-primary/20 text-primary uppercase tracking-[0.15em]">
                      {plan.category}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground text-base truncate transition-colors">
                    {plan.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-2 text-sm text-foreground/60">
                    <span>{plan.surface} m²</span>
                    <span>·</span>
                    <span>{plan.bedrooms} ch.</span>
                    <span className="text-foreground/30">/</span>
                    <span>{plan.bathrooms} SdB</span>
                  </div>

                  {plan.estimatedCost > 0 && (
                    <p className="text-xs text-foreground/40 mt-3">
                      {plan.estimatedCost.toLocaleString("fr-FR")} FCFA
                    </p>
                  )}

                  <p className="text-[10px] text-foreground/30 mt-2">
                    Modifié le {plan.updatedAt.toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
