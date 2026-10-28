import { eq, inArray, or } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { checkRender, mapLimit } from "@/lib/plan-renders";

/** Libellé des copies d'archive d'un modèle (rendus importés de Framer, plus affichés sur le site). */
export const archiveLabel = (code: string) => `${code} (Framer)`;

const keyOf = (ref: string) => ref.replace(/^\/media\//, "");
const isExternal = (ref: string) => /^https?:\/\//.test(ref);
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

type MediaRow = typeof schema.media.$inferSelect;
type PlanLike = { id: string; code: string; name: string; renders: string[]; floorPlans: string[]; coverImage: string };

/** Fichiers d'un modèle inscrits dans la table media : envoyés pour lui, affichés sur sa fiche, ou archives Framer. */
async function planMediaRows(plan: PlanLike) {
  const referenced = [...plan.renders, ...plan.floorPlans].filter((r) => !isExternal(r)).map(keyOf);
  const conditions = [eq(schema.media.planId, plan.id), eq(schema.media.label, archiveLabel(plan.code))];
  // D1 : 100 paramètres au plus par requête.
  for (let i = 0; i < referenced.length; i += 90) conditions.push(inArray(schema.media.key, referenced.slice(i, i + 90)));
  return getDb().query.media.findMany({ where: or(...conditions) });
}

/** Le fichier `key` appartient-il à un modèle (et lequel) ? Sert à get_plan_file. */
export async function planOfFile(key: string) {
  const db = getDb();
  const entry = await db.query.media.findFirst({ where: eq(schema.media.key, key) });
  if (!entry) return null;
  if (entry.planId) {
    const plan = await db.query.plans.findFirst({ where: eq(schema.plans.id, entry.planId), columns: { code: true } });
    if (plan) return { entry, code: plan.code };
  }
  if (entry.label?.endsWith(" (Framer)")) return { entry, code: entry.label.slice(0, -" (Framer)".length) };
  const plans = await db.query.plans.findMany({ columns: { code: true, renders: true, floorPlans: true } });
  const owner = plans.find((p) => p.renders.includes(`/media/${key}`) || p.floorPlans.includes(key));
  return owner ? { entry, code: owner.code } : null;
}

const describe = (row: MediaRow | undefined, key: string) => ({
  key,
  name: row?.label ?? key.split("/").pop()!,
  content_type: row?.contentType ?? null,
  size: row?.size ?? null,
});

async function image(row: MediaRow | undefined, key: string, watermarked?: boolean) {
  const check = await checkRender(key, row?.contentType, watermarked);
  return check ? { ...describe(row, key), ...check } : { ...describe(row, key), width: null, height: null, watermarked: null, missing: true };
}

/**
 * Inventaire d'un modèle dans R2 : rendus (version du site + original haute résolution), distributions,
 * PDF du modèle, vidéos, archives Framer, fichiers retirés en attente de suppression.
 * `watermarked` : pastille « Visitez wooplans.com » détectée (true), aucune trace (false), indécidable (null) ;
 * les versions du site fabriquées par le serveur sont filigranées par construction.
 */
export async function planFileIndex(plan: PlanLike) {
  const rows = await planMediaRows(plan);
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const siteKeys = plan.renders.filter((r) => !isExternal(r)).map(keyOf);
  const used = new Set<string>([...siteKeys, ...plan.floorPlans]);

  const renders = await mapLimit(siteKeys, 3, async (key, i) => {
    const row = byKey.get(key);
    const originalKey = row?.sourceKey ?? null;
    if (originalKey) used.add(originalKey);
    const [site, original] = await Promise.all([
      image(row, key, row?.kind === "render" ? true : undefined),
      originalKey ? image(byKey.get(originalKey), originalKey) : Promise.resolve(null),
    ]);
    return { position: i + 1, cover: plan.coverImage === `/media/${key}`, site, original };
  });

  const active = rows.filter((r) => !r.deleteAfter && !used.has(r.key));
  const archive = await mapLimit(
    active.filter((r) => r.label === archiveLabel(plan.code) && !r.kind).sort((a, b) => a.key.localeCompare(b.key)),
    3,
    (r) => image(r, r.key),
  );
  const of = (kind: string) => active.filter((r) => r.kind === kind).map((r) => ({ ...describe(r, r.key), added_at: iso(r.createdAt) }));
  const orphanOriginals = await mapLimit(
    active.filter((r) => r.kind === "render_original"),
    3,
    (r) => image(r, r.key),
  );

  const originals = renders.map((r) => r.original).filter((o): o is NonNullable<typeof o> => Boolean(o));
  const count = (list: { watermarked?: boolean | null }[], v: boolean | null) => list.filter((x) => x.watermarked === v).length;
  const summary = {
    renders: renders.length,
    originals: originals.length,
    originals_missing: renders.length - originals.length,
    originals_clean: count(originals, false),
    originals_watermarked: count(originals, true),
    originals_unknown: count(originals, null),
    site_watermarked: count(renders.map((r) => r.site), true),
    site_without_watermark: count(renders.map((r) => r.site), false),
    floor_plans: plan.floorPlans.length,
    documents: of("document").length,
    videos: of("video").length,
    archive: archive.length,
  };
  return {
    code: plan.code,
    name: plan.name,
    summary,
    renders,
    floor_plans: plan.floorPlans.map((ref, i) => ({ position: i + 1, ...describe(byKey.get(keyOf(ref)), keyOf(ref)) })),
    documents: of("document"),
    videos: of("video"),
    ...(orphanOriginals.length ? { unused_originals: orphanOriginals } : {}),
    ...(archive.length ? { archive } : {}),
    retired: rows
      .filter((r) => r.deleteAfter)
      .map((r) => ({ ...describe(r, r.key), kind: r.kind, delete_after: iso(r.deleteAfter) })),
  };
}
