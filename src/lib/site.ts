export const SITE = {
  name: "WOOPLANS",
  tagline: "Plans de villas et duplex pour l'Afrique",
  description:
    "Plus de 50 modèles de villas et duplex conçus pour l'Afrique francophone, avec rendus 3D, distributions cotées et devis estimatifs. Choisissez la maison adaptée à votre famille, votre terrain et votre budget.",
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

export function cataloguePrice() {
  return Number(process.env.CATALOGUE_PRICE_XAF || 39000);
}
