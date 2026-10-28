import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { deleteMedia, planMediaFolder, storeMedia } from "@/lib/media-store";
import { acceptedForRole, type FileRole } from "@/lib/plan-input";
import { privateFileUrl } from "@/lib/premium";
import type { IncomingFile } from "@/lib/remote-file";
import { buildSiteRender } from "@/lib/site-render";

const REFUSED: Record<FileRole, string> = {
  render: "Type refusé : un rendu doit être une image png, jpeg ou webp.",
  floor_plan: "Type refusé : une distribution doit être une image png, jpeg, webp ou un PDF.",
  document: "Type refusé : le document d'un modèle doit être un PDF.",
  video: "Type refusé : une vidéo doit être au format mp4, mov ou webm.",
};

/**
 * Ajoute un fichier à un modèle (outil MCP upload_plan_image et lien d'envoi).
 * render : l'original (haute résolution) est rangé en privé dans R2, puis la version du site
 *   (allégée, filigranée) en est tirée et ajoutée aux rendus publics (couverture si aucune).
 * floor_plan : privé, ajouté aux distributions (membres Premium).
 * document (PDF du modèle) et video (visite guidée) : privés, consultables par l'agent seulement.
 */
export async function attachFileToPlan(input: { planId: string; role: FileRole; file: IncomingFile; label?: string | null; setAsCover?: boolean }) {
  const { role, file } = input;
  if (!acceptedForRole(file.type, role)) {
    if (file.body instanceof ReadableStream) await file.body.cancel().catch(() => {});
    throw new Error(REFUSED[role]);
  }
  if (file.size === 0) throw new Error("Fichier vide");
  if (input.setAsCover && role !== "render") throw new Error("La couverture ne peut être qu'un rendu (role=render).");

  const db = getDb();
  const plan = await db.query.plans.findFirst({ where: eq(schema.plans.id, input.planId), columns: { id: true, code: true } });
  if (!plan) throw new Error("Modèle introuvable");
  const folder = planMediaFolder(plan.code);
  const label = input.label?.slice(0, 200) || null;
  const stored = await storeMedia({
    body: file.body,
    size: file.size,
    contentType: file.type.contentType,
    ext: file.type.ext,
    visibility: "private",
    folder,
    label,
    planId: plan.id,
    kind: role === "render" ? "render_original" : role,
  });
  const base = { code: plan.code, role, content_type: file.type.contentType, size: file.size };
  if (role === "document" || role === "video") return { ...base, visibility: "private", key: stored.key };

  let site: Awaited<ReturnType<typeof storeMedia>> | null = null;
  try {
    let siteInfo: Record<string, unknown> = {};
    if (role === "render") {
      const built = await buildSiteRender(stored.key);
      site = await storeMedia({
        body: built.bytes,
        size: built.bytes.byteLength,
        contentType: "image/webp",
        ext: "webp",
        visibility: "public",
        folder,
        label,
        planId: plan.id,
        kind: "render",
        sourceKey: stored.key,
      });
      siteInfo = {
        original: { key: stored.key, width: built.original.width, height: built.original.height, size: file.size },
        site: { key: site.key, width: built.width, height: built.height, size: built.bytes.byteLength },
      };
    }

    const fresh = (await db.query.plans.findFirst({ where: eq(schema.plans.id, plan.id) }))!;
    const update: Partial<typeof schema.plans.$inferInsert> = { updatedAt: new Date() };
    if (site) {
      update.renders = [...fresh.renders, site.url];
      if (!fresh.coverImage || input.setAsCover) update.coverImage = site.url;
    } else {
      update.floorPlans = [...fresh.floorPlans, stored.key];
    }
    await db.update(schema.plans).set(update).where(eq(schema.plans.id, plan.id));
    return site
      ? {
          ...base,
          visibility: "public",
          key: site.key,
          url: site.url,
          ...siteInfo,
          is_cover: (update.coverImage ?? fresh.coverImage) === site.url,
          count: update.renders!.length,
        }
      : { ...base, visibility: "private", key: stored.key, url: privateFileUrl(stored.key), count: update.floorPlans!.length };
  } catch (error) {
    if (site) await deleteMedia(site.key).catch(() => {});
    await deleteMedia(stored.key).catch(() => {});
    throw error;
  }
}
