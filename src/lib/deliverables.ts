/**
 * Contenu du dossier de plans complets livré pour chaque projet (villa ou duplex).
 * Source unique : page /livrables-plans-complets et image de partage (scripts/build-deliverables-image.mjs).
 */
export type DeliverableIcon = "foundation" | "layout" | "facade" | "section" | "roof" | "septic";

export type Deliverable = { title: string; description: string };

export const DELIVERABLE_GROUPS: {
  id: string;
  title: string;
  icon: DeliverableIcon;
  items: Deliverable[];
}[] = [
  {
    id: "fondations",
    title: "Fondations",
    icon: "foundation",
    items: [{ title: "Plans de fondation", description: "Plans présentant le principe d'implantation des fondations du projet." }],
  },
  {
    id: "distribution",
    title: "Distribution",
    icon: "layout",
    items: [
      {
        title: "Plans de distribution",
        description: "Organisation des espaces, pièces, circulations, ouvertures et principales dimensions.",
      },
    ],
  },
  {
    id: "facades",
    title: "Façades",
    icon: "facade",
    items: [
      { title: "Plan de façade avant", description: "Représentation architecturale de l'élévation principale du bâtiment." },
      { title: "Plan de façade arrière", description: "Représentation architecturale de l'élévation arrière du bâtiment." },
      { title: "Plan de façade gauche", description: "Représentation architecturale de l'élévation latérale gauche." },
      { title: "Plan de façade droite", description: "Représentation architecturale de l'élévation latérale droite." },
    ],
  },
  {
    id: "coupes",
    title: "Coupes",
    icon: "section",
    items: [
      { title: "Plan de coupe AA", description: "Coupe verticale permettant de lire les niveaux, hauteurs et relations entre les espaces." },
      { title: "Plan de coupe BB", description: "Deuxième coupe verticale complémentaire pour la compréhension du projet." },
    ],
  },
  {
    id: "toiture",
    title: "Toiture",
    icon: "roof",
    items: [{ title: "Plan de toiture", description: "Disposition générale de la toiture et lecture de sa configuration architecturale." }],
  },
  {
    id: "assainissement",
    title: "Assainissement",
    icon: "septic",
    items: [
      { title: "Plan de fosses septiques", description: "Plan de principe pour l'implantation et l'organisation du dispositif d'assainissement." },
    ],
  },
];

export const DELIVERABLES: Deliverable[] = DELIVERABLE_GROUPS.flatMap((g) => g.items);

export const CUSTOMIZATION_EXAMPLES = [
  "Changer le nombre de chambres ou leur taille",
  "Agrandir, réduire ou déplacer des pièces",
  "Adapter la maison à la forme et à l'orientation de votre terrain",
  "Modifier la façade, la toiture ou l'organisation des niveaux",
  "Intégrer vos habitudes de vie : cuisine, salon, bureau, terrasse, garage…",
];

export const CUSTOMIZATION_STEPS = [
  { title: "Vous choisissez un modèle", text: "Un modèle du catalogue sert de point de départ." },
  { title: "Vous donnez vos exigences", text: "Par WhatsApp : vos besoins, votre terrain, vos souhaits." },
  { title: "Nous adaptons le modèle", text: "Nos architectes modifient les plans selon votre convenance." },
  { title: "Vous recevez votre dossier", text: "Les 10 plans, à jour de vos modifications." },
];

export const TECHNICIAN_POINTS = [
  "Vous le remettez tel quel à votre technicien (maçon, chef de chantier, entrepreneur).",
  "Il n'a qu'à suivre les plans pour construire la maison.",
  "Fondations, murs, façades, hauteurs, toiture et assainissement : tout est présenté dans le même dossier.",
];
