import type { LeadStage } from "@/db/schema";

export const STAGES: { id: LeadStage; label: string }[] = [
  { id: "demande", label: "Demande" },
  { id: "qualification", label: "Qualification" },
  { id: "devis", label: "Devis" },
  { id: "commande", label: "Commande" },
  { id: "production", label: "Production" },
  { id: "livraison", label: "Livraison" },
  { id: "termine", label: "Terminé" },
  { id: "perdu", label: "Perdu" },
];

export const stageLabel = (s: LeadStage) => STAGES.find((x) => x.id === s)?.label ?? s;

export const CHANNEL_LABELS: Record<string, string> = {
  site: "Site",
  whatsapp: "WhatsApp",
  telephone: "Téléphone",
  facebook: "Facebook",
  bouche_a_oreille: "Bouche-à-oreille",
  autre: "Autre",
};

/** Modèles de messages de relance (Resend). */
export const FOLLOW_UP_TEMPLATES = [
  {
    id: "relance_choix",
    label: "Relance : avez-vous choisi votre modèle ?",
    subject: "Avez-vous choisi votre future maison ?",
    message:
      "Vous avez récemment découvert nos modèles de maisons. Avez-vous pu faire votre choix ?\n\nSi vous hésitez entre plusieurs modèles, envoyez-nous leurs références : nous vous aidons à choisir selon votre terrain et votre budget.\n\nEt si vous êtes prêt, nous pouvons démarrer vos plans complets personnalisés. Le prix du Catalogue Premium est déduit de la commande.",
  },
  {
    id: "devis",
    label: "Envoi / rappel du devis",
    subject: "Votre devis pour vos plans complets",
    message:
      "Comme convenu, voici le récapitulatif de votre devis pour les plans complets de votre maison.\n\nN'hésitez pas à nous poser vos questions. Dès validation, nous lançons l'étude de votre terrain.",
  },
  {
    id: "terrain",
    label: "Demande d'infos sur le terrain",
    subject: "Quelques informations sur votre terrain",
    message:
      "Pour adapter le modèle à votre terrain, pourriez-vous nous envoyer :\n- les dimensions du terrain (ou le plan de bornage) ;\n- l'orientation et l'accès à la route ;\n- une ou deux photos du terrain.\n\nVous pouvez simplement répondre sur WhatsApp.",
  },
];
