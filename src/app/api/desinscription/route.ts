import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/env";
import { normalizeEmail } from "@/lib/members";
import { optOut, verifyUnsubscribe } from "@/lib/unsubscribe";

/**
 * Désinscription : bouton de la page /desinscription (formulaire) ou « un clic » de Gmail / Outlook
 * (POST sur l'adresse de l'en-tête List-Unsubscribe, paramètres dans l'URL).
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const form = (request.headers.get("content-type") || "").includes("application/x-www-form-urlencoded")
    ? await request.formData().catch(() => null)
    : null;
  const field = (name: string) => String(form?.get(name) ?? url.searchParams.get(name) ?? "");
  const email = normalizeEmail(field("e"));
  const scope = await verifyUnsubscribe(email, field("s"), field("t"));
  if (!scope) return new Response("Lien de désinscription invalide", { status: 400 });

  await optOut(email, scope);
  // Bouton de la page : retour sur la page avec confirmation. Un clic depuis la messagerie : simple 200.
  if (form?.get("from_page")) {
    return NextResponse.redirect(siteUrl(`/desinscription?ok=1&s=${scope}`), 303);
  }
  return new Response("Désinscription enregistrée", { status: 200 });
}
