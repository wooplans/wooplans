import type { FaqItem } from "@/components/Faq";
import { formatFcfa } from "@/lib/plans";
import { CUSTOM_PLAN_OFFERS, memberBalance, planGiftEnabled } from "@/lib/custom-plans";
import { cataloguePrice } from "@/lib/site";

const [villa, duplex] = CUSTOM_PLAN_OFFERS;

/** Plan et devis offert sur les fiches : question affichée tant que le cadeau est actif (src/config/projet.json). */
const GIFT_FAQ: FaqItem[] = planGiftEnabled()
  ? [
      {
        question: "Puis-je voir un plan et devis avant d'acheter le catalogue ?",
        answer:
          "Oui. Sur la fiche de chaque modèle, demandez gratuitement son plan et devis : distribution avec les dimensions, surfaces des pièces, terrain minimum estimé et devis détaillé, envoyés par email en quelques minutes. Un plan et devis est offert par adresse email ; le Catalogue Premium réunit ceux de tous les modèles.",
      },
    ]
  : [];

export const CATALOGUE_FAQ: FaqItem[] = [
  {
    question: "Que contient exactement le Catalogue Premium ?",
    answer:
      "Tous les modèles de villas et duplex du catalogue. Pour chaque modèle : rendus 3D, caractéristiques, distributions cotées, surfaces (totale, emprise au sol, terrain nécessaire), devis estimatif détaillé par lot, hypothèses de coût, atouts et points d'attention. Tout est consultable dans votre espace Premium en ligne, et chaque modèle se télécharge en fiche PDF.",
  },
  ...GIFT_FAQ,
  {
    question: "Combien coûte le catalogue et combien de temps y ai-je accès ?",
    answer: `${formatFcfa(cataloguePrice())} en paiement unique. L'accès est à vie, y compris aux nouveaux modèles ajoutés au catalogue.`,
  },
  {
    question: "Comment est-ce que je reçois le catalogue après le paiement ?",
    answer:
      "Dès que le paiement Mobile Money ou carte est confirmé, votre code d'accès personnel s'affiche à l'écran et vous est envoyé par email. Avec votre email et ce code, vous vous connectez à l'espace Premium, où vous téléchargez la fiche PDF de chaque modèle.",
  },
  {
    question: "Les plans du catalogue suffisent-ils pour construire ?",
    answer:
      "Non. Les distributions et les estimations servent à comparer et à choisir le bon modèle. L'adaptation à votre terrain et le dossier technique complet (plans d'exécution) sont une prestation distincte, que nous réalisons sur demande.",
  },
  {
    question: "Le prix du catalogue est-il déduit si je commande des plans complets ?",
    answer:
      `Oui. Les plans complets personnalisés ont un prix fixe : ${formatFcfa(villa.price)} pour une villa, ${formatFcfa(duplex.price)} pour un duplex. Le prix du catalogue est déduit : vous payez seulement la différence, soit ${formatFcfa(memberBalance(villa))} pour une villa et ${formatFcfa(memberBalance(duplex))} pour un duplex.`,
  },
  {
    question: "Les devis estimatifs sont-ils fiables ?",
    answer:
      "Ils sont établis à partir de ratios professionnels et de prix au m² actualisés. Ils donnent un ordre de grandeur fiable pour choisir, à affiner selon votre ville, vos matériaux et votre terrain.",
  },
];
