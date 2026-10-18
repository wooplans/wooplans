import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getCurrentAdmin } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { serveR2Object } from "@/lib/r2-response";

/** Lecture (et téléchargement avec ?dl=1) d'un témoignage reçu : réservé à l'admin. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentAdmin())) return new Response("Non autorisé", { status: 401 });
  const row = await getDb().query.testimonialSubmissions.findFirst({ where: eq(schema.testimonialSubmissions.id, (await params).id) });
  if (!row) return new Response("Introuvable", { status: 404 });
  const ext = row.mediaKey.split(".").pop();
  const download = new URL(request.url).searchParams.has("dl") ? `temoignage-${row.name.replace(/[^\p{L}\p{N}]+/gu, "-")}-${row.id}.${ext}` : undefined;
  return serveR2Object(getEnv().VIDEOS, row.mediaKey, request, { cacheControl: "private, no-store", contentType: row.contentType, download });
}

export const HEAD = GET;
