import Link from "next/link";
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
  lifetime: "Vous avez atteint le nombre maximal de fiches PDF de votre abonnement : les téléchargements sont désormais bloqués.",
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
  // Seules les fiches déjà téléchargées sont listées, de la plus récente à la plus ancienne :
  // un nouveau modèle se télécharge depuis sa page, une fiche à la fois.
  const bySlug = new Map(plans.map((p) => [p.slug, p]));
  const downloaded = quota.ownedSlugs.map((slug) => bySlug.get(slug)).filter((p) => p !== undefined);
  const lifetimeBlocked = quota.remainingLifetime === 0;
  const retry = Number(le);
  return (
    <div className="container-page max-w-2xl py-8">
      <h1 className="text-2xl font-bold tracking-tight">Fiches PDF</h1>

      {blocked && QUOTA_MESSAGES[blocked] ? (
        <div className="mt-6 rounded-2xl border border-secondary/40 bg-secondary/10 p-4 text-sm">
          <p className="font-semibold">{QUOTA_MESSAGES[blocked]}</p>
          {Number.isFinite(retry) && retry > Date.now() ? (
            <p className="mt-1 text-foreground/75">Prochaine fiche possible le {fmtWhen(retry)}.</p>
          ) : null}
        </div>
      ) : null}

      {downloaded.length === 0 ? (
        <p className="card mt-6 p-6 text-sm text-foreground/75">
          Aucune fiche téléchargée pour le moment. Ouvrez un modèle depuis le{" "}
          <Link href="/espace-premium" className="font-semibold text-primary">catalogue</Link> et cliquez sur « Fiche PDF ».
        </p>
      ) : null}
      <div className="mt-6 grid gap-3">
        {downloaded.map((plan) => {
          // Modèle payé (offre avec catalogue offert) : jamais téléchargé encore → « Télécharger », hors quota.
          const purchased = quota.purchasedSlugs.has(plan.slug);
          return (
          <a
            key={plan.id}
            href={`/api/premium/fiche-pdf/${plan.slug}`}
            data-pdf={plan.code}
            className={`card flex items-center justify-between gap-4 p-4 hover:border-primary ${purchased ? "border-2 border-primary/50 bg-primary/5" : ""}`}
          >
            <span>
              {purchased ? <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-primary">Votre plan et devis</span> : null}
              <span className="block font-semibold">{plan.name}</span>
              <span className="text-sm text-muted">
                {CATEGORY_LABELS[plan.category]} · {plan.bedrooms} ch. · {plan.surfaceTotal ? `${plan.surfaceTotal} m²` : "surface à venir"}
              </span>
            </span>
            <span className={`${purchased ? "btn-cta" : "btn-ghost"} whitespace-nowrap px-4 py-2 text-sm`}>
              {purchased ? "Télécharger" : lifetimeBlocked ? "Bloqué" : "Re-télécharger"}
            </span>
          </a>
          );
        })}
      </div>
      {/* Quota et règle d'usage en une ligne : le détail des limites est dans les messages de blocage. */}
      <p className="mt-6 text-center text-xs text-muted">
        {lifetimeBlocked
          ? "Nombre maximal de fiches atteint"
          : `${Math.min(quota.remainingMonth, quota.remainingLifetime)} nouvelle${quota.remainingMonth > 1 ? "s" : ""} fiche${quota.remainingMonth > 1 ? "s" : ""} disponible${quota.remainingMonth > 1 ? "s" : ""} ce mois-ci`}{" "}
        · Usage personnel, fiches marquées à votre nom
      </p>

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
