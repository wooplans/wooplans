import { getEnv, siteUrl } from "@/lib/env";

/**
 * Version du site d'un rendu, fabriquée par Cloudflare Images à partir de l'original stocké dans R2 :
 * WebP léger (960 px de large au plus : les visiteurs ont souvent une connexion lente) et filigrane
 * uniforme aux couleurs de la charte — motif « wooplans.com » répété en diagonale et pastille
 * « Visitez wooplans.com » en bas à gauche (calques de public/assets/filigrane, voir scripts/build-watermark.py).
 */
export const SITE_RENDER = { maxWidth: 960, quality: 72, badgeShare: 0.3, marginShare: 0.014 };

async function asset(path: string) {
  const env = getEnv();
  const res = await env.ASSETS!.fetch(new URL(path, env.SITE_URL || siteUrl()));
  if (!res.ok || !res.body) throw new Error(`Calque de filigrane introuvable : ${path}`);
  return res.body;
}

/** Fabrique la version du site de l'original `key` (lu en flux dans R2, jamais modifié). */
export async function buildSiteRender(key: string) {
  const env = getEnv();
  const images = env.IMAGES;
  if (!images) throw new Error("Cloudflare Images indisponible : la version du site ne peut pas être fabriquée.");
  const read = async () => {
    const object = await env.MEDIA.get(key);
    if (!object) throw new Error(`Original absent de R2 : ${key}`);
    return object.body;
  };
  const info = await images.info(await read());
  if (!("width" in info)) throw new Error("Rendu illisible (format non pris en charge).");
  const width = Math.min(SITE_RENDER.maxWidth, info.width);
  const height = Math.round((info.height * width) / info.width);
  const margin = Math.round(width * SITE_RENDER.marginShare);
  const result = await images
    .input(await read())
    .transform({ width, fit: "scale-down" })
    .draw(images.input(await asset("/assets/filigrane/motif.png")), { top: 0, left: 0, repeat: true })
    .draw(images.input(await asset("/assets/filigrane/pastille.png")).transform({ width: Math.round(width * SITE_RENDER.badgeShare) }), {
      left: margin,
      bottom: margin,
    })
    .output({ format: "image/webp", quality: SITE_RENDER.quality });
  const bytes = new Uint8Array(await result.response().arrayBuffer());
  return { bytes, width, height, original: { width: info.width, height: info.height } };
}
