import { getEnv } from "@/lib/env";
import { safeKey, serveR2Object } from "@/lib/r2-response";

const VIDEO_KEY = /^[a-z0-9][a-z0-9/_-]*\.mp4$/i;

/** Vidéos de la page de vente et témoignages (bucket cpbook-videos). */
export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = safeKey((await params).key);
  if (!key || !VIDEO_KEY.test(key)) return new Response("Introuvable", { status: 404 });
  return serveR2Object(getEnv().VIDEOS, key, request, {
    cacheControl: "public, max-age=31536000, immutable",
    contentType: "video/mp4",
  });
}

export const HEAD = GET;
