import config from "@/config/guide.json";
import type { GuideConfig } from "@/lib/guide-rules";

export * from "@/lib/guide-rules";

export const GUIDE: GuideConfig = config as GuideConfig;

/** Produit Chariow du guide (src/config/guide.json). Vide : le paiement est inactif. */
export function guideProductId() {
  return GUIDE.chariowProductId.trim();
}

export function guideEnabled() {
  return guideProductId() !== "";
}

export const GUIDE_PATH = "/guide-des-maisons";
