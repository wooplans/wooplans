import Link from "next/link";
import projet from "@/config/projet.json";
import { LocalAnchor, LocalPriceText } from "@/components/LocalPrice";
import { memberBalance, planGiftEnabled, type CustomPlanOffer } from "@/lib/custom-plans";
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
  /** Bouton et fenêtre « Aperçu du plan et devis » (PlanDevisPreview), rendus par la fiche. */
  preview?: React.ReactNode;
  /** Nombre réel de téléchargements du plan et devis (tous modèles), affiché comme preuve sociale. */
  downloads?: number | null;
};

/** En dessous, le compteur de téléchargements n'est pas affiché (un petit nombre dessert l'offre). */
const MIN_DOWNLOADS_SHOWN = 50;

/** Moyens de paiement affichés sous le prix (paiement Chariow / Wajub). */
export const PAYMENT_METHODS = [
  { label: "Orange Money", className: "bg-[#ff7900] text-white" },
  { label: "MTN MoMo", className: "bg-[#ffcb05] text-[#1d2a30]" },
  { label: "Wave", className: "bg-[#1dc8ff] text-[#0b2a4a]" },
];

/**
 * Note moyenne affichée sur les fiches : seulement si elle est renseignée dans src/config/projet.json
 * (« rating »: { "value": 4.9, "count": 120, "source": "avis clients Chariow" }) à partir d'avis réels et vérifiables.
 */
function projectRating() {
  const rating = (projet as { rating?: { value?: number; count?: number } | null }).rating;
  return rating?.value && rating.count ? { value: rating.value, count: rating.count } : null;
}

export function PaymentMethods({ className = "" }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap items-center gap-1.5 ${className}`} aria-label="Moyens de paiement">
      {PAYMENT_METHODS.map((m) => (
        <li key={m.label} className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${m.className}`}>
          {m.label}
        </li>
      ))}
    </ul>
  );
}

/** Message WhatsApp de l'étape 1 quand le paiement en ligne du plan et devis n'est pas disponible. */
export function projectStartLink(plan: Props["plan"]) {
  return whatsappLink(`Bonjour WOOPLANS, je veux télécharger le plan et le devis du modèle ${plan.code} (${plan.name}).`);
}

/** Ce que l'acheteur reçoit dès le paiement (carte de la fiche et formulaire de paiement). */
export const PLAN_DEVIS_ITEMS = [
  "Plan de distribution + dimensions",
  "Devis de la fondation aux finitions",
  "Discuter avec un architecte sur WhatsApp",
];

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

/**
 * Offre d'une fiche modèle, en 2 étapes : télécharger le plan et le devis du modèle (on peut en
 * télécharger plusieurs avant de se décider), puis obtenir les plans complets personnalisés.
 * Les détails (contenu, déduction, catalogue) sont dans la FAQ du modèle : voir projectFaq.
 */
export function ProjectOffer({ plan, planCount, online, preview, downloads }: Props) {
  // Plan et devis offert (src/config/projet.json) : carte du cadeau, avec un lien vers le Catalogue Premium.
  if (planGiftEnabled()) return <GiftOffer plan={plan} planCount={planCount} />;
  return (
    <div className="mt-6 rounded-2xl border-2 border-highlight/70 bg-highlight/10 p-4 sm:p-5">
      <p className="eyebrow">Plan et devis · {plan.code}</p>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-3xl font-bold tracking-tight">
        {/* Prix local du visiteur (Afrique de l'Ouest, Guinée, RD Congo…) : le montant du paiement Chariow. */}
        <LocalAnchor className="text-lg font-semibold text-foreground/50" />
        <span>
          <LocalPriceText part="amount" /> <span className="text-base font-medium"><LocalPriceText part="currency" /></span>
        </span>
      </p>
      <p className="mt-0.5 text-sm text-muted">Téléchargement instantané · paiement unique</p>
      <PaymentMethods className="mt-2" />

      <h2 className="mt-4 text-base font-bold">Ce que vous obtenez immédiatement</h2>
      <NumberedList items={PLAN_DEVIS_ITEMS} />

      <PlanDevisButton
        plan={plan}
        label="Recevoir mon plan et devis"
        ctaId="plan_projet"
        className="btn-cta mt-5 w-full px-4 py-3.5 text-base"
        fallbackHref={online ? undefined : projectStartLink(plan)}
      />
      {preview}
      <SocialProof downloads={downloads} />

      <p className="mt-4 border-t border-highlight/50 pt-3 text-center text-xs leading-relaxed text-foreground/75 sm:text-sm">
        Ensuite, si le modèle vous plaît, nos architectes l&apos;adaptent à votre terrain sur WhatsApp.
      </p>
    </div>
  );
}

/** Preuve sociale sous le bouton : note (si renseignée) et nombre réel de téléchargements. */
function SocialProof({ downloads }: { downloads?: number | null }) {
  const rating = projectRating();
  const shown = downloads && downloads >= MIN_DOWNLOADS_SHOWN ? downloads : null;
  if (!rating && !shown) return null;
  return (
    <p className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-foreground/80">
      {rating ? (
        <span>
          <span className="text-[#f5a623]" aria-hidden>★★★★★</span>{" "}
          <strong>{rating.value.toLocaleString("fr-FR")}/5</strong> ({rating.count.toLocaleString("fr-FR")} avis)
        </span>
      ) : null}
      {shown ? (
        <span>
          <strong>{shown.toLocaleString("fr-FR")}</strong> plans et devis déjà téléchargés
        </span>
      ) : null}
    </p>
  );
}

/** Liste numérotée ① ② ③ de ce que contient le plan et devis. */
export function NumberedList({ items }: { items: readonly string[] }) {
  return (
    <ol className="mt-2 space-y-2 text-sm leading-snug text-foreground/80">
      {items.map((item, i) => (
        <li key={item} className="flex gap-2.5">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-foreground/60 text-[11px] font-semibold" aria-hidden>
            {i + 1}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
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
      question: "Comment je reçois mon plan après l'achat ?",
      answer: `Dès que le paiement est validé, le plan et devis du modèle ${plan.code} s'ouvre au téléchargement et vous est envoyé par email. Pas besoin d'attendre.`,
    },
    {
      question: "Quels sont les moyens de paiement ?",
      answer: "Le paiement est sécurisé, par Mobile Money ou par carte bancaire.",
    },
    {
      question: "C'est quoi exactement le plan et devis ?",
      answer: `Le document pour valider votre projet avant de construire : le plan de distribution de chaque niveau avec les dimensions, le tableau des pièces et de leurs surfaces, et le devis estimatif poste par poste (fondation, élévation, toiture, finitions…). Il vous permet aussi d'échanger avec un architecte sur WhatsApp pour préparer les ajustements selon vos besoins et votre terrain.`,
    },
    {
      question: "Est-ce que je peux faire modifier le plan après l'avoir téléchargé ?",
      answer: "Oui. Après avoir obtenu le plan et devis de ce modèle, vous pourrez discuter sur WhatsApp avec nos architectes pour effectuer des modifications et obtenir tous les plans pour la construction.",
    },
  ];
}
