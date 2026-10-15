import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { randomId } from "@/lib/crypto";
import { getEnv } from "@/lib/env";

export type MediaVisibility = "public" | "private";

/** Dossier R2 d'un modèle (même convention que l'admin : référence en minuscules). */
export const planMediaFolder = (code: string) => code.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60) || "plans";

/** Public : URL « /media/<clé> ». Privé : clé R2, servie par /api/premium/fichier aux seuls membres. */
export const mediaReference = (visibility: MediaVisibility, key: string) => (visibility === "public" ? `/media/${key}` : key);

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
}) {
  const folder = input.folder.replace(/[^a-z0-9-]/gi, "").slice(0, 60) || "plans";
  const key = `${input.visibility}/${folder}/${Date.now()}-${randomId(6)}.${input.ext}`;
  const bucket = getEnv().MEDIA;
  await bucket.put(key, input.body, { httpMetadata: { contentType: input.contentType } });
  try {
    await getDb()
      .insert(schema.media)
      .values({ key, visibility: input.visibility, contentType: input.contentType, size: input.size, label: input.label ?? null });
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
