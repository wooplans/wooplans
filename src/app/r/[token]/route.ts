import { recordWhatsappClick } from "@/lib/pipeline";
import { siteUrl } from "@/lib/env";
import { EXTRAIT_SUITE_PATH } from "@/lib/lead-offers";
import { relanceItem } from "@/lib/relances";
import campaigns from "@/config/wa-campaigns.json";

/**
 * Lien des boutons WhatsApp : /r/<prospect>.<étape> (j1, j3, ou c<campagne>). Enregistre le clic dans le pipeline
 * puis renvoie, avec le suivi UTM, vers la page réservée aux acheteurs de l'extrait ou du guide (relances j1 et j3,
 * depuis le 20 nov.) ou vers la page du Catalogue Premium (campagnes d'offre). Un lien inconnu mène quand même au catalogue.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [id, step = "wa"] = decodeURIComponent(token).slice(0, 80).split(".");
  const campaign = /^[a-z0-9_-]{1,30}$/i.test(step) ? step : "wa";
  if (id) await recordWhatsappClick(id).catch((error) => console.error("Clic WhatsApp non enregistré", error));
  // Campagne d'offre : le code promo est pré-rempli sur la page de vente (?code=…).
  const offer = (campaigns as Record<string, { code: string }>)[campaign];
  const medium = offer ? "campagne" : "sequence";
  const utm = `utm_source=whatsapp&utm_medium=${medium}&utm_campaign=guide_${campaign}`;
  let target = siteUrl(`/catalogue-premium?${utm}${offer ? `&code=${encodeURIComponent(offer.code)}` : ""}`);
  if (id && (campaign === "j1" || campaign === "j3")) {
    const buyer = await relanceItem(id).catch(() => null);
    target = siteUrl(`${EXTRAIT_SUITE_PATH}?${buyer?.offer === "guide" ? "de=guide&" : ""}${utm}`);
  }
  return new Response(null, { status: 302, headers: { Location: target, "Cache-Control": "no-store" } });
}
