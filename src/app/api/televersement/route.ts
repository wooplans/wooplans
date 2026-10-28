import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireSecret, getEnv } from "@/lib/env";
import { newMediaKey, planMediaFolder, registerMedia } from "@/lib/media-store";
import { FILE_ROLES, UPLOAD_LINK_MAX_BYTES, sniffFileType, verifyUploadToken, type FileRole } from "@/lib/plan-input";
import { attachFileToPlan } from "@/lib/plan-media";
import { declaredSize, prepareIncomingFile } from "@/lib/remote-file";

/**
 * Lien d'envoi temporaire (outil MCP create_upload_link) : ajoute des fichiers à UNE fiche.
 * GET : état de la fiche. PUT : corps brut = un fichier (?role=render|floor_plan|document|video&filename=…&cover=1), transmis en flux vers R2.
 * Vidéos de plus de 40 Mo, en morceaux de VIDEO_PART_BYTES (envoi multipart R2) :
 *   POST ?action=start&filename=…  →  { upload }
 *   PUT  ?action=part&upload=…&part=1, 2, …  (corps = morceau)  →  { partNumber, etag }
 *   POST ?action=complete&upload=…  (corps JSON { parts: [{ partNumber, etag }, …] })
 * Jeton signé dans l'en-tête Authorization (jamais dans l'URL : il resterait dans les journaux).
 */
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });

/** Taille des morceaux d'une vidéo (identique pour tous sauf le dernier, sous la limite de corps des Workers). */
const VIDEO_PART_BYTES = 50 * 1024 * 1024;
const VIDEO_MAX_BYTES = 4 * 1024 * 1024 * 1024;
const VIDEO_TYPES: Record<string, string> = { mp4: "video/mp4", m4v: "video/mp4", mov: "video/quicktime", webm: "video/webm" };

async function authorize(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  const payload = token ? await verifyUploadToken(requireSecret("AUTH_SECRET"), token) : null;
  if (!payload) return null;
  const plan = await getDb().query.plans.findFirst({ where: eq(schema.plans.id, payload.planId) });
  return plan ? { plan, expiresAt: payload.expiresAt } : null;
}

const denied = () => json({ error: "Lien d'envoi invalide ou expiré. Demandez-en un nouveau à l'agent." }, 401);

/** Envoi multipart en cours : clé R2 + identifiant R2, en un seul paramètre sûr pour une URL. */
const encodeUpload = (key: string, uploadId: string) => btoa(JSON.stringify([key, uploadId])).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
function decodeUpload(value: string | null, plan: { code: string }) {
  try {
    const [key, uploadId] = JSON.parse(atob((value || "").replace(/-/g, "+").replace(/_/g, "/"))) as [string, string];
    // Le jeton n'ouvre que le dossier vidéos de ce modèle.
    if (typeof key !== "string" || typeof uploadId !== "string" || !key.startsWith(`private/${planMediaFolder(plan.code)}/videos/`)) return null;
    return { key, uploadId };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const auth = await authorize(request);
  if (!auth) return denied();
  const { plan, expiresAt } = auth;
  const files = await getDb().query.media.findMany({ where: eq(schema.media.planId, plan.id), columns: { kind: true, deleteAfter: true } });
  const count = (kind: string) => files.filter((f) => f.kind === kind && !f.deleteAfter).length;
  return json({
    code: plan.code,
    name: plan.name,
    status: plan.status,
    expires_at: new Date(expiresAt).toISOString(),
    renders: plan.renders,
    cover_image: plan.coverImage,
    floor_plans: plan.floorPlans.length,
    documents: count("document"),
    videos: count("video"),
    max_bytes: UPLOAD_LINK_MAX_BYTES,
    video_part_bytes: VIDEO_PART_BYTES,
  });
}

export async function PUT(request: Request) {
  const auth = await authorize(request);
  if (!auth) {
    await request.body?.cancel().catch(() => {});
    return denied();
  }
  const params = new URL(request.url).searchParams;
  if (params.get("action") === "part") return uploadPart(request, auth.plan, params);
  const role = params.get("role") as FileRole | null;
  if (!role || !FILE_ROLES.includes(role)) return json({ error: "Paramètre role : render, floor_plan, document ou video" }, 400);
  if (!request.body) return json({ error: "Fichier manquant" }, 400);
  try {
    const file = await prepareIncomingFile(request.body, declaredSize(request.headers), UPLOAD_LINK_MAX_BYTES);
    const result = await attachFileToPlan({
      planId: auth.plan.id,
      role,
      file,
      label: params.get("filename"),
      setAsCover: params.get("cover") === "1",
    });
    return json(result);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Échec de l'envoi" }, 400);
  }
}

export async function POST(request: Request) {
  const auth = await authorize(request);
  if (!auth) return denied();
  const { plan } = auth;
  const params = new URL(request.url).searchParams;
  const bucket = getEnv().MEDIA;
  const action = params.get("action");
  try {
    if (action === "start") {
      const filename = (params.get("filename") || "").slice(0, 200);
      const ext = filename.split(".").pop()?.toLowerCase() || "";
      const contentType = VIDEO_TYPES[ext];
      if (!contentType) return json({ error: "Vidéo attendue : fichier .mp4, .m4v, .mov ou .webm" }, 400);
      const key = newMediaKey("private", planMediaFolder(plan.code), ext === "m4v" ? "mp4" : ext, "video");
      const upload = await bucket.createMultipartUpload(key, { httpMetadata: { contentType }, customMetadata: { label: filename } });
      return json({ upload: encodeUpload(key, upload.uploadId), part_bytes: VIDEO_PART_BYTES });
    }
    const target = decodeUpload(params.get("upload"), plan);
    if (!target) return json({ error: "Paramètre upload invalide" }, 400);
    const upload = bucket.resumeMultipartUpload(target.key, target.uploadId);
    if (action === "abort") {
      await upload.abort();
      return json({ aborted: true });
    }
    if (action !== "complete") return json({ error: "Paramètre action : start, complete ou abort" }, 400);

    const body = (await request.json().catch(() => null)) as { parts?: { partNumber: number; etag: string }[] } | null;
    const parts = (body?.parts ?? []).filter((p) => Number.isInteger(p?.partNumber) && typeof p?.etag === "string").sort((a, b) => a.partNumber - b.partNumber);
    if (!parts.length) return json({ error: "Corps JSON attendu : { parts: [{ partNumber, etag }, …] }" }, 400);
    const object = await upload.complete(parts);
    const head = await bucket.get(target.key, { range: { offset: 0, length: 16 } });
    const type = head ? sniffFileType(new Uint8Array(await head.arrayBuffer())) : null;
    if (!type?.contentType.startsWith("video/")) {
      await bucket.delete(target.key);
      return json({ error: "Le fichier reçu n'est pas une vidéo mp4, mov ou webm." }, 400);
    }
    const label = (await bucket.head(target.key))?.customMetadata?.label || null;
    await registerMedia({ key: target.key, visibility: "private", contentType: type.contentType, size: object.size, label, planId: plan.id, kind: "video" });
    return json({ code: plan.code, role: "video", visibility: "private", key: target.key, content_type: type.contentType, size: object.size });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Échec de l'envoi" }, 400);
  }
}

async function uploadPart(request: Request, plan: { code: string }, params: URLSearchParams) {
  const target = decodeUpload(params.get("upload"), plan);
  const part = Number(params.get("part"));
  const size = declaredSize(request.headers);
  if (!target || !Number.isInteger(part) || part < 1 || part > 10_000 || !request.body) {
    await request.body?.cancel().catch(() => {});
    return json({ error: "Paramètres attendus : upload, part (1, 2, …) et le morceau en corps" }, 400);
  }
  if (size === null || size > VIDEO_PART_BYTES || part * VIDEO_PART_BYTES > VIDEO_MAX_BYTES + VIDEO_PART_BYTES) {
    await request.body.cancel().catch(() => {});
    return json({ error: `Morceau de ${VIDEO_PART_BYTES / 1048576} Mo au plus, avec Content-Length (vidéo de ${VIDEO_MAX_BYTES / 1073741824} Go max)` }, 400);
  }
  try {
    const fixed = new FixedLengthStream(size);
    void request.body.pipeTo(fixed.writable).catch(() => {});
    const uploaded = await getEnv().MEDIA.resumeMultipartUpload(target.key, target.uploadId).uploadPart(part, fixed.readable);
    return json({ partNumber: uploaded.partNumber, etag: uploaded.etag });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Échec de l'envoi du morceau" }, 400);
  }
}
