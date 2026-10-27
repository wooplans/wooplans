import Link from "next/link";
import { projectBalance, projectStartPrice, type CustomPlanOffer } from "@/lib/custom-plans";
import { formatFcfa, withPlanCount } from "@/lib/plans";
import type { FaqItem } from "@/components/Faq";
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
export function ProjectOffer({ plan, offer, planCount }: Props) {
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

      <a
        href={projectStartLink(plan)}
        target="_blank"
        rel="noopener noreferrer"
        data-cta="plan_projet"
        data-plan={plan.slug}
        className="btn-cta mt-5 w-full py-4 text-base"
      >
        Télécharger maintenant · {start}
      </a>

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
export function projectFaq({ plan, offer, planCount }: Props): FaqItem[] {
  const start = formatFcfa(projectStartPrice());
  const models = withPlanCount(planCount, "modèles", "tous les");
  return [
    {
      question: "Que contient le plan et devis que je télécharge ?",
      answer: `Un document PDF du modèle ${plan.code}, disponible dès le paiement : le plan de distribution de chaque niveau avec les dimensions, le tableau des pièces et de leurs surfaces, et le devis estimatif de construction poste par poste (fondation, élévation, toiture, finitions…). Vous recevez aussi notre numéro WhatsApp pour discuter avec nos architectes des modifications que vous souhaitez. Ce document sert à choisir et à préparer votre projet : ce n'est pas encore le dossier pour construire.`,
    },
    {
      question: "Que sont les plans complets personnalisés ?",
      answer: `Le dossier que vous remettez à vos techniciens pour construire : ${offer.deliverables.map((d) => d.charAt(0).toLowerCase() + d.slice(1)).join(", ")}. Nos architectes adaptent le modèle à votre terrain et à vos besoins (une chambre en plus ou en moins, un garage…). Prix fixe : ${formatFcfa(offer.price)} pour ce modèle.`,
    },
    {
      question: "Le prix du plan et devis est-il déduit des plans complets ?",
      answer: `Oui. Les ${start} du modèle que vous choisissez sont déduits de ses plans complets : il reste ${formatFcfa(projectBalance(offer))} à payer.`,
    },
    {
      question: "Puis-je télécharger le plan et devis de plusieurs modèles ?",
      answer: `Oui, c'est même conseillé pour comparer avant de vous décider : chaque modèle coûte ${start}. Si plus de 3 modèles vous intéressent, le Catalogue Premium est plus avantageux.`,
    },
    {
      question: "Que contient le Catalogue Premium ?",
      answer: `Les plans de distribution et les devis détaillés de ${models}, pour ${formatFcfa(cataloguePrice())} en paiement unique, avec un accès à vie et les nouveaux modèles inclus. Son prix est lui aussi déduit de vos plans complets.`,
    },
  ];
}
