import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getCurrentMember } from "@/lib/auth";
import { getEnv, requireSecret } from "@/lib/env";
import { verifyFileToken } from "@/lib/plan-input";
import { burnWatermark, loadPdfFloorPlan } from "@/lib/plan-pdf-assets";
import { safeKey, serveR2Object } from "@/lib/r2-response";
import { imageMarkForMember } from "@/lib/watermark";

/**
 * Fichiers Premium (distributions cotées, PDF) : session membre active obligatoire.
 * Les images sont servies filigranées au nom du membre (incrustation dans les pixels) :
 * une distribution enregistrée depuis le navigateur porte la même marque que la fiche PDF.
 * Lien temporaire de l'agent (outil MCP get_premium_file, ?jeton=…) : fichier d'origine, sans filigrane, pour ce seul fichier.
 */
export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = safeKey((await params).key);
  const token = new URL(request.url).searchParams.get("jeton");
  const byToken = Boolean(key && token && (await verifyFileToken(requireSecret("AUTH_SECRET"), token, key)));
  const member = byToken ? null : await getCurrentMember();
  if (!byToken && !member) return new Response("Accès réservé aux membres Premium", { status: 401 });

  if (!key) return new Response("Introuvable", { status: 404 });
  const entry = await getDb().query.media.findFirst({ where: eq(schema.media.key, key) });
  if (!entry) return new Response("Introuvable", { status: 404 });

  if (member && entry.contentType.startsWith("image/")) {
    const asset = await loadPdfFloorPlan(key);
    if (asset && asset.type !== "pdf") {
      const marked = await burnWatermark(asset, imageMarkForMember(member, getEnv().SITE_URL), "plan", `${key}@fp`);
      return new Response(marked.bytes, {
        headers: {
          "Content-Type": marked.type === "png" ? "image/png" : "image/jpeg",
          "Cache-Control": "private, max-age=3600",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
  }

  const download = new URL(request.url).searchParams.has("telecharger") ? entry.label || key.split("/").pop() : undefined;
  return serveR2Object(getEnv().MEDIA, key, request, {
    cacheControl: byToken ? "no-store" : "private, max-age=3600",
    contentType: entry.contentType,
    download: download || undefined,
  });
}
