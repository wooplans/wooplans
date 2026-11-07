import { and, eq, isNotNull, sum } from "drizzle-orm";
import { getDb, schema } from "@/db";

const TTL_MS = 10 * 60 * 1000;
let cached: { at: number; n: number } | null = null;

/**
 * Nombre réel de téléchargements du plan et devis (tous modèles : achats et plans offerts), affiché sur les
 * fiches comme preuve sociale. Compté depuis la base (colonne downloads des intentions), jamais saisi à la main.
 */
export async function countPlanDevisDownloads(): Promise<number | null> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.n;
  try {
    const [row] = await getDb()
      .select({ n: sum(schema.checkoutIntents.downloads) })
      .from(schema.checkoutIntents)
      .where(isNotNull(schema.checkoutIntents.planSlug));
    cached = { at: Date.now(), n: Number(row?.n ?? 0) };
    return cached.n;
  } catch (error) {
    console.error("Nombre de téléchargements du plan et devis indisponible", error);
    return null;
  }
}

/** Nombre de distributions cotées d'un modèle publié (pages floutées de l'aperçu), sans lire leur contenu. */
export async function countFloorPlans(slug: string): Promise<number> {
  try {
    const plan = await getDb().query.plans.findFirst({
      columns: { floorPlans: true },
      where: and(eq(schema.plans.slug, slug), eq(schema.plans.status, "published")),
    });
    return plan?.floorPlans.length ?? 0;
  } catch {
    return 0;
  }
}
