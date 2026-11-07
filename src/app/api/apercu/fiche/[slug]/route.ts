import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getEnv } from "@/lib/env";
import { sniffFileType } from "@/lib/plan-input";

/**
 * Aperçu de la distribution cotée d'un modèle publié (fenêtre « Aperçu du plan et devis » de la fiche) :
 * image réduite (320 px) et floutée par Cloudflare Images AVANT l'envoi. On devine le dessin, rien n'est lisible,
 * et l'original n'est jamais transmis (pas de flou CSS qu'on pourrait retirer). ?n=2 : deuxième niveau.
 */
const WIDTH = 320;
const BLUR = 18;

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const n = Number(new URL(request.url).searchParams.get("n") || "1");
  const index = Number.isInteger(n) && n >= 1 && n <= 9 ? n - 1 : 0;
  const plan = await getDb().query.plans.findFirst({
    columns: { floorPlans: true },
    where: and(eq(schema.plans.slug, slug.slice(0, 120)), eq(schema.plans.status, "published")),
  });
  const ref = plan?.floorPlans[index];
  const key = ref && !/^https?:\/\//.test(ref) ? ref.replace(/^\/media\//, "").replace(/^\//, "") : null;
  if (!key) return new Response("Introuvable", { status: 404 });

  const cache = typeof caches !== "undefined" ? (caches as unknown as { default?: Cache }).default : undefined;
  const cacheKey = new Request(`https://www.wooplans.com/__apercu-fiche/v1/${encodeURIComponent(key)}`);
  const hit = await cache?.match(cacheKey).catch(() => undefined);
  if (hit) return hit;

  const env = getEnv();
  const object = await env.MEDIA.get(key);
  if (!object || !env.IMAGES) return new Response("Introuvable", { status: 404 });
  const bytes = new Uint8Array(await object.arrayBuffer());
  // Distribution déposée en PDF : pas d'image à flouter, la fiche affiche alors un dessin neutre.
  if (sniffFileType(bytes.subarray(0, 16))?.ext === "pdf") return new Response("Introuvable", { status: 404 });
  try {
    const result = await env.IMAGES.input(new Response(bytes).body!)
      .transform({ width: WIDTH, fit: "scale-down", blur: BLUR })
      .output({ format: "image/jpeg", quality: 60 });
    const response = new Response(result.response().body, {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400" },
    });
    await cache?.put(cacheKey, response.clone()).catch(() => {});
    return response;
  } catch (error) {
    console.error("Aperçu flouté de la distribution impossible", error);
    return new Response("Introuvable", { status: 404 });
  }
}
