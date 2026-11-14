import { getEnv } from "@/lib/env";

/**
 * Page de remerciement du guide « Quelle maison construire avec votre budget ? » (1 900 FCFA, Chariow) :
 * téléchargement du guide, puis offre du Catalogue Premium. HTML statique (public/lp/guide-merci.html) servi sous
 * l'URL canonique /guide-merci, sans index : c'est l'adresse de redirection du produit Chariow après paiement.
 * La page envoie l'événement d'achat du pixel Meta (value 1900 XAF) : il sert à la campagne « Guide budget ».
 */
export async function GET(request: Request) {
  const asset = await getEnv().ASSETS!.fetch(new URL("/lp/guide-merci", request.url));
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
