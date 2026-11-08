import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getEnv } from "@/lib/env";
import { MEDIA_QUALITY, parseMediaWidth } from "@/lib/media-size";
import { safeKey, serveR2Object } from "@/lib/r2-response";

const IMMUTABLE = "public, max-age=31536000, immutable";

/**
 * Images publiques (rendus 3D). Les fichiers privés ne sont jamais servis ici.
 * ?w=<largeur> (largeurs de lib/media-size.ts) : version réduite en WebP fabriquée par Cloudflare Images,
 * mise en cache par worker.ts comme l'image d'origine. En cas d'échec, l'image d'origine est servie.
 */
export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = safeKey((await params).key);
  if (!key) return new Response("Introuvable", { status: 404 });
  const entry = await getDb().query.media.findFirst({ where: eq(schema.media.key, key) });
  if (!entry || entry.visibility !== "public") return new Response("Introuvable", { status: 404 });

  const env = getEnv();
  const width = parseMediaWidth(new URL(request.url).searchParams.get("w"));
  if (width && env.IMAGES && entry.contentType?.startsWith("image/") && !request.headers.has("range")) {
    try {
      const object = await env.MEDIA.get(key);
      if (!object) return new Response("Introuvable", { status: 404 });
      const result = await env.IMAGES.input(object.body)
        .transform({ width, fit: "scale-down" })
        .output({ format: "image/webp", quality: MEDIA_QUALITY });
      const bytes = await result.response().arrayBuffer();
      return new Response(request.method === "HEAD" ? null : bytes, {
        headers: {
          "Content-Type": "image/webp",
          "Content-Length": String(bytes.byteLength),
          "Cache-Control": IMMUTABLE,
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (error) {
      // Image d'origine en dernier recours, sans cache long (la version réduite sera retentée plus tard).
      console.error("Version réduite impossible", key, width, error);
      return serveR2Object(env.MEDIA, key, request, { cacheControl: "public, max-age=3600", contentType: entry.contentType });
    }
  }

  return serveR2Object(env.MEDIA, key, request, { cacheControl: IMMUTABLE, contentType: entry.contentType });
}
