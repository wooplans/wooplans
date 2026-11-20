/**
 * Code de commande des offres d'entrée (extrait, guide), affiché dans le message WhatsApp pré-rempli de la page merci :
 * « … (commande WP-482193) ». Le webhook WhatsApp le retrouve dans le message reçu pour rattacher le numéro WhatsApp
 * du client à sa fiche, même s'il diffère du numéro donné au paiement. Calculé à partir de l'identifiant de l'intention
 * (rien à stocker) ; règles pures, testées dans tests/order-code.test.ts.
 */

/** « WP- » + 6 chiffres, stable pour une intention donnée (hachage FNV-1a). */
export function orderCode(intentId: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < intentId.length; i++) {
    h ^= intentId.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `WP-${String(h % 1_000_000).padStart(6, "0")}`;
}

/** Le code trouvé dans un message (« wp-482193 », « WP 482193 »…), normalisé en « WP-482193 », ou null. */
export function findOrderCode(text: string | null | undefined) {
  const m = /\bWP[\s-]?(\d{6})\b/i.exec(text || "");
  return m ? `WP-${m[1]}` : null;
}

/** Deux numéros sont-ils le même (même indicatif, mêmes 8 derniers chiffres : anciens numéros ivoiriens à 8 chiffres) ? */
export function samePhone(a: string | null | undefined, b: string | null | undefined) {
  const x = (a || "").replace(/\D/g, "");
  const y = (b || "").replace(/\D/g, "");
  if (!x || !y) return false;
  if (x === y) return true;
  return x.length >= 11 && y.length >= 11 && x.slice(0, 3) === y.slice(0, 3) && x.slice(-8) === y.slice(-8);
}

/** Message pré-rempli du bouton WhatsApp de la page merci (« Salut », pas « Bonjour » : demande de Tao, 20 nov.). */
export function merciWhatsappText(p: { product: string; code: string; name?: string | null }) {
  const name = (p.name || "").trim().replace(/\s+/g, " ");
  return `Salut l'équipe WooPlans 👋 Je viens d'acheter ${p.product} (commande ${p.code}).${name ? ` Je suis ${name}.` : ""} Pouvez-vous me l'envoyer ici sur WhatsApp ?`;
}
