import { getEnv } from "@/lib/env";

/**
 * Page de vente du guide « Quelle maison construire avec votre budget ? » (1 900 FCFA), page d'arrivée des publicités.
 * HTML statique (public/lp/guide-budget.html, généré par le dépôt wooplans-studio) servi sous l'URL canonique
 * /guide-budget, sans index. Le formulaire de la page appelle /api/guide (paiement Chariow par l'API du site).
 */
export async function GET(request: Request) {
  const asset = await getEnv().ASSETS!.fetch(new URL("/lp/guide-budget", request.url));
  if (!asset.ok) return new Response("Page indisponible", { status: 502 });
  return new Response(asset.body, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
