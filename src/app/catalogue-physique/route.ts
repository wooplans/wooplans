import { asc, desc, eq } from "drizzle-orm";
import physical from "@/config/catalogue-physique.json";
import { getDb, schema } from "@/db";
import { getEnv } from "@/lib/env";
import { moreModelsHtml, topModelsHtml, TOP_SIZE, type PhysicalPlan } from "@/lib/physical-page";

const DATA_TTL_MS = 5 * 60_000;
let cached: { at: number; top: string; more: string } | null = null;

/** Modèles du livre montrés sur la page : les 20 phares en grand, les suivants en vignettes (gardés 5 min en mémoire). */
async function pageData() {
  if (cached && Date.now() - cached.at < DATA_TTL_MS) return cached;
  const plans = (await getDb().query.plans.findMany({
    columns: {
      code: true, name: true, category: true, coverImage: true, renders: true, levels: true, surfaceTotal: true,
      bedrooms: true, bathrooms: true, landArea: true, budgetMin: true, budgetMax: true,
    },
    where: eq(schema.plans.status, "published"),
    orderBy: [desc(schema.plans.featured), asc(schema.plans.sortOrder), desc(schema.plans.publishedAt)],
  })) as PhysicalPlan[];
  const withCover = plans.filter((p) => p.coverImage).slice(0, physical.models);
  const rest = withCover.slice(TOP_SIZE);
  cached = { at: Date.now(), top: topModelsHtml(withCover.slice(0, TOP_SIZE)), more: moreModelsHtml(rest) };
  return cached;
}

/**
 * Page de vente du Catalogue Premium imprimé (Cameroun, commande sur WhatsApp) : HTML statique
 * public/lp/catalogue-physique.html (scripts/build-physical-page.py), complété ici par les modèles publiés.
 */
export async function GET(request: Request) {
  const asset = await getEnv().ASSETS!.fetch(new URL("/lp/catalogue-physique", request.url));
  if (!asset.ok) return new Response("Page indisponible", { status: 502 });
  const headers = new Headers({
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "public, max-age=300, s-maxage=300",
    "X-Content-Type-Options": "nosniff",
  });
  const data = await pageData().catch((error) => {
    console.error("Catalogue imprimé : modèles indisponibles", error);
    return null;
  });
  if (!data || !data.top) return new Response(asset.body, { status: 200, headers });
  const rewriter = new HTMLRewriter()
    .on("[data-wp-top]", { element: (el) => void el.setInnerContent(data.top, { html: true }) })
    .on("[data-wp-more]", { element: (el) => void el.setInnerContent(data.more, { html: true }) });
  return rewriter.transform(new Response(asset.body, { status: 200, headers }));
}
