import { getEnv } from "@/lib/env";
import type { PdfFloorPlan, PdfImage } from "@/lib/plan-pdf";
import { sniffFileType } from "@/lib/plan-input";
import { fingerprint } from "@/lib/watermark";
import { imageSize, watermarkOverlayPng, type OverlayStrength } from "@/lib/watermark-raster";

/**
 * Images de la fiche PDF : lues dans R2 (MEDIA), converties en JPEG redimensionné
 * par le binding Cloudflare Images (hors CPU du Worker), mises en cache Cloudflare.
 * Sans le binding, seuls les JPEG/PNG d'origine sont utilisables (le WebP est ignoré).
 *
 * `burnWatermark` incruste ensuite le filigrane du membre dans les pixels : l'image
 * extraite du PDF le conserve. Le résultat est mis en cache par membre et par image.
 */

const CACHE_VERSION = "v1";

function r2Key(ref: string) {
  if (!ref || /^https?:\/\//.test(ref)) return null;
  return ref.replace(/^\/media\//, "").replace(/^\//, "");
}

async function readR2(key: string) {
  const object = await getEnv().MEDIA.get(key);
  return object ? new Uint8Array(await object.arrayBuffer()) : null;
}

async function toJpeg(bytes: Uint8Array, width: number): Promise<Uint8Array | null> {
  const images = getEnv().IMAGES;
  if (!images) return null;
  try {
    const stream = new Response(bytes).body!;
    const result = await images
      .input(stream)
      .transform({ width, fit: "scale-down" })
      .output({ format: "image/jpeg", quality: 78 });
    return new Uint8Array(await result.response().arrayBuffer());
  } catch (error) {
    console.error("Conversion d'image pour le PDF impossible", error);
    return null;
  }
}

/** Fichier prêt pour pdf-lib (JPEG/PNG), ou PDF pour une distribution. */
async function loadAsset(ref: string, width: number, allowPdf: boolean): Promise<PdfFloorPlan | null> {
  const key = r2Key(ref);
  if (!key) return null;
  const cacheKey = new Request(`https://www.wooplans.com/__fiche-pdf/${CACHE_VERSION}/${width}/${encodeURIComponent(key)}`);
  const cache = typeof caches !== "undefined" ? (caches as unknown as { default?: Cache }).default : undefined;
  const hit = await cache?.match(cacheKey).catch(() => undefined);
  if (hit) {
    const bytes = new Uint8Array(await hit.arrayBuffer());
    const type = hit.headers.get("x-pdf-type") as PdfFloorPlan["type"];
    return { bytes, type };
  }

  const original = await readR2(key);
  if (!original) return null;
  const sniffed = sniffFileType(original.subarray(0, 16))?.ext;
  let asset: PdfFloorPlan | null = null;
  if (sniffed === "pdf") asset = allowPdf ? { bytes: original, type: "pdf" } : null;
  else {
    const jpeg = await toJpeg(original, width);
    if (jpeg) asset = { bytes: jpeg, type: "jpg" };
    else if (sniffed === "jpg" || sniffed === "png") asset = { bytes: original, type: sniffed };
  }
  if (asset && cache) {
    const response = new Response(asset.bytes, {
      headers: { "Cache-Control": "public, max-age=2592000", "x-pdf-type": asset.type, "Content-Type": "application/octet-stream" },
    });
    await cache.put(cacheKey, response).catch(() => {});
  }
  return asset;
}

export async function loadPdfImage(ref: string, width = 1400): Promise<PdfImage | null> {
  const asset = await loadAsset(ref, width, false);
  return asset && asset.type !== "pdf" ? (asset as PdfImage) : null;
}

export async function loadPdfFloorPlan(ref: string): Promise<PdfFloorPlan | null> {
  // Distributions cotées : plus grande résolution, les cotes doivent rester lisibles une fois imprimées.
  return loadAsset(ref, 2200, true);
}

export async function loadLogo(): Promise<Uint8Array | null> {
  try {
    const env = getEnv();
    const res = await env.ASSETS!.fetch(new URL("/assets/wooplans-logo-white.png", env.SITE_URL));
    return res.ok ? new Uint8Array(await res.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

/** Lignes de texte incrustées dans les images d'un exemplaire. */
export type RasterMark = { id: string; lines: string[] };

/**
 * Image filigranée au nom du membre (fusion par Cloudflare Images, hors CPU du Worker).
 * Les distributions au format PDF passent telles quelles (filigrane texte seulement).
 * En cas d'échec, l'image est servie sans incrustation plutôt que de bloquer la fiche :
 * le filigrane vectoriel du PDF reste en place, et l'erreur est journalisée.
 */
export async function burnWatermark<T extends PdfFloorPlan>(asset: T, mark: RasterMark, strength: OverlayStrength, cacheId: string): Promise<T> {
  if (asset.type === "pdf") return asset;
  const images = getEnv().IMAGES;
  const size = imageSize(asset.bytes);
  if (!images || !size) {
    console.error("Filigrane incrusté impossible : binding IMAGES absent ou image illisible", cacheId);
    return asset;
  }
  const cache = typeof caches !== "undefined" ? (caches as unknown as { default?: Cache }).default : undefined;
  const variant = fingerprint(mark.id, ...mark.lines, strength, String(asset.bytes.length));
  const cacheKey = new Request(`https://www.wooplans.com/__fiche-pdf/${CACHE_VERSION}/marked/${variant}/${encodeURIComponent(cacheId)}`);
  const hit = await cache?.match(cacheKey).catch(() => undefined);
  if (hit) return { ...asset, bytes: new Uint8Array(await hit.arrayBuffer()), type: "jpg" };

  try {
    const overlay = await watermarkOverlayPng(size.width, size.height, mark.lines, strength);
    const result = await images
      .input(new Response(asset.bytes).body!)
      .draw(images.input(new Response(overlay.png).body!).transform({ width: size.width, height: size.height, fit: "squeeze" }), { top: 0, left: 0 })
      .output({ format: "image/jpeg", quality: 80 });
    const bytes = new Uint8Array(await result.response().arrayBuffer());
    if (cache) {
      const response = new Response(bytes, { headers: { "Cache-Control": "private, max-age=2592000", "Content-Type": "image/jpeg" } });
      await cache.put(cacheKey, response).catch(() => {});
    }
    return { ...asset, bytes, type: "jpg" };
  } catch (error) {
    console.error("Filigrane incrusté impossible", cacheId, error);
    return asset;
  }
}
