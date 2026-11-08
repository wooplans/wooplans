import projet from "@/config/projet.json";
import { anchorPriceFor } from "@/lib/anchor-price";

/** Prix d'ancrage barré du plan et devis (src/config/projet.json), ou null. Utilisable côté client. */
export function projectAnchorPrice(): number | null {
  return anchorPriceFor(projet.price, (projet as { anchorPrice?: unknown }).anchorPrice);
}
