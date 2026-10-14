import { getEnv } from "@/lib/env";

/**
 * Page de vente : HTML statique optimisé (public/lp/catalogue-premium.html),
 * servi depuis les assets Cloudflare sous l'URL canonique /catalogue-premium.
 */
export async function GET(request: Request) {
  const asset = await getEnv().ASSETS!.fetch(new URL("/lp/catalogue-premium", request.url));
  if (!asset.ok) return new Response("Page indisponible", { status: 502 });
  return new Response(asset.body, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
