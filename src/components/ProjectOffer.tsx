import Link from "next/link";
import { memberBalance, planGiftEnabled, projectBalance, projectStartPrice, type CustomPlanOffer } from "@/lib/custom-plans";
import { formatFcfa, withPlanCount } from "@/lib/plans";
import type { FaqItem } from "@/components/Faq";
import { GiftPlanButton } from "@/components/GiftPlanButton";
import { PlanDevisButton } from "@/components/PlanDevisButton";
import { cataloguePrice, SITE, whatsappLink } from "@/lib/site";

type Props = {
  plan: { slug: string; code: string; name: string };
  offer: CustomPlanOffer;
  planCount: number | null;
  /** Paiement en ligne disponible (produit Chariow configuré) ; sinon le bouton ouvre WhatsApp. */
  online: boolean;
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

/** Plan et devis offert : contenu du cadeau. */
const GIFT_ITEMS = ["Plan de distribution avec les dimensions", "Devis fondation, élévation, toiture, etc.", "Envoyé par email en quelques minutes"];

function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 space-y-1.5 text-sm leading-snug text-foreground/80">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="w-4 shrink-0 font-bold text-primary" aria-hidden>✓</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Prix d'une étape, sur sa propre ligne : évite un « · prix » orphelin quand le titre passe à la ligne. */
function Price({ value }: { value: string }) {
  return (
    <span className="mt-1 inline-block whitespace-nowrap rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-bold text-primary">
      {value}
    </span>
  );
}

/**
 * Offre d'une fiche modèle, en 2 étapes : télécharger le plan et le devis du modèle (on peut en
 * télécharger plusieurs avant de se décider), puis obtenir les plans complets personnalisés.
 * Les détails (contenu, déduction, catalogue) sont dans la FAQ du modèle : voir projectFaq.
 */
export function ProjectOffer({ plan, offer, planCount, online }: Props) {
  const start = formatFcfa(projectStartPrice());
  // Plan et devis offert (src/config/projet.json) : carte du cadeau, avec un lien vers le Catalogue Premium.
  if (planGiftEnabled()) return <GiftOffer plan={plan} planCount={planCount} />;
  return (
    <div className="mt-6 rounded-2xl border-2 border-highlight/70 bg-highlight/10 p-4 sm:p-5">
      <h2 className="text-lg font-bold leading-snug tracking-tight sm:text-xl">
        Ce modèle <span className="whitespace-nowrap">{plan.code}</span> vous intéresse ?
      </h2>

      <ol className="mt-4 space-y-5">
        <li className="flex gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-white">1</span>
          <div className="min-w-0">
            <p className="font-semibold leading-snug">Téléchargez son plan et devis</p>
            <Price value={start} />
            <Checklist items={STEP_ONE} />
          </div>
        </li>
        <li className="flex gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-primary text-sm font-bold text-primary">2</span>
          <div className="min-w-0">
            <p className="font-semibold leading-snug">Obtenez les plans complets</p>
            <Price value={formatFcfa(offer.price)} />
            <Checklist items={STEP_TWO} />
          </div>
        </li>
      </ol>

      <PlanDevisButton
        plan={plan}
        label={`Télécharger · ${start.replace(/ /g, "\u00a0")}`}
        price={start}
        ctaId="plan_projet"
        className="btn-cta mt-5 w-full px-4 py-3.5 text-base"
        fallbackHref={online ? undefined : projectStartLink(plan)}
      />

      <p className="mt-4 border-t border-highlight/50 pt-3 text-center text-xs leading-relaxed text-foreground/75 sm:text-sm">
        Vous hésitez entre plusieurs modèles ?{" "}
        <Link href={SITE.catalogueUrl} data-cta="plan_catalogue" data-plan={plan.slug} className="font-semibold text-primary hover:underline">
          Le Catalogue Premium
        </Link>{" "}
        réunit les plans et devis de {withPlanCount(planCount, "modèles", "tous les")} :{" "}
        <span className="whitespace-nowrap font-semibold">{formatFcfa(cataloguePrice())}</span>.
      </p>
    </div>
  );
}

/**
 * Carte de la fiche avec le plan et devis offert : une seule décision (recevoir le cadeau), puis une ligne
 * discrète vers le Catalogue Premium. Les plans complets restent dans la FAQ, le menu et les emails :
 * trois prix sur la même carte (gratuit, catalogue, plans complets) brouilleraient le premier pas.
 */
function GiftOffer({ plan, planCount }: Omit<Props, "online" | "offer">) {
  return (
    <div className="mt-6 rounded-2xl border-2 border-highlight/70 bg-highlight/10 p-4 sm:p-5">
      <h2 className="text-lg font-bold leading-snug tracking-tight sm:text-xl">
        Recevez gratuitement le plan et devis du modèle <span className="whitespace-nowrap">{plan.code}</span>
      </h2>
      <Checklist items={GIFT_ITEMS} />
      <GiftPlanButton plan={plan} label="Recevoir gratuitement" ctaId="plan_cadeau" className="btn-cta mt-4 w-full px-4 py-3.5 text-base" />
      <p className="mt-4 border-t border-highlight/50 pt-3 text-center text-xs leading-relaxed text-foreground/75 sm:text-sm">
        Plusieurs modèles vous intéressent ?{" "}
        <Link href={SITE.catalogueUrl} data-cta="plan_catalogue" data-plan={plan.slug} className="font-semibold text-primary hover:underline">
          Le Catalogue Premium
        </Link>{" "}
        réunit les plans et devis de {withPlanCount(planCount, "modèles", "tous les")} :{" "}
        <span className="whitespace-nowrap font-semibold">{formatFcfa(cataloguePrice())}</span>.
      </p>
    </div>
  );
}

/** FAQ du modèle : remplace les blocs « Distribution cotée » et « Plans complets personnalisés ». */
export function projectFaq({ plan, offer, planCount }: Omit<Props, "online">): FaqItem[] {
  const start = formatFcfa(projectStartPrice());
  const catalogue = formatFcfa(cataloguePrice());
  const models = withPlanCount(planCount, "modèles", "tous les");
  const deliverables = offer.deliverables.map((d) => d.charAt(0).toLowerCase() + d.slice(1)).join(", ");
  if (planGiftEnabled()) {
    return [
      {
        question: "Le plan et devis est-il vraiment gratuit ?",
        answer: `Oui. Indiquez votre nom et votre email : le plan et devis du modèle ${plan.code} vous est envoyé en quelques minutes, sans paiement. Un plan et devis est offert par adresse email. Pensez à regarder dans l'onglet Promotions ou dans les spams.`,
      },
      {
        question: "Que contient le plan et devis offert ?",
        answer: `Un document PDF du modèle ${plan.code}, marqué à votre nom : le plan de distribution de chaque niveau avec les dimensions, le tableau des pièces et de leurs surfaces, le terrain minimum estimé (avec les reculs) et le devis estimatif de construction poste par poste (fondation, élévation, toiture, finitions…).`,
      },
      {
        question: "Puis-je construire avec ce plan et devis ?",
        answer: `Non. Il sert à vérifier que le modèle vous convient et à estimer votre budget. Pour construire, il faut les plans complets : ${deliverables}.`,
      },
      {
        question: "Plusieurs modèles m'intéressent, comment les comparer ?",
        answer: `Le Catalogue Premium réunit les plans et devis de ${models}, pour ${catalogue} en paiement unique, avec un accès à vie et les nouveaux modèles inclus.`,
      },
      {
        question: "Combien coûtent les plans complets de ce modèle ?",
        answer: `${formatFcfa(offer.price)}, prix fixe : nos architectes adaptent le modèle à votre terrain et à vos besoins (une chambre en plus ou en moins, un garage…). Si vous avez le Catalogue Premium, ses ${catalogue} sont déduits : il reste ${formatFcfa(memberBalance(offer))} à payer.`,
      },
    ];
  }
  return [
    {
      question: "Que contient le plan et devis que je télécharge ?",
      answer: `Un document PDF du modèle ${plan.code}, disponible dès le paiement : le plan de distribution de chaque niveau avec les dimensions, le tableau des pièces et de leurs surfaces, et le devis estimatif de construction poste par poste (fondation, élévation, toiture, finitions…). Vous recevez aussi notre numéro WhatsApp pour discuter avec nos architectes des modifications que vous souhaitez. Vous pouvez télécharger le plan et devis de plusieurs modèles pour les comparer.`,
    },
    {
      question: "C'est quoi les plans complets personnalisés ?",
      answer: `Le dossier que vous remettez à vos techniciens pour construire : ${deliverables}. Nos architectes adaptent le modèle à votre terrain et à vos besoins (une chambre en plus ou en moins, un garage…). Prix fixe : ${formatFcfa(offer.price)} pour ce modèle. Les ${start} de son plan et devis sont déduits : il reste ${formatFcfa(projectBalance(offer))} à payer.`,
    },
    {
      question: "Que contient le Catalogue Premium ?",
      answer: `Les plans de distribution et les devis détaillés de ${models}, pour ${catalogue} en paiement unique, avec un accès à vie et les nouveaux modèles inclus. Idéal si plusieurs modèles vous intéressent. Son prix est lui aussi déduit de vos plans complets.`,
    },
  ];
}
