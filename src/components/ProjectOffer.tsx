import Link from "next/link";
import { projectBalance, projectStartPrice, type CustomPlanOffer } from "@/lib/custom-plans";
import { formatFcfa, withPlanCount } from "@/lib/plans";
import { cataloguePrice, SITE, whatsappLink } from "@/lib/site";

type Props = {
  plan: { slug: string; code: string; name: string };
  offer: CustomPlanOffer;
  planCount: number | null;
};

/** Message WhatsApp de l'étape 1, en attendant le paiement en ligne de « Démarrer mon projet ». */
export function projectStartLink(plan: Props["plan"]) {
  return whatsappLink(`Bonjour WOOPLANS, je veux démarrer mon projet sur le modèle ${plan.code} (${plan.name}).`);
}

/**
 * Offre d'une fiche modèle, présentée comme un parcours en 2 étapes vers les plans complets
 * personnalisés : tout ce qui est payé en chemin est déduit. Le catalogue reste l'alternative
 * pour qui hésite entre plusieurs modèles.
 */
export function ProjectOffer({ plan, offer, planCount }: Props) {
  const start = formatFcfa(projectStartPrice());
  return (
    <div className="mt-6 rounded-2xl border-2 border-highlight/70 bg-highlight/10 p-5">
      <p className="text-sm font-medium text-muted">Ce modèle vous plaît ?</p>
      <h2 className="mt-1 text-xl font-bold tracking-tight">Faites-en votre maison, en 2 étapes</h2>

      <ol className="mt-4 space-y-4">
        <li className="flex gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-white">1</span>
          <div>
            <p className="font-semibold">
              Démarrez votre projet <span className="whitespace-nowrap text-primary">· {start}</span>
            </p>
            <ul className="mt-1.5 space-y-1 text-sm text-foreground/80">
              <li className="flex gap-2">
                <span className="text-primary" aria-hidden>✓</span>
                La fiche complète de ce modèle : distribution cotée, surface de chaque pièce, devis détaillé
              </li>
              <li className="flex gap-2">
                <span className="text-primary" aria-hidden>✓</span>
                Notre WhatsApp pour parler de vos modifications avec l&apos;architecte
              </li>
            </ul>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-primary text-sm font-bold text-primary">2</span>
          <div>
            <p className="font-semibold">
              Recevez vos plans complets personnalisés <span className="whitespace-nowrap text-primary">· {formatFcfa(offer.price)}</span>
            </p>
            <p className="mt-1.5 text-sm text-foreground/80">
              Adaptés à votre terrain et à votre famille (une chambre en plus, un garage…) : fondation, distribution, façades,
              coupes, toiture et fosse septique.
            </p>
          </div>
        </li>
      </ol>

      <a
        href={projectStartLink(plan)}
        target="_blank"
        rel="noopener noreferrer"
        data-cta="plan_projet"
        data-plan={plan.slug}
        className="btn-cta mt-5 w-full py-4 text-base"
      >
        Démarrer mon projet · {start}
      </a>
      <p className="mt-2 text-center text-xs text-muted">
        Les {start} sont déduits de vos plans complets : il reste {formatFcfa(projectBalance(offer))} à payer.
      </p>

      <p className="mt-5 border-t border-highlight/50 pt-4 text-sm text-foreground/75">
        Vous hésitez entre plusieurs modèles ?{" "}
        <Link href={SITE.catalogueUrl} data-cta="plan_catalogue" data-plan={plan.slug} className="font-semibold text-primary hover:underline">
          Le Catalogue Premium
        </Link>{" "}
        réunit les fiches de {withPlanCount(planCount, "modèles", "tous les")} : {formatFcfa(cataloguePrice())}, déduits eux aussi de vos plans.
      </p>
    </div>
  );
}
