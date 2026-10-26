/**
 * Référencement des fiches et des pages thématiques (« plan duplex 4 chambres »…).
 * Module sans dépendance (testé isolément) : les titres reprennent les mots que les visiteurs tapent
 * dans Google (rapport Search Console d'octobre 2026), la référence du modèle passe en dernier.
 */

type Category = "villa" | "duplex" | "immeuble" | "autre";

export type SeoPlan = {
  name: string;
  code: string;
  category: Category;
  bedrooms: number;
  bathrooms?: number;
  levels: number;
  surfaceTotal: number;
  landArea?: number | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
};

const NOUN: Record<Category, string> = { villa: "villa", duplex: "duplex", immeuble: "immeuble", autre: "maison" };

/** « 25 – 31 millions FCFA » (arrondi au million au-delà de 10 millions). */
export function millionsRange(min: number | null | undefined, max: number | null | undefined) {
  const m = (v: number) => {
    const x = v / 1_000_000;
    return x >= 10 ? String(Math.round(x)) : x.toFixed(1).replace(".", ",").replace(",0", "");
  };
  if (min && max && max > min) return `${m(min)} – ${m(max)} millions FCFA`;
  const single = min || max;
  return single ? `${m(single)} millions FCFA` : null;
}

function kind(plan: Pick<SeoPlan, "category" | "levels">) {
  if (plan.category === "villa") return plan.levels <= 1 ? "villa moderne plain-pied" : "villa moderne";
  if (plan.category === "duplex") return "duplex moderne";
  return `${NOUN[plan.category]} moderne`;
}

/** « Plan duplex moderne 4 chambres, 155 m² (D4-040) » : la requête d'abord, la référence ensuite. */
export function planSeoTitle(plan: SeoPlan) {
  return `Plan ${kind(plan)} ${plan.bedrooms} chambres, ${plan.surfaceTotal} m² (${plan.code})`;
}

export function planSeoDescription(plan: SeoPlan) {
  const budget = millionsRange(plan.budgetMin, plan.budgetMax);
  const parts = [
    `${kind(plan).replace(/^./, (c) => c.toUpperCase())}${plan.levels >= 2 ? ` R+${plan.levels - 1}` : ""} de ${plan.bedrooms} chambres et ${plan.surfaceTotal} m² : rendus 3D de la façade, surfaces`,
    budget ? ` et budget de construction indicatif de ${budget}.` : " et budget de construction indicatif.",
    plan.landArea ? ` Terrain conseillé : ${plan.landArea} m².` : "",
  ];
  return parts.join("");
}

/** Texte alternatif des rendus : ce que montre l'image (Google Images, Lens), puis la référence. */
export function planImageAlt(plan: Pick<SeoPlan, "category" | "levels" | "bedrooms" | "surfaceTotal" | "code">) {
  return `Façade ${plan.category === "villa" ? "de la" : "du"} ${kind(plan)} ${plan.bedrooms} chambres, ${plan.surfaceTotal} m² (${plan.code}) — rendu 3D`;
}

/** Présentation générée quand la fiche n'a pas de description rédigée (texte unique par modèle). */
export function planFallbackDescription(plan: SeoPlan) {
  const feminine = plan.category === "villa";
  const budget = millionsRange(plan.budgetMin, plan.budgetMax);
  const lines = [
    `${feminine ? "La" : "Le"} ${plan.name} est ${feminine ? "une" : "un"} ${kind(plan)}${plan.levels >= 2 ? ` sur ${plan.levels} niveaux (R+${plan.levels - 1})` : ""} de ${plan.bedrooms} chambres${
      plan.bathrooms ? ` et ${plan.bathrooms} salle${plan.bathrooms > 1 ? "s" : ""} de bain` : ""
    }, pour une surface totale de ${plan.surfaceTotal} m².`,
    plan.landArea ? `${feminine ? "Elle" : "Il"} s'implante sur un terrain d'environ ${plan.landArea} m².` : "",
    budget
      ? `Son budget de construction indicatif est ${budget.includes(" – ") ? `compris entre ${budget.replace(" – ", " et ")}` : `d'environ ${budget}`}, hors terrain et honoraires.`
      : "",
  ];
  return lines.filter(Boolean).join(" ");
}

/* ─── Pages thématiques ─── */

export type LandingSelector = { category: Category; bedrooms?: number; minBedrooms?: number; maxSurface?: number };

export type LandingPage = {
  path: string;
  /** Libellé court (liens internes, pied de page). */
  label: string;
  h1: string;
  title: string;
  description: string;
  /** Mot pour les phrases générées : « duplex 4 chambres ». */
  subject: string;
  intro: string;
  select: LandingSelector;
  /** Page de catalogue parente (fil d'Ariane). */
  parent: { path: string; label: string };
  /** Grille d'images (façades) plutôt que les cartes. */
  gallery?: boolean;
};

const DUPLEX_PARENT = { path: "/catalogue-duplex", label: "Duplex" };
const VILLA_PARENT = { path: "/catalogue-villa", label: "Villas" };

export const LANDING_PAGES: LandingPage[] = [
  {
    path: "/plan-duplex-4-chambres",
    label: "Duplex 4 chambres",
    h1: "Plans de duplex modernes 4 chambres",
    title: "Plan duplex moderne 4 chambres : rendus 3D, surfaces et budget",
    description:
      "Plans de duplex modernes de 4 chambres pour l'Afrique : façades en 3D, surfaces, terrain conseillé et budget de construction indicatif en FCFA. Comparez les modèles.",
    subject: "duplex 4 chambres",
    intro:
      "Le duplex 4 chambres est le format le plus demandé par les familles : les chambres à l'étage, le séjour, la cuisine et souvent une chambre d'amis au rez-de-chaussée. Voici tous nos plans de duplex modernes de 4 chambres, conçus pour l'Afrique francophone, avec leurs rendus 3D, leurs surfaces et leur budget de construction indicatif.",
    select: { category: "duplex", bedrooms: 4 },
    parent: DUPLEX_PARENT,
  },
  {
    path: "/plan-duplex-5-chambres",
    label: "Duplex 5 chambres",
    h1: "Plans de duplex modernes 5 chambres",
    title: "Plan duplex moderne 5 chambres : rendus 3D, surfaces et budget",
    description:
      "Plans de duplex modernes de 5 chambres et plus : façades en 3D, surfaces, terrain conseillé et budget de construction indicatif en FCFA. Pour les grandes familles.",
    subject: "duplex 5 chambres",
    intro:
      "Pour une grande famille ou pour recevoir, le duplex 5 chambres offre l'espace d'une villa sur une emprise au sol réduite. Retrouvez nos plans de duplex modernes de 5 chambres et plus, avec rendus 3D, surfaces et budget de construction indicatif.",
    select: { category: "duplex", minBedrooms: 5 },
    parent: DUPLEX_PARENT,
  },
  {
    path: "/petit-duplex",
    label: "Petits duplex",
    h1: "Plans de petits duplex modernes",
    title: "Petit duplex moderne : plans compacts, rendus 3D et budget",
    description:
      "Plans de petits duplex modernes (moins de 220 m²) pour terrains réduits : façades en 3D, surfaces et budget de construction indicatif en FCFA.",
    subject: "petit duplex",
    intro:
      "Un petit duplex permet de construire une maison à étage sur un terrain réduit et avec un budget maîtrisé. Voici nos plans de duplex compacts, de moins de 220 m², avec rendus 3D, surfaces et budget de construction indicatif.",
    select: { category: "duplex", maxSurface: 220 },
    parent: DUPLEX_PARENT,
  },
  {
    path: "/facade-duplex-moderne",
    label: "Façades de duplex",
    h1: "Façades de duplex modernes",
    title: "Façade duplex moderne : idées et modèles en images 3D",
    description:
      "Des façades de duplex modernes en images 3D : balcons, toitures, couleurs et volumes. Chaque façade correspond à un plan de duplex complet avec budget indicatif.",
    subject: "duplex moderne",
    intro:
      "Vous cherchez l'inspiration pour la façade de votre duplex ? Voici les façades en 3D de tous nos duplex modernes : balcons, toitures, volumes et couleurs. Chaque image correspond à un plan complet : touchez une façade pour voir le modèle, ses surfaces et son budget.",
    select: { category: "duplex" },
    parent: DUPLEX_PARENT,
    gallery: true,
  },
  {
    path: "/plan-villa-3-chambres",
    label: "Villas 3 chambres",
    h1: "Plans de villas modernes 3 chambres",
    title: "Plan villa moderne 3 chambres plain-pied : rendus 3D et budget",
    description:
      "Plans de villas modernes de 3 chambres de plain-pied pour l'Afrique : façades en 3D, surfaces, terrain conseillé et budget de construction indicatif en FCFA.",
    subject: "villa 3 chambres",
    intro:
      "La villa 3 chambres de plain-pied est la première maison idéale : tout sur un niveau, un budget accessible et la possibilité d'agrandir plus tard. Voici nos plans de villas modernes de 3 chambres, avec rendus 3D, surfaces et budget de construction indicatif.",
    select: { category: "villa", bedrooms: 3 },
    parent: VILLA_PARENT,
  },
  {
    path: "/plan-villa-4-chambres",
    label: "Villas 4 chambres",
    h1: "Plans de villas modernes 4 chambres",
    title: "Plan villa moderne 4 chambres plain-pied : rendus 3D et budget",
    description:
      "Plans de villas modernes de 4 chambres de plain-pied : façades en 3D, surfaces, terrain conseillé et budget de construction indicatif en FCFA. Comparez les modèles.",
    subject: "villa 4 chambres",
    intro:
      "La villa 4 chambres de plain-pied réunit toute la famille sur un seul niveau, sans escalier. Découvrez nos plans de villas modernes de 4 chambres, avec rendus 3D, surfaces et budget de construction indicatif.",
    select: { category: "villa", bedrooms: 4 },
    parent: VILLA_PARENT,
  },
];

export function landingPage(path: string) {
  const page = LANDING_PAGES.find((p) => p.path === path);
  if (!page) throw new Error(`Page thématique inconnue : ${path}`);
  return page;
}

export function selectLandingPlans<T extends Pick<SeoPlan, "category" | "bedrooms" | "surfaceTotal">>(plans: T[], s: LandingSelector) {
  return plans.filter(
    (p) =>
      p.category === s.category &&
      (s.bedrooms === undefined || p.bedrooms === s.bedrooms) &&
      (s.minBedrooms === undefined || p.bedrooms >= s.minBedrooms) &&
      (s.maxSurface === undefined || p.surfaceTotal <= s.maxSurface),
  );
}

/** Pages thématiques d'une catégorie (liens depuis /catalogue-duplex, /catalogue-villa et les fiches). */
export function landingPagesFor(category: Category, bedrooms?: number) {
  return LANDING_PAGES.filter(
    (p) =>
      p.select.category === category &&
      (bedrooms === undefined ||
        (p.select.bedrooms === undefined && p.select.minBedrooms === undefined) ||
        p.select.bedrooms === bedrooms ||
        (p.select.minBedrooms !== undefined && bedrooms >= p.select.minBedrooms)),
  );
}

export type PlanStats = {
  count: number;
  surface: [number, number] | null;
  land: [number, number] | null;
  budget: [number, number] | null;
};

const range = (values: number[]): [number, number] | null => (values.length ? [Math.min(...values), Math.max(...values)] : null);

/** Chiffres réels des modèles affichés (aucune valeur inventée) : surfaces, terrain, budget. */
export function planStats(plans: SeoPlan[]): PlanStats {
  return {
    count: plans.length,
    surface: range(plans.map((p) => p.surfaceTotal).filter((v) => v > 0)),
    land: range(plans.map((p) => p.landArea ?? 0).filter((v) => v > 0)),
    budget: range(plans.flatMap((p) => [p.budgetMin ?? 0, p.budgetMax ?? 0]).filter((v) => v > 0)),
  };
}

export type FaqEntry = { question: string; answer: string };

/** Questions fréquentes d'une page thématique, chiffrées à partir des modèles du catalogue. */
/** cataloguePrice : prix du Catalogue Premium en FCFA (cataloguePrice() de lib/site). */
export function landingFaq(page: LandingPage, stats: PlanStats, cataloguePrice: number): FaqEntry[] {
  const faq: FaqEntry[] = [];
  if (stats.budget) {
    faq.push({
      question: `Combien coûte la construction d'un ${page.subject} ?`,
      answer: `D'après les devis estimatifs de nos ${stats.count} modèles, le budget de construction d'un ${page.subject} va de ${millionsRange(stats.budget[0], stats.budget[1])?.replace(" – ", " à ")}, hors terrain et honoraires. Le coût réel dépend de votre ville, des matériaux et des finitions ; le devis détaillé par lot de chaque modèle est dans le Catalogue Premium.`,
    });
  }
  if (stats.surface) {
    faq.push({
      question: `Quelle est la surface d'un ${page.subject} ?`,
      answer: `Nos modèles de ${page.subject} font de ${stats.surface[0]} à ${stats.surface[1]} m² de surface totale.${
        stats.land ? ` Ils s'implantent sur des terrains de ${stats.land[0]} à ${stats.land[1]} m² environ.` : ""
      }`,
    });
  }
  faq.push(
    {
      question: "Les plans sont-ils gratuits ?",
      answer:
        `Les rendus 3D, les surfaces et le budget indicatif de chaque modèle sont consultables gratuitement. Les distributions cotées (plan de chaque niveau avec les cotes) et les devis détaillés sont réunis dans le Catalogue Premium (${cataloguePrice.toLocaleString("fr-FR").replace(/\s/g, " ")} FCFA, paiement unique, accès à vie).`,
    },
    {
      question: "Peut-on adapter le plan à mon terrain ?",
      answer:
        "Oui. Une fois le modèle choisi, nos architectes l'adaptent à votre terrain et réalisent le dossier complet de plans pour construire, à prix fixe. Le prix du Catalogue Premium est déduit de la commande.",
    },
  );
  return faq;
}

/** Questions fréquentes des pages /catalogue-duplex et /catalogue-villa. */
export function categoryFaq(category: "villa" | "duplex", stats: PlanStats): FaqEntry[] {
  const subject = category === "duplex" ? "duplex" : "villa";
  const faq: FaqEntry[] =
    category === "duplex"
      ? [
          {
            question: "Qu'est-ce qu'un duplex ?",
            answer:
              "Un duplex est une maison sur deux niveaux reliés par un escalier intérieur (R+1) : en général les pièces de vie au rez-de-chaussée et les chambres à l'étage. À surface égale, il occupe moins de terrain qu'une villa de plain-pied.",
          },
        ]
      : [
          {
            question: "Quelle différence entre une villa et un duplex ?",
            answer:
              "Une villa de plain-pied a toutes ses pièces sur un seul niveau : pas d'escalier, une construction plus simple et la possibilité d'ajouter un étage plus tard. Un duplex répartit les pièces sur deux niveaux et demande moins de terrain à surface égale.",
          },
        ];
  if (stats.budget) {
    faq.push({
      question: `Combien coûte la construction d'une maison ${category === "duplex" ? "en duplex" : "de plain-pied"} ?`,
      answer: `Selon les devis estimatifs de nos ${stats.count} modèles de ${subject}, il faut compter de ${millionsRange(stats.budget[0], stats.budget[1])?.replace(" – ", " à ")}, hors terrain et honoraires${
        stats.surface ? `, pour des surfaces de ${stats.surface[0]} à ${stats.surface[1]} m²` : ""
      }.`,
    });
  }
  return faq;
}
