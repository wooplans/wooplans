import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";

/** Fenêtre fixe stockée en D1. Retourne false si la limite est dépassée. */
export async function rateLimit(key: string, limit: number, windowMs: number) {
  const db = getDb();
  const now = Date.now();
  const row = await db.query.rateLimits.findFirst({ where: eq(schema.rateLimits.key, key) });
  if (!row || now - row.windowStart.getTime() > windowMs) {
    await db
      .insert(schema.rateLimits)
      .values({ key, count: 1, windowStart: new Date(now) })
      .onConflictDoUpdate({ target: schema.rateLimits.key, set: { count: 1, windowStart: new Date(now) } });
    return true;
  }
  if (row.count >= limit) return false;
  await db
    .update(schema.rateLimits)
    .set({ count: sql`${schema.rateLimits.count} + 1` })
    .where(eq(schema.rateLimits.key, key));
  return true;
}

export function clientIp(headers: Headers) {
  return headers.get("cf-connecting-ip") || headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
