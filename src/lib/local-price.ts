/**
 * Prix local du plan et devis selon le pays du visiteur (en-tête Cloudflare cf-ipcountry).
 * Le produit Chariow reste à 14 900 FCFA (XAF) ; Chariow convertit au paiement. On affiche sur la fiche
 * le montant que le visiteur retrouvera au checkout, dans sa monnaie (src/config/projet.json, « localPrices »).
 * Pays absent de la liste (Afrique centrale, reste du monde) : prix de base en FCFA.
 * Module sans dépendance (testé par node --test).
 */
export type LocalPriceRule = { region?: string; countries: string[]; amount: number; currency: string };
export type LocalPrice = { amount: number; currency: string; anchor: number | null };

/** Arrondi du prix barré converti : 50 FCFA, 1 000 GNF, 1 $US. */
function anchorStep(currency: string, amount: number) {
  if (currency === "FCFA") return 50;
  return amount >= 10000 ? 1000 : 1;
}

export function localPriceFor(
  country: string | null | undefined,
  base: { price: number; anchor: number | null },
  rules: LocalPriceRule[] = [],
): LocalPrice {
  const code = (country || "").toUpperCase();
  const rule = code ? rules.find((r) => r.countries.includes(code) && r.amount > 0) : undefined;
  if (!rule) return { amount: base.price, currency: "FCFA", anchor: base.anchor };
  // Prix barré : même rapport que le prix (50 000 FCFA → ~51 500 FCFA en Afrique de l'Ouest).
  let anchor: number | null = null;
  if (base.anchor && base.price > 0) {
    const raw = (base.anchor * rule.amount) / base.price;
    const step = anchorStep(rule.currency, raw);
    anchor = Math.round(raw / step) * step;
    if (anchor <= rule.amount) anchor = null;
  }
  return { amount: rule.amount, currency: rule.currency, anchor };
}

/** « 15 350 » (espace insécable fine), sans la devise ; centimes gardés pour les petits montants (« 8,55 »). */
export function formatLocalAmount(value: number): string {
  const n = Number.isInteger(value) || value >= 1000 ? Math.round(value) : Math.round(value * 100) / 100;
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2 }).format(n).replace(/ | /g, " ");
}

/**
 * Prix local avec une remise fixe en FCFA (offre aux clients, code PROMO10).
 * - FCFA (Afrique centrale comme Afrique de l'Ouest) : la remise est déduite telle quelle (15 350 → 5 350).
 * - Autre monnaie : la remise est convertie au même taux que le prix local (14 900 FCFA = 235 941 GNF,
 *   donc 10 000 FCFA = 158 350 GNF → 77 591 GNF ; 26 $US → 8,55 $US).
 */
export function discountedLocalPrice(local: { amount: number; currency: string }, basePrice: number, discountFcfa: number) {
  if (local.currency === "FCFA") return { amount: Math.max(0, local.amount - discountFcfa), currency: local.currency };
  const converted = basePrice > 0 ? (discountFcfa * local.amount) / basePrice : 0;
  const raw = Math.max(0, local.amount - converted);
  return { amount: raw >= 100 ? Math.round(raw) : Math.round(raw * 100) / 100, currency: local.currency };
}

/** « 15 350 FCFA », « 235 941 GNF », « 26 $US ». */
export function formatLocalPrice(value: number, currency: string): string {
  return `${formatLocalAmount(value)} ${currency}`;
}
