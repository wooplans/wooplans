/**
 * Offre aux clients du plan et devis : chaque plan et devis supplémentaire avec une remise fixe
 * (code Chariow, src/config/projet.json « upsell »), mise en avant pendant 24 h après l'achat
 * (page /merci, email de livraison, message WhatsApp envoyé depuis l'admin).
 * Le code reste valable après ce délai : seule la mise en avant s'arrête.
 * Module sans dépendance à la base, utilisable côté navigateur.
 */
import projet from "@/config/projet.json";
import { discountedLocalPrice, type LocalPrice } from "@/lib/local-price";

export const UPSELL = (projet as { upsell: { code: string; discount: number; hours: number } }).upsell;

/** Intention d'achat créée avec le code de l'offre : aucune déduction sur les plans complets. */
export const UPSELL_CTA_ID = "plan_devis_promo";

/** Code promo mémorisé dans le navigateur (lien ?promo=… reçu par email ou WhatsApp). */
export const PROMO_STORAGE_KEY = "wp_promo";
/** Coordonnées saisies au premier achat, pour pré-remplir les achats suivants (sur cet appareil seulement). */
export const BUYER_STORAGE_KEY = "wp_acheteur";

export function isUpsellCode(code: string | null | undefined): boolean {
  return (code || "").trim().toUpperCase() === UPSELL.code.toUpperCase();
}

/** Fin de la mise en avant : 24 h après le paiement. */
export function upsellDeadline(paidAt: Date | number): Date {
  return new Date(new Date(paidAt).getTime() + UPSELL.hours * 3600_000);
}

/** « dimanche 9 novembre à 14h32 » (heure du Cameroun). */
export function formatDeadline(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Africa/Douala",
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.weekday} ${parts.day} ${parts.month} à ${parts.hour}h${parts.minute}`;
}

/** Prix d'un plan et devis avec le code, dans la monnaie du visiteur (voir discountedLocalPrice). */
export function upsellPrice(local: LocalPrice): { amount: number; currency: string; approx: boolean } {
  return { ...discountedLocalPrice(local, projet.price, UPSELL.discount), approx: false };
}

/** Lien d'une fiche modèle avec le code (achat=1 : le formulaire s'ouvre à l'arrivée). */
export function upsellPath(slug: string, openForm = true): string {
  return `/catalogue/${slug}?promo=${encodeURIComponent(UPSELL.code)}${openForm ? "&achat=1" : ""}`;
}

/** Catalogue avec le code mémorisé (le client choisit lui-même ses modèles). */
export const UPSELL_CATALOGUE_PATH = `/catalogue?promo=${encodeURIComponent(UPSELL.code)}`;

/** Catalogue du même type que le modèle acheté (villas ou duplex), avec le code. */
export function upsellCataloguePath(category: string | null | undefined): string {
  const page = category === "villa" ? "/catalogue-villa" : category === "duplex" ? "/catalogue-duplex" : "/catalogue";
  return `${page}?promo=${encodeURIComponent(UPSELL.code)}`;
}
/** Page « comment utiliser mon code », avec les captures d'écran. */
export const PROMO_GUIDE_PATH = `/code-promo?promo=${encodeURIComponent(UPSELL.code)}`;
/** Capture d'écran du processus (à envoyer aussi sur WhatsApp). */
export const PROMO_GUIDE_IMAGE = "/images/code-promo-etapes.png";
