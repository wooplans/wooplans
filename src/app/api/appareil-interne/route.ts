import { NextResponse, type NextRequest } from "next/server";
import { INTERNAL_COOKIE } from "@/lib/behavior";
import { internalCookieOptions, verifyToken, type DeviceToken } from "@/lib/session";

function page(title: string, text: string, status = 200) {
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 16px;line-height:1.5"><h1 style="font-size:1.3rem">${title}</h1><p>${text}</p><p><a href="/">Aller sur le site</a></p></body></html>`;
  return new NextResponse(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

/**
 * Lien des réglages admin : marque l'appareil qui l'ouvre comme interne (un an), sans connexion admin.
 * ?retirer=1 : l'appareil compte de nouveau dans les statistiques.
 */
export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.has("retirer")) {
    const response = page("Appareil compté de nouveau", "Les visites de cet appareil comptent de nouveau dans les statistiques de WOOPLANS.");
    response.cookies.delete(INTERNAL_COOKIE);
    return response;
  }
  const token = await verifyToken<DeviceToken>(request.nextUrl.searchParams.get("cle") ?? undefined, "device");
  if (!token) return page("Lien expiré", "Ce lien n'est plus valable. Générez-en un nouveau dans Admin → Réglages.", 403);
  const response = page(
    "Appareil exclu des statistiques",
    "Les visites de cet appareil (ce navigateur) ne sont plus comptées pendant un an. En navigation privée ou après avoir effacé les cookies, rouvrez ce lien.",
  );
  response.cookies.set(INTERNAL_COOKIE, "1", internalCookieOptions());
  return response;
}
