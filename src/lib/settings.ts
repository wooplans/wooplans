import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { normalizeCostSettings } from "@/lib/plan-pricing";

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const row = await getDb().query.settings.findFirst({ where: eq(schema.settings.key, key) });
    return (row?.value as T) ?? fallback;
  } catch {
    return fallback;
  }
}

export async function setSetting(key: string, value: unknown) {
  await getDb()
    .insert(schema.settings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } });
}

export const getCostSettings = async () => normalizeCostSettings(await getSetting<unknown>("cost_settings", null));
