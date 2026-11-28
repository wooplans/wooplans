/**
 * Espace Premium anglais (Ghana, Kenya ; décision de Tao du 28 nov. 2026) : textes des fiches, prix au m² publiés,
 * prix des plans complets dans la devise du membre. Module pur (testé sous Node).
 */

export type Level = "basic" | "standard" | "luxury";
export type RateRange = [number, number | null];
export type CountryRates = {
  source: string;
  url: string;
  bungalow: Partial<Record<Level, RateRange>>;
  twoStory: Partial<Record<Level, RateRange>>;
};

/** Prix au m² publiés pour le pays et le type de maison (null : pas de source pour ce pays). */
export function publishedRates(rates: unknown, country: string | null | undefined, levels: number): (CountryRates & { ranges: Partial<Record<Level, RateRange>> }) | null {
  const r = (rates as unknown as Record<string, CountryRates | string>)[(country || "").toUpperCase()];
  if (!r || typeof r === "string") return null;
  return { ...r, ranges: levels >= 2 ? r.twoStory : r.bungalow };
}

/** Valeur proposée par défaut pour un niveau : milieu de la fourchette (arrondi à 500, ou à 50 sous 20 000) ; borne basse si ouverte. */
export function defaultRate(range: RateRange | undefined) {
  if (!range) return null;
  const [lo, hi] = range;
  if (!hi) return lo;
  const step = hi < 20000 ? 50 : 500;
  return Math.round((lo + hi) / 2 / step) * step;
}

/** Texte anglais d'une fiche (lot traduit), sinon null : la fiche affiche alors ses seules caractéristiques. */
export function planTextEn(plansEn: { plans: unknown }, code: string): { summary: string; description: string } | null {
  return (plansEn.plans as Record<string, { summary: string; description: string }>)[code] ?? null;
}
