/**
 * Prix du Catalogue Premium (décision de Tao, 22 nov. 2026), règles pures testées dans tests/catalogue-offer.test.ts :
 *  - public : 29 000 FCFA depuis le 28 nov. 2026 (39 000 avant), ancien prix 39 000 barré sur la page de vente (décision de Tao) ;
 *  - réservé : 29 000 FCFA pour les acheteurs de l'extrait ou du guide, pendant 7 jours après leur achat, jusqu'à
 *    minuit (UTC, heure d'Abidjan) de J7 ; Tao peut rouvrir l'offre 24 h à la main (« deuxième chance ») ;
 *  - promo : 19 000 FCFA, seulement pendant une promo datée de src/config/catalogue.json (« promos »).
 * Chaque prix est un produit Chariow relié au Pulse : CP 39K, CP 29K (réservé, depuis le 26 nov. 2026), CP 19K,
 * et « Catalogue Premium » (prd_9cbatg, 37 864) pour les pays UEMOA.
 */

export type Tier = "public" | "reserved" | "promo";

export type PromoWindow = { id: string; from: string; to: string };

export type CatalogueConfig = {
  price: number;
  productId: string;
  reserved: { price: number; productId: string; days: number };
  promo: { price: number; productId: string };
  promos: PromoWindow[];
  /** Pays du franc CFA d'Afrique de l'Ouest (XOF) : Chariow convertit le prix XAF avec ~3 % de marge
   *  (39 000 → 40 170). Produit au prix public / 1,03 (37 864) pour qu'ils voient 39 000 au paiement (Tao, 26 nov. 2026). */
  uemoa?: { productId: string; countries: string[] };
};

const DAY = 24 * 60 * 60 * 1000;

/** Fin de l'offre réservée : minuit UTC à la fin de J7 (J0 = jour de l'achat). */
export function reservedDeadline(purchasedAt: Date, days = 7): Date {
  const start = Date.UTC(purchasedAt.getUTCFullYear(), purchasedAt.getUTCMonth(), purchasedAt.getUTCDate());
  return new Date(start + (days + 1) * DAY);
}

/** Date de fin réelle : la plus tardive entre J7 et une réouverture manuelle (« Rouvrir l'offre 24 h »). */
export function reservedUntil(purchasedAt: Date | null, reopenUntil: Date | null, days = 7): Date | null {
  const candidates = [purchasedAt ? reservedDeadline(purchasedAt, days) : null, reopenUntil].filter((d): d is Date => Boolean(d));
  if (candidates.length === 0) return null;
  return new Date(Math.max(...candidates.map((d) => d.getTime())));
}

/** Promo datée active (dates incluses, en UTC : « from » à 00:00, « to » jusqu'à minuit). */
export function activePromo(promos: PromoWindow[], id: string | null | undefined, now = new Date()): PromoWindow | null {
  const key = (id || "").trim().toLowerCase();
  if (!key) return null;
  const promo = promos.find((p) => p.id.toLowerCase() === key);
  if (!promo) return null;
  const from = Date.parse(`${promo.from}T00:00:00Z`);
  const to = Date.parse(`${promo.to}T00:00:00Z`) + DAY;
  return now.getTime() >= from && now.getTime() < to ? promo : null;
}

export type Offer = { tier: Tier; price: number; productId: string; until: Date | null };

/** Prix proposé : promo datée, sinon prix réservé encore valable, sinon prix public. */
export function chooseOffer(cfg: CatalogueConfig, input: { reservedUntil?: Date | null; promo?: PromoWindow | null }, now = new Date()): Offer {
  if (input.promo) {
    return { tier: "promo", price: cfg.promo.price, productId: cfg.promo.productId, until: new Date(Date.parse(`${input.promo.to}T00:00:00Z`) + DAY) };
  }
  if (input.reservedUntil && input.reservedUntil.getTime() > now.getTime()) {
    return { tier: "reserved", price: cfg.reserved.price, productId: cfg.reserved.productId, until: input.reservedUntil };
  }
  return { tier: "public", price: cfg.price, productId: cfg.productId, until: null };
}

/** Produit Chariow à payer : le prix public d'un pays UEMOA passe par le produit « UEMOA » (39 000 affiché au paiement). */
export function productForCountry(cfg: CatalogueConfig, offer: Offer, countryCode: string | null | undefined): string {
  const code = (countryCode || "").toUpperCase();
  if (offer.tier === "public" && cfg.uemoa?.productId && cfg.uemoa.countries.includes(code)) return cfg.uemoa.productId;
  return offer.productId;
}

/** Tous les produits Chariow du catalogue (ventes reconnues par le Pulse). */
export function offerProductIds(cfg: CatalogueConfig): string[] {
  return [cfg.productId, cfg.reserved.productId, cfg.promo.productId, cfg.uemoa?.productId || ""].filter(Boolean);
}

/** « dimanche 29 novembre à minuit » (date affichée aux acheteurs, heure d'Abidjan = UTC). */
export function deadlineLabel(until: Date): string {
  const opts = { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" } as const;
  // Fin à 00:00 : on affiche le dernier jour, « à minuit ». Réouverture de 24 h : jour et heure exacts.
  if (until.getUTCHours() === 0 && until.getUTCMinutes() === 0) {
    return `${new Date(until.getTime() - 1).toLocaleDateString("fr-FR", opts)} à minuit`;
  }
  const hh = String(until.getUTCHours()).padStart(2, "0");
  const mm = String(until.getUTCMinutes()).padStart(2, "0");
  return `${until.toLocaleDateString("fr-FR", opts)} à ${hh} h ${mm}`;
}
