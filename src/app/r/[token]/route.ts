import { recordWhatsappClick } from "@/lib/pipeline";
import { siteUrl } from "@/lib/env";
import { EXTRAIT_SUITE_PATH } from "@/lib/lead-offers";
import { relanceItem } from "@/lib/relances";
import campaigns from "@/config/wa-campaigns.json";
import { videoPage } from "@/lib/videos";
import { prospectByToken, RESERVED_COOKIE, RESERVED_COOKIE_MAX_AGE } from "@/lib/catalogue-offer";

/** Étapes dont le lien mène à la page du prix réservé (relances WhatsApp et emails de la phase de conversion). */
const SUITE_STEPS = new Set(["j3", "j4", "j7", "j7s", "offre", "email"]);
/**
 * Message 2 (J1) : une page vidéo (lien au lieu d'une pièce jointe, 23 nov. 2026). Acheteurs de l'extrait : la VSL validée
 * par Tao le 23 nov. (elle parle de « l'extrait ») ; acheteurs du guide : la vidéo du catalogue.
 */
const VIDEO_STEPS: Record<string, string> = { j1: "vsl" };
const J1_GUIDE_VIDEO = "catalogue";

/**
 * Lien des boutons WhatsApp et des emails : /r/<prospect>.<étape> (j1, j4, j7, j7s, email, ou c<campagne>). Enregistre le clic dans le pipeline
 * puis renvoie, avec le suivi UTM, vers la page réservée aux acheteurs de l'extrait ou du guide (relances j1 et j3,
 * depuis le 20 nov.) ou vers la page du Catalogue Premium (campagnes d'offre). Un lien inconnu mène quand même au catalogue.
 * Le lien est personnel : il pose le cookie qui reconnaît l'acheteur (prix réservé de 29 000 FCFA jusqu'à sa date).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [id, step = "wa"] = decodeURIComponent(token).slice(0, 80).split(".");
  const campaign = /^[a-z0-9_-]{1,30}$/i.test(step) ? step : "wa";
  if (id && campaign !== "email") await recordWhatsappClick(id).catch((error) => console.error("Clic WhatsApp non enregistré", error));
  // Campagne d'offre : le code promo est pré-rempli sur la page de vente (?code=…).
  const offer = (campaigns as Record<string, { code: string }>)[campaign];
  const medium = offer ? "campagne" : "sequence";
  const utm =
    campaign === "email"
      ? "utm_source=email&utm_medium=sequence&utm_campaign=offre_reservee"
      : `utm_source=whatsapp&utm_medium=${medium}&utm_campaign=guide_${campaign}`;
  let target = siteUrl(`/catalogue-premium?${utm}${offer ? `&code=${encodeURIComponent(offer.code)}` : ""}`);
  // Pages vidéo : /r/<fiche>.j1 ou /r/<fiche>.v-<clé> (lien personnel : le cookie reconnaît la personne sur la page).
  let video = VIDEO_STEPS[campaign] ?? (campaign.startsWith("v-") ? campaign.slice(2) : null);
  if (campaign === "j1" && id) {
    const buyer = await relanceItem(id).catch(() => null);
    if (buyer?.offer === "guide") video = J1_GUIDE_VIDEO;
  }
  if (video && videoPage(video)) {
    target = siteUrl(`/video/${video}?${utm}`);
  } else if (id && SUITE_STEPS.has(campaign)) {
    const buyer = await relanceItem(id).catch(() => null);
    target = siteUrl(`${EXTRAIT_SUITE_PATH}?${buyer?.offer === "guide" ? "de=guide&" : ""}${utm}`);
  }
  const headers = new Headers({ Location: target, "Cache-Control": "no-store" });
  const prospect = id ? await prospectByToken(id).catch(() => null) : null;
  if (prospect) {
    headers.append("Set-Cookie", `${RESERVED_COOKIE}=${prospect.id}; Path=/; Max-Age=${RESERVED_COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`);
  }
  return new Response(null, { status: 302, headers });
}
