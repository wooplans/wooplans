import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getCurrentMember } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { safeKey, serveR2Object } from "@/lib/r2-response";

/** Fichiers Premium (distributions cotées, PDF) : session membre active obligatoire. */
export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const member = await getCurrentMember();
  if (!member) return new Response("Accès réservé aux membres Premium", { status: 401 });

  const key = safeKey((await params).key);
  if (!key) return new Response("Introuvable", { status: 404 });
  const entry = await getDb().query.media.findFirst({ where: eq(schema.media.key, key) });
  if (!entry) return new Response("Introuvable", { status: 404 });

  const download = new URL(request.url).searchParams.has("telecharger") ? entry.label || key.split("/").pop() : undefined;
  return serveR2Object(getEnv().MEDIA, key, request, {
    cacheControl: "private, max-age=3600",
    contentType: entry.contentType,
    download: download || undefined,
  });
}
