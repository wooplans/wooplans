import catalogue from "@/config/catalogue.json";

export const SITE = {
  name: "WOOPLANS",
  tagline: "Plans de villas et duplex pour l'Afrique",
  description:
    "Des modèles de villas et duplex conçus pour l'Afrique francophone, avec rendus 3D, distributions cotées et devis estimatifs. Choisissez la maison adaptée à votre famille, votre terrain et votre budget.",
  locale: "fr_FR",
  email: "info@wooplans.com",
  catalogueUrl: "/catalogue-premium",
  catalogueCta: "Obtenir le Catalogue Premium",
  social: [
    { label: "Facebook", href: "https://web.facebook.com/woohouseplans" },
    { label: "YouTube", href: "https://www.youtube.com/@wooplans" },
    { label: "TikTok", href: "https://www.tiktok.com/@wooplans" },
  ],
};

export function whatsappLink(message: string, number: string = process.env.WHATSAPP_NUMBER || "237653769998") {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/**
 * Prix du Catalogue Premium en FCFA. Source unique : src/config/catalogue.json, lue aussi par
 * scripts/build-sales-page.py (pages de vente) et video/vsl (VSL). Le prix Chariow se change à part.
 */
export function cataloguePrice(): number {
  return catalogue.price;
}
