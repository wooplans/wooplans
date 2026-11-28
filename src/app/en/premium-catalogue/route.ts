import { and, asc, count, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getEnv } from "@/lib/env";
import { CUSTOM_PLAN_OFFERS } from "@/lib/custom-plans";
import { SHOWCASE_CODE } from "@/lib/sales-page";
import { enPricing, galleryHtmlEn, previewHtmlEn, type EnConfig } from "@/lib/sales-page-en";
import catalogueEn from "@/config/catalogue-en.json";

const CFG = catalogueEn as EnConfig;
const GALLERY_SIZE = 20;
/** Mêmes maisons en tête que la page française (les plus achetées puis les plus vues). */
const TOP_SLUGS = ["villa-v3-017", "villa-v4-005", "duplex-d5-012", "villa-v4-036", "villa-v4-032", "duplex-d4-034"];
const DATA_TTL_MS = 5 * 60_000;
let cached: { at: number; count: number; gallery: string; preview: string } | null = null;

const fullPlansXaf = {
  villa: CUSTOM_PLAN_OFFERS.find((o) => o.category === "villa")!.price,
  duplex: CUSTOM_PLAN_OFFERS.find((o) => o.category === "duplex")!.price,
};

async function pageData() {
  if (cached && Date.now() - cached.at < DATA_TTL_MS) return cached;
  const db = getDb();
  const published = eq(schema.plans.status, "published");
  const columns = {
    slug: true, code: true, name: true, category: true, coverImage: true, levels: true, surfaceTotal: true, bedrooms: true, bathrooms: true,
    floorPlans: true, estimateLots: true,
  } as const;
  const [[total], plans, demo] = await Promise.all([
    db.select({ n: count() }).from(schema.plans).where(published),
    db.query.plans.findMany({
      columns,
      where: and(published),
      orderBy: [desc(schema.plans.featured), asc(schema.plans.sortOrder), desc(schema.plans.publishedAt)],
      limit: 200,
    }),
    db.query.plans.findFirst({ columns, where: and(published, eq(schema.plans.code, SHOWCASE_CODE)) }),
  ]);
  const rank = (slug: string) => (TOP_SLUGS.includes(slug) ? TOP_SLUGS.indexOf(slug) : TOP_SLUGS.length);
  const withCover = plans.filter((p) => p.coverImage).sort((a, b) => rank(a.slug) - rank(b.slug));
  const showcase = demo?.coverImage && demo.floorPlans.length > 0 && demo.estimateLots.length > 0 ? demo : null;
  const preview = previewHtmlEn(
    showcase && { ...showcase, floorPlanUrls: showcase.floorPlans.map((_, i) => `/api/apercu/plan/${i + 1}`), lots: showcase.estimateLots },
  );
  cached = { at: Date.now(), count: total?.n ?? 0, gallery: galleryHtmlEn(withCover.slice(0, GALLERY_SIZE), total?.n ?? 0), preview };
  return cached;
}

/**
 * Page de vente anglaise (Ghana, Kenya) : HTML statique (public/lp/en-premium-catalogue.html, scripts/build-sales-page-en.py)
 * complété ici : prix dans la devise du pays du visiteur (en-tête Cloudflare), nombre de modèles, galerie et aperçu.
 * Réponse privée : les prix dépendent du pays.
 */
export async function GET(request: Request) {
  const env = getEnv();
  const asset = await env.ASSETS!.fetch(new URL("/lp/en-premium-catalogue", request.url));
  if (!asset.ok) return new Response("Page unavailable", { status: 502 });
  const p = enPricing(CFG, request.headers.get("cf-ipcountry"), fullPlansXaf);
  const headers = new Headers({
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "private, max-age=300",
    "X-Content-Type-Options": "nosniff",
  });
  const payHtml = p.pay.map((m) => `<span>${m}</span>`).join("");
  let rewriter = new HTMLRewriter()
    .on("html", { element: (el) => { el.setAttribute("data-cc", p.country); el.setAttribute("data-cur", p.currency); } })
    .on("[data-en-price]", { element: (el) => void el.setInnerContent(p.price) })
    .on("[data-en-price-exact]", { element: (el) => void el.setInnerContent(p.priceExact) })
    .on("[data-en-villa]", { element: (el) => void el.setInnerContent(p.villa) })
    .on("[data-en-twostory]", { element: (el) => void el.setInnerContent(p.duplex) })
    .on("[data-en-pay]", { element: (el) => void el.setInnerContent(payHtml, { html: true }) });
  const data = await pageData().catch((error) => {
    console.error("Page anglaise : données indisponibles", error);
    return null;
  });
  if (data && data.count > 0) {
    const n = String(data.count);
    rewriter = rewriter
      .on("[data-wp-count]", { element: (el) => void el.setInnerContent(n) })
      .on("[data-wp-gallery]", { element: (el) => void el.setInnerContent(data.gallery, { html: true }) })
      .on("[data-wp-preview]", { element: (el) => void el.setInnerContent(data.preview, { html: true }) });
  }
  return rewriter.transform(new Response(asset.body, { status: 200, headers }));
}
