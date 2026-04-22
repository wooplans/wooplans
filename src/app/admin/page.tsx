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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0 border-2 border-outline">
            {recentPlans.map((plan) => (
              <Link
                key={plan.id}
                href={`/admin/plans/${plan.id}`}
                className="bg-white overflow-hidden hover:bg-surface transition-colors group border-outline border-b-2 border-r-2 last:border-r-0"
              >
                  <div className="aspect-[4/3] bg-surface relative overflow-hidden border-b-2 border-outline">
                  {plan.thumbnail ? (
                    <Image
                      src={plan.thumbnail}
                      alt={plan.name}
                      width={800}
                      height={600}
                      unoptimized
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
                    <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wide border-2 ${
                      plan.published
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-gray-500 text-white border-gray-500"
                    }`}>
                      {plan.published ? "Publié" : "Brouillon"}
                    </span>
                    {plan.featured && (
                      <span className="px-2 py-0.5 text-[10px] font-black border-2 bg-primary text-white border-primary uppercase tracking-wide">
                        Vedette
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-foreground text-sm truncate group-hover:text-primary transition-colors">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-foreground/40 mt-0.5 capitalize">{plan.category}</p>

                  <div className="flex items-center gap-3 mt-3 text-xs text-foreground/50">
                    <span>{plan.surface} m²</span>
                    <span>·</span>
                    <span>{plan.bedrooms}ch / {plan.bathrooms}sb</span>
                  </div>

                  {plan.estimatedCost > 0 && (
                    <p className="text-xs text-foreground/40 mt-2">
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
