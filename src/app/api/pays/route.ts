import { NextResponse, type NextRequest } from "next/server";

/**
 * Pays du visiteur (en-tête Cloudflare), pour présélectionner l'indicatif du formulaire d'achat.
 * Lu à part : les fiches modèles sont mises en cache et partagées entre visiteurs de pays différents.
 */
export function GET(request: NextRequest) {
  return NextResponse.json({ country: request.headers.get("cf-ipcountry") }, { headers: { "Cache-Control": "private, no-store" } });
}
