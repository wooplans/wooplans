import { getEnv } from "@/lib/env";
import { BADGE_SAMPLE, BADGE_ZONE, detectBadge } from "@/lib/render-badge";

/**
 * Mesure des images d'un modèle stockées dans R2 (outils MCP list_plan_files / get_plan_file), en lecture seule.
 * Dimensions et présence de la pastille « Visitez wooplans.com » mesurées par Cloudflare Images,
 * en flux (les originaux peuvent peser des dizaines de Mo), résultat gardé dans le cache Cloudflare
 * par clé et version du fichier, jamais écrit dans R2 ni D1.
 */

const CACHE_VERSION = "v1";

export type RenderCheck = { width: number | null; height: number | null; watermarked: boolean | null };

async function measure(key: string, detect: boolean): Promise<RenderCheck> {
  const env = getEnv();
  const images = env.IMAGES;
  if (!images) return { width: null, height: null, watermarked: null };
  const read = async () => (await env.MEDIA.get(key))?.body ?? null;
  let width: number | null = null;
  let height: number | null = null;
  try {
    const first = await read();
    if (!first) return { width, height, watermarked: null };
    const info = await images.info(first);
    if (!("width" in info)) return { width, height, watermarked: null };
    ({ width, height } = info);
    if (!detect) return { width, height, watermarked: null };
    const second = await read();
    if (!second) return { width, height, watermarked: null };
    const top = Math.floor(height * BADGE_ZONE.topShare);
    const sample = await images
      .input(second)
      .transform({
        trim: { top, left: 0, width: Math.floor(width * BADGE_ZONE.widthShare), height: height - top },
        width: BADGE_SAMPLE.width,
        height: BADGE_SAMPLE.height,
        fit: "squeeze",
      })
      .output({ format: "rgb" });
    const rgb = new Uint8Array(await sample.response().arrayBuffer());
    return { width, height, watermarked: detectBadge(rgb) };
  } catch (error) {
    console.error("Analyse de l'image impossible", key, error);
    return { width, height, watermarked: null };
  }
}

/**
 * Type, taille, dimensions et filigrane d'un fichier ; null s'il est absent de R2.
 * `watermarked` connu d'avance (version du site fabriquée par le serveur) : pas de détection.
 */
export async function checkRender(key: string, contentType?: string | null, watermarked?: boolean) {
  const cache = typeof caches !== "undefined" ? (caches as unknown as { default?: Cache }).default : undefined;
  const head = await getEnv().MEDIA.head(key);
  if (!head) return null;
  const type = contentType || head.httpMetadata?.contentType || "application/octet-stream";
  const base = { content_type: type, size: head.size };
  if (!type.startsWith("image/")) return { ...base, width: null, height: null, watermarked: null };

  const cacheKey = new Request(`https://www.wooplans.com/__rendus/${CACHE_VERSION}/${encodeURIComponent(key)}/${head.etag}/${watermarked === undefined ? "detect" : "info"}`);
  const hit = await cache?.match(cacheKey).catch(() => undefined);
  const check = hit ? ((await hit.json()) as RenderCheck) : await measure(key, watermarked === undefined);
  if (!hit && cache && check.width !== null && (watermarked !== undefined || check.watermarked !== null)) {
    const response = new Response(JSON.stringify(check), { headers: { "Cache-Control": "public, max-age=2592000", "Content-Type": "application/json" } });
    await cache.put(cacheKey, response).catch(() => {});
  }
  return { ...base, ...check, ...(watermarked !== undefined ? { watermarked } : {}) };
}

/** Exécute `fn` sur chaque élément, `limit` à la fois. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>) {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
