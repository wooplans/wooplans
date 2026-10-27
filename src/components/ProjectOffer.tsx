import Link from "next/link";
import { projectBalance, projectStartPrice, type CustomPlanOffer } from "@/lib/custom-plans";
import { formatFcfa, withPlanCount } from "@/lib/plans";
import { cataloguePrice, SITE, whatsappLink } from "@/lib/site";

type Props = {
  plan: { slug: string; code: string; name: string };
  offer: CustomPlanOffer;
  planCount: number | null;
};

/** Message WhatsApp de l'étape 1, en attendant le paiement en ligne du plan et de son devis. */
export function projectStartLink(plan: Props["plan"]) {
  return whatsappLink(`Bonjour WOOPLANS, je veux télécharger le plan et le devis du modèle ${plan.code} (${plan.name}).`);
}

const STEP_ONE = [
  "Plan de distribution avec les dimensions et la surface de chaque pièce",
  "Devis poste par poste : fondation, élévation, toiture, finitions…",
  "Discussion avec nos architectes sur WhatsApp",
  "Idéal pour démarrer votre projet et préparer les modifications que vous souhaitez",
];

const STEP_TWO = [
  "Plans personnalisés selon vos besoins, après discussion avec nos architectes",
  "Dossier prêt à remettre à votre technicien pour la construction",
];

function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="mt-1.5 space-y-1 text-sm text-foreground/80">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="text-primary" aria-hidden>✓</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

/**
 * Offre d'une fiche modèle, en 2 étapes : télécharger le plan de distribution et le devis du
 * modèle (on peut en télécharger plusieurs avant de se décider), puis obtenir les plans complets
 * personnalisés, le prix du plan et devis du modèle choisi étant déduit. Le catalogue reste
 * l'alternative pour qui s'intéresse à plusieurs modèles.
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
              Téléchargez ce plan et son devis <span className="whitespace-nowrap text-primary">· {start}</span>
            </p>
            <Checklist items={STEP_ONE} />
          </div>
        </li>
        <li className="flex gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-primary text-sm font-bold text-primary">2</span>
          <div>
            <p className="font-semibold">
              Obtenez les plans complets <span className="whitespace-nowrap text-primary">· {formatFcfa(offer.price)}</span>
            </p>
            <Checklist items={STEP_TWO} />
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
        Télécharger ce plan et son devis · {start}
      </a>
      <p className="mt-2 text-center text-xs text-muted">
        Plusieurs modèles vous intéressent ? Téléchargez-en plusieurs avant de vous décider. Les {start} du modèle choisi
        sont déduits de ses plans complets : il reste {formatFcfa(projectBalance(offer))} à payer.
      </p>

      <p className="mt-5 border-t border-highlight/50 pt-4 text-sm text-foreground/75">
        Plus de 3 modèles vous intéressent ?{" "}
        <Link href={SITE.catalogueUrl} data-cta="plan_catalogue" data-plan={plan.slug} className="font-semibold text-primary hover:underline">
          Le Catalogue Premium
        </Link>{" "}
        réunit les plans et devis de {withPlanCount(planCount, "modèles", "tous les")} : {formatFcfa(cataloguePrice())}, déduits eux aussi de vos plans complets.
      </p>
    </div>
  );
}
