import Link from "next/link";
import { GUIDE, GUIDE_PATH } from "@/lib/guide";
import { formatFcfa } from "@/lib/plans";

/**
 * Entrée du tunnel pour les visiteurs pas encore décidés : le Guide WooPlans des maisons (src/config/guide.json).
 * « compact » : une ligne dans une fiche modèle ; sinon un bandeau.
 */
export function GuideBand({ ctaId, compact = false }: { ctaId: string; compact?: boolean }) {
  const href = `${GUIDE_PATH}?utm_source=site&utm_medium=bandeau&utm_campaign=${encodeURIComponent(ctaId)}`;
  if (compact) {
    return (
      <p className="mt-4 rounded-xl bg-primary/5 px-4 py-3 text-sm text-foreground/80">
        Pas encore décidé ? Commencez par le <strong>Guide WooPlans des maisons</strong> : {GUIDE.announcedModels} modèles avec leur surface, leur
        terrain et leur budget.{" "}
        <Link href={href} data-cta={ctaId} className="font-semibold text-primary hover:underline">
          Guide PDF à {formatFcfa(GUIDE.price)} →
        </Link>
      </p>
    );
  }
  return (
    <section className="container-page py-10">
      <div className="flex flex-col items-start gap-5 rounded-2xl border-2 border-highlight/70 bg-highlight/10 p-6 md:flex-row md:items-center md:justify-between md:p-8">
        <div className="max-w-2xl">
          <p className="eyebrow">Nouveau · Guide PDF</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">Quelle maison pouvez-vous construire avec votre budget ?</h2>
          <p className="mt-2 text-foreground/75">
            Le Guide WooPlans des maisons classe {GUIDE.announcedModels} villas et duplex par budget de construction, avec la surface et le
            terrain conseillé de chacun.
          </p>
        </div>
        <Link href={href} data-cta={ctaId} className="btn-cta shrink-0 px-7 py-4 text-base">
          Le guide à {formatFcfa(GUIDE.price)}
        </Link>
      </div>
    </section>
  );
}
