import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getEnv } from "@/lib/env";
import { safeKey, serveR2Object } from "@/lib/r2-response";

/** Images publiques (rendus 3D). Les fichiers privés ne sont jamais servis ici. */
export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = safeKey((await params).key);
  if (!key) return new Response("Introuvable", { status: 404 });
  const entry = await getDb().query.media.findFirst({ where: eq(schema.media.key, key) });
  if (!entry || entry.visibility !== "public") return new Response("Introuvable", { status: 404 });
  return serveR2Object(getEnv().MEDIA, key, request, {
    cacheControl: "public, max-age=31536000, immutable",
    contentType: entry.contentType,
  });
}
