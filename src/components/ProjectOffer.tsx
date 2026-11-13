import Link from "next/link";
import { LocalAnchor, LocalPriceText } from "@/components/LocalPrice";
import { planGiftEnabled, type CustomPlanOffer } from "@/lib/custom-plans";
import { formatFcfa, withPlanCount } from "@/lib/plans";
import type { FaqItem } from "@/components/Faq";
import { GiftPlanButton } from "@/components/GiftPlanButton";
import { IfOffre } from "@/components/IfOffre";
import { offresEnabled } from "@/lib/offres";
import { PlanDevisButton } from "@/components/PlanDevisButton";
import { PriceCountdown } from "@/components/PriceCountdown";
import { cataloguePrice, SITE, whatsappLink } from "@/lib/site";

type Props = {
  plan: { slug: string; code: string; name: string };
  offer: CustomPlanOffer;
  planCount: number | null;
  /** Paiement en ligne disponible (produit Chariow configuré) ; sinon le bouton ouvre WhatsApp. */
  online: boolean;
  /** Nombre réel de plans et devis téléchargés (tous modèles), affiché à partir de MIN_DOWNLOADS_SHOWN. */
  downloads?: number | null;
};

/** En dessous, le compteur de téléchargements n'est pas affiché (un petit nombre dessert l'offre). */
const MIN_DOWNLOADS_SHOWN = 50;

/** Moyens de paiement affichés sous le prix (paiement Chariow / Wajub). */
export const PAYMENT_METHODS = [
  { label: "Orange Money", className: "bg-[#ff7900] text-white" },
  { label: "MTN MoMo", className: "bg-[#ffcb05] text-[#1d2a30]" },
  { label: "Wave", className: "bg-[#1dc8ff] text-[#0b2a4a]" },
  { label: "Moov Money", className: "bg-[#0a4ea2] text-white" },
];

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

/**
 * Ce que l'acheteur reçoit (carte de la fiche) : 3 points, puis le bonus Catalogue Premium (BonusItem).
 * Le 3e point répond à « et si le plan ne me convient pas ? » : l'acheteur est accompagné sur WhatsApp
 * (les modifications et les plans complets sont payants : voir la FAQ, sans promettre de gratuité ici).
 */
export const PLAN_DEVIS_ITEMS = [
  "Plan de distribution + dimensions",
  "Devis de la fondation aux finitions",
  "Accompagnement WhatsApp : on adapte le plan à votre terrain et à vos besoins",
];

/** Nombre d'autres modèles du catalogue (« 97 autres plans et devis »), ou null si le total est inconnu. */
export function otherPlansCount(planCount: number | null) {
  return planCount && planCount > 1 ? planCount - 1 : null;
}

/** 3e point de la carte : le Catalogue Premium offert (détaillé plus bas, section #bonus), si l'offre du visiteur est active. */
function BonusItem() {
  return (
    <IfOffre>
      <li className="flex items-center gap-3 rounded-xl border border-dashed border-primary/50 bg-background/70 px-2.5 py-2">
        <span className="grid h-[26px] w-[26px] shrink-0 place-items-center text-lg" aria-hidden>🎁</span>
        <a href="#bonus" className="font-bold text-primary">Bonus : Catalogue Premium offert</a>
      </li>
    </IfOffre>
  );
}

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
 * Les détails (contenu, plans complets, catalogue) sont dans la FAQ du modèle : voir projectFaq.
 */
export function ProjectOffer({ plan, planCount, online, downloads }: Props) {
  // Plan et devis offert (src/config/projet.json) : carte du cadeau, avec un lien vers le Catalogue Premium.
  if (planGiftEnabled()) return <GiftOffer plan={plan} planCount={planCount} />;
  const shownDownloads = downloads && downloads >= MIN_DOWNLOADS_SHOWN ? downloads : null;
  return (
    <div id="offre" className="mt-5 scroll-mt-20 rounded-2xl border-2 border-highlight/70 bg-highlight/10 p-4 sm:p-5">
      <h2 className="text-xl font-extrabold leading-tight tracking-tight sm:text-2xl">
        Recevez le plan et le devis <span className="text-primary">du modèle {plan.code}</span>
      </h2>
      {/* Carte sobre : le budget de construction est dans « Caractéristiques », plus bas. */}

      <NumberedList items={PLAN_DEVIS_ITEMS}>
        <BonusItem />
      </NumberedList>

      {/* Achat : prix et compte à rebours juste au-dessus du bouton, moyens de paiement et réassurance juste en dessous. */}
      <div className="mt-5 border-t border-highlight/50 pt-4 text-center">
        <p className="flex flex-wrap items-baseline justify-center gap-x-2.5 text-3xl font-bold tracking-tight">
          {/* Prix local du visiteur (Afrique de l'Ouest, Guinée, RD Congo…) : le montant du paiement Chariow. */}
          <LocalAnchor className="text-lg font-semibold text-foreground/50" />
          <span>
            <LocalPriceText part="amount" /> <span className="text-base font-medium"><LocalPriceText part="currency" /></span>
          </span>
        </p>
        <PriceCountdown className="mt-0.5" />
        {/* Repère de la barre fixe du bas : elle n'apparaît qu'une fois ce bouton dépassé (StickyOfferBar). */}
        <div id="offre-bouton" className="mt-3">
          <PlanDevisButton
            plan={plan}
            label="Recevoir mon plan et devis"
            ctaId="plan_projet"
            className="btn-cta w-full px-4 py-3.5 text-base"
            fallbackHref={online ? undefined : projectStartLink(plan)}
          />
        </div>
        <PaymentMethods className="mt-2.5 justify-center" />
        <Reassurance className="mt-3" />
        {shownDownloads ? (
          <p className="mt-2 text-sm text-foreground/80">
            <strong>{shownDownloads.toLocaleString("fr-FR")}</strong> plans et devis déjà téléchargés
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Sous le bouton : le document s'ouvre au téléchargement dès le paiement validé, même si l'email saisi n'est pas valide,
 * et il est aussi envoyé sur WhatsApp (envoi depuis l'admin, page Ventes) : beaucoup d'acheteurs n'utilisent pas leur email.
 */
export function Reassurance({ className = "" }: { className?: string }) {
  return (
    <p className={`text-sm leading-snug text-foreground/75 ${className}`}>
      ⚡ Téléchargement immédiat après paiement
      <br />
      Reçu aussi par email et sur votre WhatsApp
    </p>
  );
}

/** Liste numérotée ① ② ③ de ce que contient le plan et devis. */
export function NumberedList({ items, children }: { items: readonly string[]; children?: React.ReactNode }) {
  return (
    <ol className="mt-4 space-y-3 text-base leading-snug text-foreground/90">
      {items.map((item, i) => (
        <li key={item} className="flex items-center gap-3">
          <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border border-foreground/60 text-[13px] font-semibold" aria-hidden>
            {i + 1}
          </span>
          <span>{item}</span>
        </li>
      ))}
      {children}
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
        answer: `${formatFcfa(offer.price)}, prix fixe : nos architectes adaptent le modèle à votre terrain et à vos besoins (une chambre en plus ou en moins, un garage…). Le même prix pour tous, sans supplément.`,
      },
    ];
  }
  return [
    {
      question: "Comment je reçois mon plan après l'achat ?",
      answer: `Dès que le paiement est validé, le plan et devis du modèle ${plan.code} s'ouvre au téléchargement : vous l'avez tout de suite. Il vous est aussi envoyé par email et sur votre WhatsApp. Même si vous n'utilisez pas votre adresse email, vous recevez tout sur WhatsApp : l'email n'est qu'une option.`,
    },
    ...(offresEnabled() ? [{
      question: "C'est quoi le Catalogue Premium offert ?",
      answer: `C'est l'espace membre qui réunit les plans et devis de ${models} : distributions cotées, surfaces des pièces et devis détaillés. Il est offert avec le plan et devis du modèle ${plan.code} : vous y retrouvez votre plan, prêt à télécharger, et vous pouvez le comparer avec tous les autres avant de choisir. Accès à vie, nouveaux modèles inclus.`,
    }] : []),
    {
      question: "Quels sont les moyens de paiement ?",
      answer: "Le paiement est sécurisé, par Mobile Money ou par carte bancaire.",
    },
    {
      question: "C'est quoi exactement le plan et devis ?",
      answer: `Le document pour valider votre projet avant de construire : le plan de distribution de chaque niveau avec les dimensions, le tableau des pièces et de leurs surfaces, et le devis estimatif poste par poste (fondation, élévation, toiture, finitions…). Il vous permet aussi d'échanger avec un architecte sur WhatsApp pour préparer les ajustements selon vos besoins et votre terrain.`,
    },
    {
      question: "Comment se passe l'accompagnement sur WhatsApp après mon achat ?",
      answer: `Après votre achat, nous vous contactons sur WhatsApp (vous pouvez aussi nous écrire). Vous échangez avec nos architectes sur votre terrain et vos besoins : une chambre en plus ou en moins, un garage, une autre disposition… Le plan peut être modifié et adapté à votre projet. Ces modifications, comme les plans complets pour construire (${formatFcfa(offer.price)}, prix fixe), nécessitent des frais supplémentaires : ils vous sont annoncés avant tout travail.`,
    },
  ];
}
