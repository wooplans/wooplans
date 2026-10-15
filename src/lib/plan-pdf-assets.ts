import { getEnv } from "@/lib/env";
import type { PdfFloorPlan, PdfImage } from "@/lib/plan-pdf";
import { sniffFileType } from "@/lib/plan-input";

/**
 * Images de la fiche PDF : lues dans R2 (MEDIA), converties en JPEG redimensionné
 * par le binding Cloudflare Images (hors CPU du Worker), mises en cache Cloudflare.
 * Sans le binding, seuls les JPEG/PNG d'origine sont utilisables (le WebP est ignoré).
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
