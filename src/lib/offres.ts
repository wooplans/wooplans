import config from "@/config/offres.json";
import * as rules from "@/lib/offres-rules";
import type { Offre, OffresConfig } from "@/lib/offres-rules";

/** Offres « Plan et devis + Catalogue Premium offert » : règles dans src/lib/offres-rules.ts. */
export type { Offre, OffresConfig };
export { OFFRE_PARAM, OFFRE_STORAGE_KEY, isActive } from "@/lib/offres-rules";

export const OFFRES: OffresConfig = config as OffresConfig;

export const offreById = (id: string | null | undefined) => rules.offreById(id, OFFRES);
export const resolveOffre = (requested: string | null | undefined, country: string | null | undefined) => rules.resolveOffre(requested, country, OFFRES);
export const offreProductIds = () => rules.offreProductIds(OFFRES);
export const offresEnabled = () => rules.offresEnabled(OFFRES);
export const relanceDiscount = (offreId?: string | null) => rules.relanceDiscount(OFFRES, offreId);
export const isRelanceCode = (code: string | null | undefined) => rules.isRelanceCode(code, OFFRES);
