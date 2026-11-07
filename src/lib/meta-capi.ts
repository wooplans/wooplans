/**
 * API de conversion Meta (Conversions API) : les évènements clés du tunnel sont aussi envoyés par le serveur,
 * en plus du Pixel du navigateur. Ils passent malgré les bloqueurs de publicité, iOS et le chargement tardif du
 * Pixel ; Meta les fusionne avec ceux du Pixel grâce au même event_id (déduplication).
 *
 * - Jeton : secret FB_ACCESS_TOKEN (jamais dans le code). Sans jeton, rien n'est envoyé.
 * - Données personnelles (email, téléphone, nom, pays, identifiant visiteur) hachées en SHA-256 avant l'envoi.
 * - Consentement : mêmes règles que le Pixel (jamais après un refus ; en Europe seulement après accord).
 * - Achats Chariow : déjà envoyés par l'intégration Meta de Chariow, donc pas renvoyés ici (sinon doublons).
 *
 * Doc : https://developers.facebook.com/docs/marketing-api/conversions-api
 */
import { countryRequiresConsent, measurementAllowed, readConsent } from "@/lib/behavior";
import { getEnv, runInBackground, siteUrl } from "@/lib/env";
import { buildMetaPayload, type MetaBrowserContext, type MetaEvent } from "@/lib/meta-capi-data";
import { clientIp } from "@/lib/rate-limit";

export { fbcFromFbclid, metaEventId, parseBrowserContext, type MetaBrowserContext, type MetaEvent, type MetaUser } from "@/lib/meta-capi-data";

const GRAPH_VERSION = "v22.0";

/** Contexte navigateur d'une requête (IP, user-agent, cookies _fbp / _fbc du Pixel). */
export function browserContext(request: Request & { cookies?: { get(name: string): { value: string } | undefined } }): MetaBrowserContext {
  const cookie = (name: string) =>
    request.cookies?.get(name)?.value ??
    request.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))?.[1] ??
    null;
  const ip = clientIp(request.headers);
  return {
    ip: ip === "unknown" ? null : ip,
    ua: request.headers.get("user-agent"),
    fbp: cookie("_fbp"),
    fbc: cookie("_fbc"),
    url: request.headers.get("referer"),
  };
}

/** Mesure autorisée pour cette requête (cookie de consentement + pays Cloudflare). */
export function metaAllowedForRequest(request: Request) {
  return measurementAllowed({
    requiresConsent: countryRequiresConsent(request.headers.get("cf-ipcountry")),
    consent: readConsent(request.headers.get("cookie")),
  });
}

/** Envoie un évènement à Meta. Ne lève jamais d'erreur : un échec de mesure ne bloque pas un achat. */
export async function sendMetaEvent(event: MetaEvent): Promise<boolean> {
  const env = getEnv();
  const token = env.FB_ACCESS_TOKEN;
  const pixelId = process.env.FB_PIXEL_ID || env.FB_PIXEL_ID;
  if (!token || !pixelId || !/^\d+$/.test(pixelId)) return false;
  try {
    const body = await buildMetaPayload(event, siteUrl("/"), env.FB_TEST_EVENT_CODE || undefined);
    const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.error("API de conversion Meta : refus", event.eventName, response.status, (await response.text()).slice(0, 500));
      return false;
    }
    return true;
  } catch (error) {
    console.error("API de conversion Meta : envoi impossible", event.eventName, error);
    return false;
  }
}

/** Envoi en arrière-plan (la réponse au visiteur n'attend pas Meta). */
export function sendMetaEventInBackground(event: MetaEvent) {
  runInBackground(sendMetaEvent(event));
}

