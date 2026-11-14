import { getEnv } from "@/lib/env";

export * from "@/lib/guide-data";

/** Produit Chariow du guide (variable CHARIOW_GUIDE_PRODUCT_ID, wrangler.jsonc). Vide = achat en ligne indisponible. */
export function guideProductId() {
  return getEnv().CHARIOW_GUIDE_PRODUCT_ID || "";
}
