import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { deleteMedia, planMediaFolder, storeMedia } from "@/lib/media-store";
import { acceptedForRole, type ImageRole } from "@/lib/plan-input";
import { privateFileUrl } from "@/lib/premium";
import type { IncomingFile } from "@/lib/remote-file";

/**
 * Ajoute un fichier à la galerie d'une fiche (outil MCP upload_plan_image et lien d'envoi).
 * render : public, ajouté aux rendus (couverture si aucune). floor_plan : privé, ajouté aux distributions.
 */
export async function attachFileToPlan(input: { planId: string; role: ImageRole; file: IncomingFile; label?: string | null; setAsCover?: boolean }) {
  const { role, file } = input;
  if (!acceptedForRole(file.type, role)) {
    if (file.body instanceof ReadableStream) await file.body.cancel().catch(() => {});
    throw new Error(
      role === "render" ? "Type refusé : un rendu doit être une image png, jpeg ou webp." : "Type refusé : une distribution doit être une image png, jpeg, webp ou un PDF.",
    );
  }
  if (file.size === 0) throw new Error("Fichier vide");
  if (input.setAsCover && role !== "render") throw new Error("La couverture ne peut être qu'un rendu (role=render).");

  const db = getDb();
  const plan = await db.query.plans.findFirst({ where: eq(schema.plans.id, input.planId), columns: { id: true, code: true } });
  if (!plan) throw new Error("Modèle introuvable");
  const visibility = role === "render" ? "public" : "private";
  const stored = await storeMedia({
    body: file.body,
    size: file.size,
    contentType: file.type.contentType,
    ext: file.type.ext,
    visibility,
    folder: planMediaFolder(plan.code),
    label: input.label?.slice(0, 200) || null,
  });

  try {
    const fresh = (await db.query.plans.findFirst({ where: eq(schema.plans.id, plan.id) }))!;
    const update: Partial<typeof schema.plans.$inferInsert> = { updatedAt: new Date() };
    if (role === "render") {
      update.renders = [...fresh.renders, stored.url];
      if (!fresh.coverImage || input.setAsCover) update.coverImage = stored.url;
    } else {
      update.floorPlans = [...fresh.floorPlans, stored.key];
    }
    await db.update(schema.plans).set(update).where(eq(schema.plans.id, plan.id));
    return {
      code: plan.code,
      role,
      visibility,
      content_type: file.type.contentType,
      size: file.size,
      key: stored.key,
      url: role === "render" ? stored.url : privateFileUrl(stored.key),
      is_cover: (update.coverImage ?? fresh.coverImage) === stored.url,
      count: role === "render" ? update.renders!.length : update.floorPlans!.length,
    };
  } catch (error) {
    await deleteMedia(stored.key).catch(() => {});
    throw error;
  }
}
