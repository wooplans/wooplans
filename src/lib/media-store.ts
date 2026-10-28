import { and, eq, inArray, isNotNull, lte, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { MediaKind } from "@/db/schema";
import { randomId } from "@/lib/crypto";
import { getEnv } from "@/lib/env";

export type MediaVisibility = "public" | "private";

/** Dossier R2 d'un modèle (même convention que l'admin : référence en minuscules). */
export const planMediaFolder = (code: string) => code.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60) || "plans";

/** Sous-dossiers privés d'un modèle : originaux des rendus, PDF, vidéos (les distributions restent à la racine du dossier). */
export const MEDIA_SECTIONS = { render_original: "rendus", document: "documents", video: "videos" } as const;

/** Délai avant suppression définitive d'un fichier retiré d'un modèle. */
export const RETENTION_DAYS = 30;

/** Public : URL « /media/<clé> ». Privé : clé R2, servie par /api/premium/fichier aux seuls membres. */
export const mediaReference = (visibility: MediaVisibility, key: string) => (visibility === "public" ? `/media/${key}` : key);

/** Clé R2 d'un nouveau fichier : <visibilité>/<dossier du modèle>[/<sous-dossier>]/<horodatage>-<aléa>.<ext>. */
export function newMediaKey(visibility: MediaVisibility, folder: string, ext: string, kind?: MediaKind | null) {
  const clean = folder.replace(/[^a-z0-9-]/gi, "").slice(0, 60) || "plans";
  const section = kind && kind in MEDIA_SECTIONS ? `${MEDIA_SECTIONS[kind as keyof typeof MEDIA_SECTIONS]}/` : "";
  return `${visibility}/${clean}/${section}${Date.now()}-${randomId(6)}.${ext}`;
}

/** Inscrit dans la table media un fichier déjà écrit dans R2. */
export async function registerMedia(input: {
  key: string;
  visibility: MediaVisibility;
  contentType: string;
  size: number;
  label?: string | null;
  planId?: string | null;
  kind?: MediaKind | null;
  sourceKey?: string | null;
}) {
  await getDb()
    .insert(schema.media)
    .values({
      key: input.key,
      visibility: input.visibility,
      contentType: input.contentType,
      size: input.size,
      label: input.label ?? null,
      planId: input.planId ?? null,
      kind: input.kind ?? null,
      sourceKey: input.sourceKey ?? null,
    });
}

/**
 * Écrit un fichier dans R2 (MEDIA) puis l'inscrit dans la table media.
 * Le corps peut être un flux de longueur connue (fichier de formulaire, FixedLengthStream) : il n'est pas mis en mémoire.
 */
export async function storeMedia(input: {
  body: ReadableStream | ArrayBuffer | Uint8Array;
  size: number;
  contentType: string;
  ext: string;
  visibility: MediaVisibility;
  folder: string;
  label?: string | null;
  planId?: string | null;
  kind?: MediaKind | null;
  sourceKey?: string | null;
}) {
  const key = newMediaKey(input.visibility, input.folder, input.ext, input.kind);
  const bucket = getEnv().MEDIA;
  await bucket.put(key, input.body, { httpMetadata: { contentType: input.contentType } });
  try {
    await registerMedia({ ...input, key });
  } catch (error) {
    await bucket.delete(key).catch(() => {});
    throw error;
  }
  return { key, url: mediaReference(input.visibility, key) };
}

/** Supprime un fichier de R2 et du registre media. */
export async function deleteMedia(key: string) {
  await getEnv().MEDIA.delete(key);
  await getDb().delete(schema.media).where(eq(schema.media.key, key));
}

/**
 * Retire des fichiers d'un modèle sans les supprimer tout de suite : ils restent dans R2
 * (consultables par l'agent, restaurables) puis la tâche quotidienne les efface après RETENTION_DAYS jours.
 * Une version du site emporte son original.
 */
export async function retireMedia(keys: string[], now = new Date()) {
  if (!keys.length) return { keys: [] as string[], deleteAfter: null };
  const db = getDb();
  const sources = await db.query.media.findMany({ where: inArray(schema.media.key, keys), columns: { sourceKey: true } });
  const all = [...new Set([...keys, ...sources.map((s) => s.sourceKey).filter((k): k is string => Boolean(k))])];
  const deleteAfter = new Date(now.getTime() + RETENTION_DAYS * 86400_000);
  await db.update(schema.media).set({ deleteAfter }).where(inArray(schema.media.key, all));
  return { keys: all, deleteAfter };
}

/** Annule le retrait d'un fichier (et de son original). */
export async function restoreMedia(key: string) {
  const db = getDb();
  const entry = await db.query.media.findFirst({ where: eq(schema.media.key, key) });
  const keys = [key, ...(entry?.sourceKey ? [entry.sourceKey] : [])];
  await db.update(schema.media).set({ deleteAfter: null }).where(inArray(schema.media.key, keys));
  return keys;
}

/**
 * Supprime de R2 les fichiers retirés depuis plus de RETENTION_DAYS jours (tâche quotidienne).
 * Un fichier encore utilisé par une fiche (rendus, couverture, distributions) est gardé et son retrait annulé.
 */
export async function purgeRetiredMedia(now = new Date(), limit = 500) {
  const db = getDb();
  const due = await db.query.media.findMany({
    where: and(isNotNull(schema.media.deleteAfter), lte(schema.media.deleteAfter, now)),
    columns: { key: true },
    limit,
  });
  const deleted: string[] = [];
  const kept: string[] = [];
  for (const { key } of due) {
    const used = await db.query.plans.findFirst({
      where: or(
        sql`instr(${schema.plans.renders}, ${JSON.stringify(`/media/${key}`)}) > 0`,
        sql`instr(${schema.plans.floorPlans}, ${JSON.stringify(key)}) > 0`,
        eq(schema.plans.coverImage, `/media/${key}`),
      ),
      columns: { id: true },
    });
    (used ? kept : deleted).push(key);
  }
  if (kept.length) await db.update(schema.media).set({ deleteAfter: null }).where(inArray(schema.media.key, kept));
  for (let i = 0; i < deleted.length; i += 90) {
    const batch = deleted.slice(i, i + 90);
    await getEnv().MEDIA.delete(batch);
    await db.delete(schema.media).where(inArray(schema.media.key, batch));
  }
  return { deleted: deleted.length, kept: kept.length };
}
