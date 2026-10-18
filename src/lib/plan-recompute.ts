import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { derivedPlanFields, type CostSettings } from "@/lib/plan-pricing";

/** Recalcule terrain et devis de tous les modèles (après un changement des prix au m² ou des coefficients). */
export async function recomputeAllPlans(settings: CostSettings) {
  const db = getDb();
  const rows = await db.query.plans.findMany({
    columns: { id: true, category: true, surfaceTotal: true, standing: true, buildingWidth: true, buildingDepth: true },
  });
  const updates = rows
    .map((row) => ({ id: row.id, values: derivedPlanFields(row, settings) }))
    .filter((u) => Object.keys(u.values).length > 0)
    .map((u) => db.update(schema.plans).set({ ...u.values, updatedAt: new Date() }).where(eq(schema.plans.id, u.id)));
  if (updates.length > 0) await db.batch(updates as [(typeof updates)[number], ...typeof updates]);
  return updates.length;
}
