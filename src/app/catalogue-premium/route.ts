import { and, asc, count, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getEnv } from "@/lib/env";
import { VARIANT_COOKIE, chooseVariant, galleryHtml, previewHtml, priceStep, type GalleryPlan } from "@/lib/sales-page";

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
 * Page de vente : HTML statique optimisé (public/lp/), servi sous l'URL canonique /catalogue-premium.
 * Variante A : catalogue-premium.html. Variante B : catalogue-premium-b.html. Les deux sont complétées ici
 * par HTMLRewriter, en flux : nombre de modèles publiés (A et B), galerie et aperçu (B).
 */
export async function GET(request: Request) {
  const env = getEnv();
  const url = new URL(request.url);
  const cookie = request.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${VARIANT_COOKIE}=([ab])`))?.[1];
  const share = Number(env.SALES_PAGE_B_SHARE ?? "0");
  const { variant, remember } = chooseVariant({ query: url.searchParams.get("variante"), cookie, share, random: Math.random() });

  const asset = await env.ASSETS!.fetch(new URL(variant === "b" ? "/lp/catalogue-premium-b" : "/lp/catalogue-premium", request.url));
  if (!asset.ok) return new Response("Page indisponible", { status: 502 });

  const headers = new Headers({
    "Content-Type": "text/html; charset=utf-8",
    // Réponse publique tant que tout le monde reçoit A ; privée dès qu'un tirage ou un aperçu intervient.
    "Cache-Control": share === 0 && variant === "a" && !url.searchParams.has("variante") ? "public, max-age=300, s-maxage=300" : "private, max-age=300",
    "X-Content-Type-Options": "nosniff",
    "X-Page-Variant": variant,
  });
  if (remember) headers.append("Set-Cookie", `${VARIANT_COOKIE}=${variant}; Path=/; Max-Age=2592000; SameSite=Lax; Secure`);

  const data = await salesPageData().catch((error) => {
    console.error(`Page de vente ${variant.toUpperCase()} : données indisponibles`, error);
    return null;
  });
  if (!data || data.count === 0) return new Response(asset.body, { status: 200, headers });
  const count = String(data.count);
  const rewriter = new HTMLRewriter().on("[data-wp-count]", { element: (el) => void el.setInnerContent(count) });
  if (variant === "a") {
    // Titre et balises meta de la page A : « 50+ » remplacé par le nombre de modèles publiés.
    rewriter
      .on("title", { text: (t) => void (t.text.includes("50+") && t.replace(t.text.replaceAll("50+", count))) })
      .on('meta[name="description"], meta[property="og:title"]', {
        element: (el) => void el.setAttribute("content", (el.getAttribute("content") ?? "").replaceAll("50+", count)),
      });
  } else {
    rewriter
      .on("[data-wp-gallery]", { element: (el) => void el.setInnerContent(data.gallery, { html: true }) })
      .on("[data-wp-preview]", { element: (el) => void el.setInnerContent(data.preview, { html: true }) });
    // Palier de prix (100 modèles) : modèles restants et jauge ; mentions retirées une fois le palier atteint.
    const step = priceStep(data.count);
    if (step.reached) rewriter.on("[data-wp-threshold]", { element: (el) => void el.remove() });
    else
      rewriter
        .on("[data-wp-left]", { element: (el) => void el.setInnerContent(step.leftLabel) })
        .on("[data-wp-progress]", { element: (el) => void el.setAttribute("style", `width:${step.percent}%`) });
  }
  return rewriter.transform(new Response(asset.body, { status: 200, headers }));
}
