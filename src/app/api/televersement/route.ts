import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireSecret } from "@/lib/env";
import { UPLOAD_LINK_MAX_BYTES, verifyUploadToken, type ImageRole } from "@/lib/plan-input";
import { attachFileToPlan } from "@/lib/plan-media";
import { declaredSize, prepareIncomingFile } from "@/lib/remote-file";

/**
 * Lien d'envoi temporaire (outil MCP create_upload_link) : ajoute des fichiers à UNE fiche.
 * GET : état de la fiche. PUT : corps brut = un fichier (?role=render|floor_plan&filename=…&cover=1), transmis en flux vers R2.
 * Jeton signé dans l'en-tête Authorization (jamais dans l'URL : il resterait dans les journaux).
 */
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });

async function authorize(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  const payload = token ? await verifyUploadToken(requireSecret("AUTH_SECRET"), token) : null;
  if (!payload) return null;
  const plan = await getDb().query.plans.findFirst({ where: eq(schema.plans.id, payload.planId) });
  return plan ? { plan, expiresAt: payload.expiresAt } : null;
}

const denied = () => json({ error: "Lien d'envoi invalide ou expiré. Demandez-en un nouveau à l'agent." }, 401);

export async function GET(request: Request) {
  const auth = await authorize(request);
  if (!auth) return denied();
  const { plan, expiresAt } = auth;
  return json({
    code: plan.code,
    name: plan.name,
    status: plan.status,
    expires_at: new Date(expiresAt).toISOString(),
    renders: plan.renders,
    cover_image: plan.coverImage,
    floor_plans: plan.floorPlans.length,
    max_bytes: UPLOAD_LINK_MAX_BYTES,
  });
}

export async function PUT(request: Request) {
  const auth = await authorize(request);
  if (!auth) {
    await request.body?.cancel().catch(() => {});
    return denied();
  }
  const params = new URL(request.url).searchParams;
  const role = params.get("role");
  if (role !== "render" && role !== "floor_plan") return json({ error: "Paramètre role : render ou floor_plan" }, 400);
  if (!request.body) return json({ error: "Fichier manquant" }, 400);
  try {
    const file = await prepareIncomingFile(request.body, declaredSize(request.headers), UPLOAD_LINK_MAX_BYTES);
    const result = await attachFileToPlan({
      planId: auth.plan.id,
      role: role as ImageRole,
      file,
      label: params.get("filename"),
      setAsCover: params.get("cover") === "1",
    });
    return json(result);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Échec de l'envoi" }, 400);
  }
}
