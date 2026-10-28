import { getEnv } from "@/lib/env";
import { BADGE_SAMPLE, BADGE_ZONE, detectBadge } from "@/lib/render-badge";

/**
 * Rendus d'un modèle dans R2 (outils MCP list_plan_renders / get_plan_render), en lecture seule.
 * Dimensions et présence de la pastille « Visitez wooplans.com » mesurées par Cloudflare Images,
 * résultat gardé dans le cache Cloudflare (par clé et version du fichier), jamais écrit dans R2 ni D1.
 */

const CACHE_VERSION = "v1";

export type RenderCheck = { width: number | null; height: number | null; watermarked: boolean | null };

async function measure(bytes: Uint8Array): Promise<RenderCheck> {
  const images = getEnv().IMAGES;
  if (!images) return { width: null, height: null, watermarked: null };
  let width: number | null = null;
  let height: number | null = null;
  try {
    const info = await images.info(new Response(bytes).body!);
    if (!("width" in info)) return { width, height, watermarked: null };
    ({ width, height } = info);
    const top = Math.floor(height * BADGE_ZONE.topShare);
    const sample = await images
      .input(new Response(bytes).body!)
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
    console.error("Analyse du rendu impossible", error);
    return { width, height, watermarked: null };
  }
}

/** Taille, type, dimensions et filigrane d'un rendu ; null si le fichier est absent de R2. */
export async function checkRender(key: string, contentType?: string | null) {
  const cache = typeof caches !== "undefined" ? (caches as unknown as { default?: Cache }).default : undefined;
  const head = await getEnv().MEDIA.head(key);
  if (!head) return null;
  const type = contentType || head.httpMetadata?.contentType || "application/octet-stream";
  const base = { content_type: type, size: head.size };
  if (!type.startsWith("image/")) return { ...base, width: null, height: null, watermarked: null };

  const cacheKey = new Request(`https://www.wooplans.com/__rendus/${CACHE_VERSION}/${encodeURIComponent(key)}/${head.etag}`);
  const hit = await cache?.match(cacheKey).catch(() => undefined);
  if (hit) return { ...base, ...((await hit.json()) as RenderCheck) };

  const object = await getEnv().MEDIA.get(key);
  if (!object) return null;
  const check = await measure(new Uint8Array(await object.arrayBuffer()));
  if (cache && check.watermarked !== null) {
    const response = new Response(JSON.stringify(check), { headers: { "Cache-Control": "public, max-age=2592000", "Content-Type": "application/json" } });
    await cache.put(cacheKey, response).catch(() => {});
  }
  return { ...base, ...check };
}

/** Exécute `fn` sur chaque élément, `limit` à la fois (les originaux peuvent peser plusieurs Mo). */
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
