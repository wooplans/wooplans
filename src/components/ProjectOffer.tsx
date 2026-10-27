import Link from "next/link";
import { projectBalance, projectStartPrice, type CustomPlanOffer } from "@/lib/custom-plans";
import { formatFcfa, withPlanCount } from "@/lib/plans";
import type { FaqItem } from "@/components/Faq";
import { PlanDevisButton } from "@/components/PlanDevisButton";
import { cataloguePrice, SITE, whatsappLink } from "@/lib/site";

type Props = {
  plan: { slug: string; code: string; name: string };
  offer: CustomPlanOffer;
  planCount: number | null;
  /** Paiement en ligne disponible (produit Chariow configuré) ; sinon le bouton ouvre WhatsApp. */
  online: boolean;
  /** Pays du visiteur, présélectionné dans le formulaire d'achat. */
  country?: string | null;
};

/** Message WhatsApp de l'étape 1 quand le paiement en ligne du plan et devis n'est pas disponible. */
export function projectStartLink(plan: Props["plan"]) {
  return whatsappLink(`Bonjour WOOPLANS, je veux télécharger le plan et le devis du modèle ${plan.code} (${plan.name}).`);
}

const STEP_ONE = [
  "Plan de distribution avec les dimensions",
  "Devis fondation, élévation, toiture, etc.",
  "Discussion avec nos architectes sur WhatsApp",
  "Idéal pour préparer les modifications",
];

const STEP_TWO = ["Plans personnalisés selon vos besoins et votre terrain", "Dossier prêt à remettre à vos techniciens"];

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
 * Offre d'une fiche modèle, en 2 étapes : télécharger le plan et le devis du modèle (on peut en
 * télécharger plusieurs avant de se décider), puis obtenir les plans complets personnalisés.
 * Les détails (contenu, déduction, catalogue) sont dans la FAQ du modèle : voir projectFaq.
 */
export function ProjectOffer({ plan, offer, planCount, online, country }: Props) {
  const start = formatFcfa(projectStartPrice());
  return (
    <div className="mt-6 rounded-2xl border-2 border-highlight/70 bg-highlight/10 p-5">
      <h2 className="text-xl font-bold tracking-tight">Ce modèle {plan.code} vous intéresse ?</h2>

      <ol className="mt-4 space-y-4">
        <li className="flex gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-white">1</span>
          <div>
            <p className="font-semibold">
              Téléchargez son plan et devis <span className="whitespace-nowrap text-primary">· {start}</span>
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

      <PlanDevisButton
        plan={plan}
        label={`Télécharger maintenant · ${start}`}
        ctaId="plan_projet"
        className="btn-cta mt-5 w-full py-4 text-base"
        fallbackHref={online ? undefined : projectStartLink(plan)}
        defaultCountry={country}
      />

      <p className="mt-4 text-center text-sm text-foreground/75">
        Vous hésitez encore entre plusieurs modèles ?{" "}
        <Link href={SITE.catalogueUrl} data-cta="plan_catalogue" data-plan={plan.slug} className="font-semibold text-primary hover:underline">
          Le Catalogue Premium
        </Link>{" "}
        réunit les plans et devis de {withPlanCount(planCount, "modèles", "tous les")} : {formatFcfa(cataloguePrice())}.
      </p>
    </div>
  );
}

/** FAQ du modèle : remplace les blocs « Distribution cotée » et « Plans complets personnalisés ». */
export function projectFaq({ plan, offer, planCount }: Omit<Props, "online" | "country">): FaqItem[] {
  const start = formatFcfa(projectStartPrice());
  return [
    {
      question: "Que contient le plan et devis que je télécharge ?",
      answer: `Un document PDF du modèle ${plan.code}, disponible dès le paiement : le plan de distribution de chaque niveau avec les dimensions, le tableau des pièces et de leurs surfaces, et le devis estimatif de construction poste par poste (fondation, élévation, toiture, finitions…). Vous recevez aussi notre numéro WhatsApp pour discuter avec nos architectes des modifications que vous souhaitez. Vous pouvez télécharger le plan et devis de plusieurs modèles pour les comparer.`,
    },
    {
      question: "C'est quoi les plans complets personnalisés ?",
      answer: `Le dossier que vous remettez à vos techniciens pour construire : ${offer.deliverables.map((d) => d.charAt(0).toLowerCase() + d.slice(1)).join(", ")}. Nos architectes adaptent le modèle à votre terrain et à vos besoins (une chambre en plus ou en moins, un garage…). Prix fixe : ${formatFcfa(offer.price)} pour ce modèle. Les ${start} de son plan et devis sont déduits : il reste ${formatFcfa(projectBalance(offer))} à payer.`,
    },
    {
      question: "Que contient le Catalogue Premium ?",
      answer: `Les plans de distribution et les devis détaillés de ${withPlanCount(planCount, "modèles", "tous les")}, pour ${formatFcfa(cataloguePrice())} en paiement unique, avec un accès à vie et les nouveaux modèles inclus. Idéal si plusieurs modèles vous intéressent. Son prix est lui aussi déduit de vos plans complets.`,
    },
  ];
}
