import { PlanDevisButton } from "@/components/PlanDevisButton";
import { otherPlansCount, projectStartLink } from "@/components/ProjectOffer";
import { responsiveImage } from "@/lib/media-size";
import { formatFcfa } from "@/lib/plans";
import { cataloguePrice } from "@/lib/site";

type Props = {
  plan: { slug: string; code: string; name: string };
  planCount: number | null;
  /** Couvertures d'autres modèles (aperçu du catalogue). */
  covers: string[];
  online: boolean;
};

/**
 * Section « Bonus » de la fiche : explique le Catalogue Premium (celui dont parlent les témoignages vidéo)
 * et qu'il est offert avec le plan et devis du modèle. Placée juste après les témoignages.
 */
export function CatalogueBonus({ plan, planCount, covers, online }: Props) {
  const others = otherPlansCount(planCount);
  const shown = covers.slice(0, 3);
  const rest = others ? others - shown.length : 0;
  return (
    <section id="bonus" className="mt-12 scroll-mt-20 max-w-3xl">
      <div className="overflow-hidden rounded-2xl border-2 border-primary/30 bg-primary/5">
        <div className="p-4 sm:p-6">
          <p className="text-sm font-bold uppercase tracking-wide text-primary">🎁 Bonus offert avec votre plan</p>
          <h2 className="mt-1 text-xl font-extrabold leading-tight tracking-tight sm:text-2xl">
            Le Catalogue Premium : {others ? `${others} autres plans et devis` : "tous nos plans et devis"} pour comparer
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-foreground/80">
            C&apos;est le catalogue dont parlent nos clients dans les vidéos : il réunit les plans et devis de tous nos modèles de villas et
            duplex. Avec le plan et devis du modèle <strong className="whitespace-nowrap">{plan.code}</strong>, vous y avez accès{" "}
            <strong>gratuitement</strong> : votre plan vous y attend, prêt à télécharger, et vous pouvez le comparer avec tous les autres avant
            de choisir votre maison.
          </p>

          {shown.length > 0 ? (
            <div className="mt-4 grid grid-cols-3 gap-2" aria-hidden>
              {shown.map((src, i) => (
                <div key={src} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-foreground/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img {...responsiveImage(src, [320, 480], "33vw")} alt="" loading="lazy" className="h-full w-full object-cover" />
                  {i === shown.length - 1 && rest > 0 ? (
                    <span className="absolute inset-0 grid place-items-center bg-foreground/60 text-base font-bold text-white">+{rest}</span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          <ul className="mt-4 space-y-2 text-[15px] text-foreground/85">
            {[
              "Distributions cotées et surfaces de chaque pièce",
              "Devis détaillés, de la fondation aux finitions",
              "Accès à vie, nouveaux modèles inclus",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="font-bold text-primary" aria-hidden>✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-primary/20 bg-background/60 p-4 text-center sm:px-6">
          <p className="text-sm">
            Valeur : <s className="text-foreground/60">{formatFcfa(cataloguePrice())}</s>{" "}
            <strong className="text-base text-primary">→ offert avec votre plan et devis</strong>
          </p>
          <PlanDevisButton
            plan={plan}
            label="Mon plan + le catalogue offert"
            ctaId="plan_bonus"
            className="btn-cta mt-3 w-full px-4 py-3.5 text-base"
            fallbackHref={online ? undefined : projectStartLink(plan)}
          />
        </div>
      </div>
    </section>
  );
}
