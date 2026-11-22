import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { randomId } from "@/lib/crypto";
import { extraitScore, type ExtraitEventType } from "@/lib/extrait-web-rules";
import { EXTRAIT_SLUGS, LEAD_OFFERS } from "@/lib/lead-offers";
import { inChunks } from "@/lib/sql-chunks";

/**
 * Extrait du Catalogue Premium en page web (23 nov. 2026). Lien personnel : /mon-extrait/<achat>, où <achat> est
 * l'intention payée de l'extrait (le même identifiant que le lien de téléchargement du PDF /api/guide/<achat>).
 * Les 5 maisons de l'extrait sont débloquées (rendus, plans cotés filigranés au nom de l'acheteur, devis, fiche PDF) ;
 * les autres montrent leurs rendus, le reste est verrouillé (flouté, montants jamais envoyés) avec l'offre du catalogue.
 */
export const EXTRAIT_WEB_PATH = "/mon-extrait";

export type ExtraitBuyer = { intentId: string; email: string | null; name: string | null; boughtAt: Date };

/** Acheteur d'un lien personnel (intention payée de l'extrait), sinon null. */
export async function extraitBuyer(id: string | null | undefined): Promise<ExtraitBuyer | null> {
  const key = (id || "").trim();
  if (!key || key.length > 64 || !/^[A-Za-z0-9_-]+$/.test(key)) return null;
  const db = getDb();
  const intent = await db.query.checkoutIntents.findFirst({
    where: and(eq(schema.checkoutIntents.id, key), eq(schema.checkoutIntents.ctaId, LEAD_OFFERS.extrait.ctaId), eq(schema.checkoutIntents.status, "paid")),
    columns: { id: true, email: true, createdAt: true },
  });
  if (!intent) return null;
  const prospect = intent.email
    ? await db.query.prospects.findFirst({ where: eq(schema.prospects.email, intent.email), columns: { name: true } })
    : null;
  return { intentId: intent.id, email: intent.email, name: prospect?.name ?? null, boughtAt: intent.createdAt };
}

export function isUnlocked(slug: string) {
  return EXTRAIT_SLUGS.includes(slug);
}

export function extraitWebUrl(intentId: string) {
  return `${EXTRAIT_WEB_PATH}/${intentId}`;
}

export async function recordExtraitEvent(buyer: ExtraitBuyer, type: ExtraitEventType, planSlug?: string | null) {
  await getDb()
    .insert(schema.extraitEvents)
    .values({ id: randomId(), intentId: buyer.intentId, email: buyer.email, type, planSlug: planSlug?.slice(0, 120) ?? null });
}

/** Fiches PDF déjà téléchargées pour ce modèle par cet acheteur (limite anti-partage). */
export async function extraitPdfCount(intentId: string, slug: string) {
  const rows = await getDb().query.extraitEvents.findMany({
    where: and(eq(schema.extraitEvents.intentId, intentId), eq(schema.extraitEvents.type, "pdf"), eq(schema.extraitEvents.planSlug, slug)),
    columns: { id: true },
  });
  return rows.length;
}

/** Activité sur l'extrait en ligne, par email (cartes des relances, fiches prospects). */
export async function extraitActivityByEmail(emails: string[]) {
  const unique = [...new Set(emails.filter(Boolean))];
  const rows = unique.length
    ? await inChunks(
        unique,
        (chunk) =>
          getDb().query.extraitEvents.findMany({
            where: inArray(schema.extraitEvents.email, chunk),
            orderBy: [desc(schema.extraitEvents.createdAt)],
            columns: { email: true, type: true, planSlug: true, createdAt: true },
          }),
        80,
      )
    : [];
  const byEmail = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!r.email) continue;
    const list = byEmail.get(r.email) ?? [];
    list.push(r);
    byEmail.set(r.email, list);
  }
  return new Map([...byEmail].map(([email, list]) => [email, { ...extraitScore(list, EXTRAIT_SLUGS), lastAt: list[0]?.createdAt ?? null }]));
}
