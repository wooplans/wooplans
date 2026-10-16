import { requireMember } from "@/lib/auth";
import { getPdfQuota } from "@/lib/pdf-quota";
import { CATEGORY_LABELS, listPremiumPlans } from "@/lib/plans";
import { privateFileUrl } from "@/lib/premium";
import { getSetting } from "@/lib/settings";

type CatalogueFile = { key: string; label: string; updatedAt?: string };

const QUOTA_MESSAGES: Record<string, string> = {
  day: "Vous avez atteint le nombre de nouvelles fiches téléchargeables en 24 heures.",
  month: "Vous avez atteint le nombre de nouvelles fiches téléchargeables sur 30 jours.",
  burst: "Trop de téléchargements en peu de temps : le téléchargement est suspendu temporairement.",
};

const fmtWhen = (ms: number) =>
  new Date(ms).toLocaleString("fr-FR", { timeZone: "Africa/Douala", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

export default async function DownloadsPage({ searchParams }: { searchParams: Promise<{ quota?: string; le?: string }> }) {
  const member = await requireMember();
  const { quota: blocked, le } = await searchParams;
  const [plans, files, quota] = await Promise.all([
    listPremiumPlans(),
    getSetting<CatalogueFile[]>("catalogue_files", []),
    getPdfQuota(member.id),
  ]);
  const owned = new Set(quota.ownedSlugs);
  const retry = Number(le);
  return (
    <div className="container-page max-w-2xl py-8">
      <h1 className="text-2xl font-bold tracking-tight">Fiches PDF</h1>
      <p className="mt-1 text-foreground/70">
        Une fiche par modèle : rendus, distributions cotées, pièces et devis. Elle est créée à partir de la fiche en ligne au moment du
        téléchargement, donc toujours à jour, et marquée à votre nom. Les nouveaux modèles apparaissent ici automatiquement.
      </p>

      {blocked && QUOTA_MESSAGES[blocked] ? (
        <div className="mt-6 rounded-2xl border border-secondary/40 bg-secondary/10 p-4 text-sm">
          <p className="font-semibold">{QUOTA_MESSAGES[blocked]}</p>
          <p className="mt-1 text-foreground/75">
            {Number.isFinite(retry) && retry > Date.now() ? `Vous pourrez en télécharger une nouvelle à partir du ${fmtWhen(retry)}. ` : ""}
            Les fiches déjà téléchargées restent disponibles, et tous les modèles restent consultables en ligne dans votre espace.
          </p>
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl bg-background p-4 text-sm text-foreground/80">
        <p>
          <strong>
            {quota.remainingMonth} nouvelle{quota.remainingMonth > 1 ? "s" : ""} fiche{quota.remainingMonth > 1 ? "s" : ""}
          </strong>{" "}
          disponible{quota.remainingMonth > 1 ? "s" : ""} sur 30 jours (jusqu&apos;à {quota.limits.perDay} par jour). Re-télécharger une fiche déjà
          obtenue ne compte pas.
        </p>
        <p className="mt-2 text-xs text-muted">
          Usage personnel uniquement : vous pouvez imprimer votre fiche ou l&apos;envoyer en privé à un proche ou à votre entrepreneur.
          Publication sur les réseaux sociaux, revente et usage commercial ou publicitaire sont interdits. Chaque fiche porte votre nom et
          un identifiant unique, visibles sur les pages et dans les images.
        </p>
      </div>

      <div className="mt-6 grid gap-3">
        {plans.map((plan) => (
          <a key={plan.id} href={`/api/premium/fiche-pdf/${plan.slug}`} data-pdf={plan.code} className="card flex items-center justify-between gap-4 p-4 hover:border-primary">
            <span>
              <span className="block font-semibold">{plan.name}</span>
              <span className="text-sm text-muted">
                {CATEGORY_LABELS[plan.category]} · {plan.bedrooms} ch. · {plan.surfaceTotal ? `${plan.surfaceTotal} m²` : "surface à venir"}
              </span>
            </span>
            {owned.has(plan.slug) ? (
              <span className="btn-ghost whitespace-nowrap px-4 py-2 text-sm">Re-télécharger</span>
            ) : (
              <span className="btn-primary whitespace-nowrap px-4 py-2 text-sm">Télécharger</span>
            )}
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
