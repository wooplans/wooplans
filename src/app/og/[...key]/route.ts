import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getEnv } from "@/lib/env";
import { safeKey, serveR2Object } from "@/lib/r2-response";
import { SHARE_IMAGE, shareImageKey } from "@/lib/share-image";

/**
 * Vignette de partage d'une image publique (rendu 3D) : JPEG 1200 × 675 léger, produit par
 * Cloudflare Images (hors CPU du Worker). Mise en cache par worker.ts comme les images /media.
 */
export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const path = safeKey((await params).key);
  const key = path ? shareImageKey(path) : null;
  if (!key) return new Response("Introuvable", { status: 404 });
  const entry = await getDb().query.media.findFirst({ where: eq(schema.media.key, key) });
  if (!entry || entry.visibility !== "public") return new Response("Introuvable", { status: 404 });

  const env = getEnv();
  const object = await env.MEDIA.get(key);
  if (!object) return new Response("Introuvable", { status: 404 });
  try {
    if (!env.IMAGES) throw new Error("binding IMAGES absent");
    const result = await env.IMAGES.input(object.body)
      .transform({ width: SHARE_IMAGE.width, height: SHARE_IMAGE.height, fit: "cover" })
      .output({ format: "image/jpeg", quality: SHARE_IMAGE.quality });
    const bytes = await result.response().arrayBuffer();
    return new Response(request.method === "HEAD" ? null : bytes, {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    // Image d'origine en dernier recours (aperçu possible sur les réseaux qui acceptent le WebP), sans cache long.
    console.error("Vignette de partage impossible", key, error);
    return serveR2Object(env.MEDIA, key, request, { cacheControl: "public, max-age=3600", contentType: entry.contentType });
  }
}
