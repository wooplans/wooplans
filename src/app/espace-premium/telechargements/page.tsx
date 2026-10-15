import { requireMember } from "@/lib/auth";
import { CATEGORY_LABELS, listPremiumPlans } from "@/lib/plans";
import { privateFileUrl } from "@/lib/premium";
import { getSetting } from "@/lib/settings";

type CatalogueFile = { key: string; label: string; updatedAt?: string };

export default async function DownloadsPage() {
  await requireMember();
  const [plans, files] = await Promise.all([listPremiumPlans(), getSetting<CatalogueFile[]>("catalogue_files", [])]);
  return (
    <div className="container-page max-w-2xl py-8">
      <h1 className="text-2xl font-bold tracking-tight">Fiches PDF</h1>
      <p className="mt-1 text-foreground/70">
        Une fiche par modèle : rendus, distributions cotées, pièces et devis. Elle est créée à partir de la fiche en ligne au moment du
        téléchargement, donc toujours à jour, et marquée à votre nom. Les nouveaux modèles apparaissent ici automatiquement.
      </p>
      <div className="mt-8 grid gap-3">
        {plans.map((plan) => (
          <a key={plan.id} href={`/api/premium/fiche-pdf/${plan.slug}`} data-pdf={plan.code} className="card flex items-center justify-between gap-4 p-4 hover:border-primary">
            <span>
              <span className="block font-semibold">{plan.name}</span>
              <span className="text-sm text-muted">
                {CATEGORY_LABELS[plan.category]} · {plan.bedrooms} ch. · {plan.surfaceTotal ? `${plan.surfaceTotal} m²` : "surface à venir"}
              </span>
            </span>
            <span className="btn-primary whitespace-nowrap px-4 py-2 text-sm">Télécharger</span>
          </a>
        ))}
      </div>
      {files.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Catalogue complet (ancienne édition)</h2>
          <div className="mt-3 grid gap-3">
            {files.map((file) => (
              <a key={file.key} href={privateFileUrl(file.key, true)} className="card flex items-center justify-between gap-4 p-4 hover:border-primary">
                <span className="font-semibold">{file.label}</span>
                <span className="btn-ghost px-4 py-2 text-sm">Télécharger</span>
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
