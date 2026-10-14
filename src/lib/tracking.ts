import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { randomId } from "@/lib/crypto";
import type { Attribution } from "@/lib/attribution";

export async function upsertVisitor(id: string, attribution: Attribution | null, extra: { country?: string | null; device?: string | null }) {
  const db = getDb();
  const existing = await db.query.visitors.findFirst({ where: eq(schema.visitors.id, id), columns: { id: true } });
  if (existing) {
    await db.update(schema.visitors).set({ lastSeenAt: new Date() }).where(eq(schema.visitors.id, id));
    return;
  }
  const a = attribution;
  await db
    .insert(schema.visitors)
    .values({
      id,
      source: a?.source || "direct",
      landingPath: a?.landingPath || "/",
      referrer: a?.referrer ?? null,
      utmSource: a?.utmSource ?? null,
      utmMedium: a?.utmMedium ?? null,
      utmCampaign: a?.utmCampaign ?? null,
      utmContent: a?.utmContent ?? null,
      utmTerm: a?.utmTerm ?? null,
      fbclid: a?.fbclid ?? false,
      country: extra.country ?? null,
      device: extra.device ?? null,
    })
    .onConflictDoNothing();
}

export async function recordServerEvent(input: {
  visitorId: string;
  type: string;
  path: string;
  ctaId?: string | null;
  planSlug?: string | null;
}) {
  await getDb()
    .insert(schema.events)
    .values({
      id: randomId(),
      visitorId: input.visitorId,
      type: input.type.slice(0, 40),
      path: input.path.slice(0, 300),
      ctaId: input.ctaId?.slice(0, 80) ?? null,
      planSlug: input.planSlug?.slice(0, 120) ?? null,
    });
}

export function deviceFromUserAgent(ua: string | null) {
  if (!ua) return null;
  if (/ipad|tablet/i.test(ua)) return "tablet";
  if (/mobi|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}
