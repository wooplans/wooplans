import { and, asc, count, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getEnv } from "@/lib/env";
import { cataloguePrice } from "@/lib/site";
import { PAY_COOKIE, paymentProvider } from "@/lib/wajub";
import { galleryHtml, perModelLabel, previewHtml, type GalleryPlan } from "@/lib/sales-page";

const GALLERY_SIZE = 8;
const DATA_TTL_MS = 5 * 60_000;
let cached: { at: number; count: number; gallery: string; preview: string } | null = null;

/** Nombre de modèles publiés, galerie et aperçu (modèles en vedette d'abord), gardés 5 min en mémoire. */
async function salesPageData() {
  if (cached && Date.now() - cached.at < DATA_TTL_MS) return cached;
  const db = getDb();
  const published = eq(schema.plans.status, "published");
  const [[total], plans] = await Promise.all([
    db.select({ n: count() }).from(schema.plans).where(published),
    db.query.plans.findMany({
      columns: {
        name: true, category: true, coverImage: true, levels: true, surfaceTotal: true, bedrooms: true, bathrooms: true,
        budgetMin: true, budgetMax: true, rooms: true, floorPlans: true, estimateLots: true,
      },
      where: and(published),
      orderBy: [desc(schema.plans.featured), asc(schema.plans.sortOrder), desc(schema.plans.publishedAt)],
      limit: GALLERY_SIZE * 3,
    }),
  ]);
  const withCover = plans.filter((p) => p.coverImage);
  // Aperçu : le premier modèle (en vedette d'abord) qui a plan coté et devis par lots.
  const showcase = withCover.find((p) => p.floorPlans.length > 0 && p.estimateLots.length > 0) ?? null;
  const preview = previewHtml(
    showcase && {
      ...showcase,
      roomsCount: showcase.rooms.length,
      floorPlansCount: showcase.floorPlans.length,
      lotLabels: showcase.estimateLots.map((l) => l.label),
    },
  );
  cached = { at: Date.now(), count: total?.n ?? 0, gallery: galleryHtml(withCover.slice(0, GALLERY_SIZE) as GalleryPlan[]), preview };
  return cached;
}

/**
 * Page de vente : HTML statique optimisé (public/lp/catalogue-premium.html), servi sous l'URL canonique
 * /catalogue-premium et complété ici par HTMLRewriter, en flux : nombre de modèles publiés, galerie et aperçu.
 */
export async function GET(request: Request) {
  const env = getEnv();
  const url = new URL(request.url);

  const asset = await env.ASSETS!.fetch(new URL("/lp/catalogue-premium", request.url));
  if (!asset.ok) return new Response("Page indisponible", { status: 502 });

  const headers = new Headers({
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "public, max-age=300, s-maxage=300",
    "X-Content-Type-Options": "nosniff",
  });

  // Prestataire de paiement : PAYMENT_PROVIDER, ou l'aperçu ?paiement=wajub|chariow gardé 7 jours.
  const payQuery = url.searchParams.get("paiement");
  const payCookie = request.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${PAY_COOKIE}=(wajub|chariow)`))?.[1];
  if (payQuery === "wajub" || payQuery === "chariow") {
    headers.append("Set-Cookie", `${PAY_COOKIE}=${payQuery}; Path=/; Max-Age=604800; SameSite=Lax; Secure`);
  }
  const wajub = paymentProvider(payQuery || payCookie) === "wajub";
  if (wajub || payQuery || payCookie) headers.set("Cache-Control", "private, no-store");
  const payRewriter = new HTMLRewriter().on("html", { element: (el) => void (wajub && el.setAttribute("data-pay", "wajub")) });

  const data = await salesPageData().catch((error) => {
    console.error("Page de vente : données indisponibles", error);
    return null;
  });
  if (!data || data.count === 0) return payRewriter.transform(new Response(asset.body, { status: 200, headers }));
  const count = String(data.count);
  const rewriter = new HTMLRewriter()
    .on("[data-wp-count]", { element: (el) => void el.setInnerContent(count) })
    .on("[data-wp-gallery]", { element: (el) => void el.setInnerContent(data.gallery, { html: true }) })
    .on("[data-wp-preview]", { element: (el) => void el.setInnerContent(data.preview, { html: true }) })
    .on("[data-wp-per-model]", { element: (el) => void el.setInnerContent(perModelLabel(data.count, cataloguePrice())) });
  return payRewriter.transform(rewriter.transform(new Response(asset.body, { status: 200, headers })));
}
