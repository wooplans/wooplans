import Link from "next/link";
import { inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { PremiumPlanCard } from "@/components/premium/PremiumPlanCard";
import { requireMember } from "@/lib/auth";
import { getFavoriteIds } from "@/lib/premium";

export default async function FavoritesPage() {
  const member = await requireMember();
  const ids = [...(await getFavoriteIds(member.id))];
  const plans = ids.length
    ? (await getDb().query.plans.findMany({ where: inArray(schema.plans.id, ids) })).filter((p) => p.status === "published")
    : [];
  const compareHref = `/espace-premium/comparer?m=${plans.slice(0, 3).map((p) => p.slug).join(",")}`;

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mes favoris</h1>
          <p className="mt-1 text-foreground/70">Gardez vos modèles préférés et comparez-en jusqu&apos;à trois côte à côte.</p>
        </div>
        {plans.length >= 2 ? <Link href={compareHref} className="btn-primary">Comparer {Math.min(plans.length, 3)} modèles</Link> : null}
      </div>
      {plans.length === 0 ? (
        <div className="card mt-8 p-8 text-center text-muted">
          Aucun favori pour l&apos;instant. Touchez le cœur ♡ sur un modèle pour l&apos;ajouter.
          <div className="mt-4"><Link href="/espace-premium" className="btn-ghost">Parcourir les modèles</Link></div>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => <PremiumPlanCard key={plan.id} plan={plan} favorite />)}
        </div>
      )}
    </div>
  );
}
