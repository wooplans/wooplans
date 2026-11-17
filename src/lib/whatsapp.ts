/**
 * WhatsApp automatique via Genuka (API officielle WhatsApp Business), numéro +237 653 76 99 98.
 * Hors de la fenêtre de 24 h, seuls les messages modèles validés par Meta partent (voir WA_TEMPLATES).
 * Tao répond à la main depuis l'appli WhatsApp Business du même numéro (coexistence).
 */
import { getEnv, siteUrl } from "@/lib/env";
import { firstName } from "@/lib/whatsapp-rules";

export { isStopRequest, verifyGenukaSignature, waNumber } from "@/lib/whatsapp-rules";

const API = "https://wa.genuka.com/api/v1";

/** Modèles soumis à Meta le 17 nov. 2026 (textes validés par Tao). */
export const WA_TEMPLATES = {
  livraison: "guide_livraison",
  /** Livraison de l'Extrait du Catalogue Premium (à soumettre à Meta après accord de Tao sur le texte). */
  livraisonExtrait: "extrait_livraison",
  catalogueVideo: "guide_catalogue_video",
  temoignagePrix: "guide_temoignage_prix",
} as const;

export const WA_MEDIA = {
  catalogueVideo: "/assets/catalogue/catalogue-premium.mp4",
  temoignage: "/assets/whatsapp/temoignage-bassirou.mp4",
};

export function waEnabled() {
  const env = getEnv();
  return Boolean(env.GENUKA_API_KEY && env.GENUKA_CONNECTION_ID);
}

type SendResult = { ok: true; messageId: string | null } | { ok: false; error: string };

async function send(body: Record<string, unknown>): Promise<SendResult> {
  const env = getEnv();
  if (!env.GENUKA_API_KEY || !env.GENUKA_CONNECTION_ID) return { ok: false, error: "whatsapp_disabled" };
  try {
    const res = await fetch(`${API}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.GENUKA_API_KEY}`,
        "Content-Type": "application/json",
        "User-Agent": "wooplans-site/1.0 (+https://www.wooplans.com)",
      },
      body: JSON.stringify({ connectionId: env.GENUKA_CONNECTION_ID, ...body }),
    });
    const json = (await res.json().catch(() => null)) as { data?: { messageId?: string }; error?: string; message?: string; meta?: { code?: number } } | null;
    if (!res.ok) return { ok: false, error: `${res.status} ${json?.error ?? ""} ${json?.meta?.code ?? ""} ${json?.message ?? ""}`.trim() };
    return { ok: true, messageId: json?.data?.messageId ?? null };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

/** J0 : le guide en pièce jointe + bouton « Télécharger le guide » (/api/guide/<achat>). */
export function sendGuideDelivery(to: string, name: string | null, intentId: string, offer: "guide" | "extrait" = "guide") {
  const extrait = offer === "extrait";
  return send({
    to,
    template: {
      name: extrait ? WA_TEMPLATES.livraisonExtrait : WA_TEMPLATES.livraison,
      language: "fr",
      header: {
        document: {
          link: siteUrl(`/api/guide/${intentId}`),
          filename: extrait ? "Extrait-Catalogue-Premium-WooPlans.pdf" : "Guide-WooPlans-des-maisons.pdf",
        },
      },
      body: [firstName(name)],
      buttons: [{ type: "url", text: intentId }],
    },
  });
}

/** J1 : la vidéo du catalogue + bouton suivi (/r/<prospect>.j1). */
export function sendGuideCatalogueVideo(to: string, name: string | null, prospectId: string) {
  return send({
    to,
    template: {
      name: WA_TEMPLATES.catalogueVideo,
      language: "fr",
      header: { video: { link: siteUrl(WA_MEDIA.catalogueVideo) } },
      body: [firstName(name)],
      buttons: [{ type: "url", text: `${prospectId}.j1` }],
    },
  });
}

/** J3 : témoignage de M. Mamadou Bassirou en vidéo + prix barré, bouton suivi (/r/<prospect>.j3). */
export function sendGuideTestimonial(to: string, prospectId: string) {
  return send({
    to,
    template: {
      name: WA_TEMPLATES.temoignagePrix,
      language: "fr",
      header: { video: { link: siteUrl(WA_MEDIA.temoignage) } },
      buttons: [{ type: "url", text: `${prospectId}.j3` }],
    },
  });
}

/** Campagne d'offre (modèle marketing) : image, prénom, date limite, code promo et bouton suivi (/r/<prospect>.<campagne>). */
export function sendCampaignOffer(
  to: string,
  c: { template: string; image: string },
  name: string | null,
  prospectId: string,
  campaignKey: string,
  deadline: string,
  code: string,
) {
  return send({
    to,
    template: {
      name: c.template,
      language: "fr",
      header: { image: { link: siteUrl(c.image) } },
      body: [firstName(name), deadline, code],
      buttons: [{ type: "url", text: `${prospectId}.${campaignKey}` }],
    },
  });
}

/** Message libre : seulement dans les 24 h qui suivent un message du client. */
export function sendText(to: string, text: string) {
  return send({ to, text });
}

