/**
 * Analyse du comportement des visiteurs (PostHog) : règles communes au navigateur, au serveur et aux tests.
 * Aucune donnée personnelle (email, téléphone, code d'accès) ne doit partir vers PostHog.
 */

/** Pages jamais mesurées : codes d'accès, emails, espace membre, administration. */
const PRIVATE_PREFIXES = ["/admin", "/espace-premium", "/connexion", "/merci", "/televersement", "/desinscription", "/api"];

export function isPrivatePath(pathname: string) {
  return PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export type PageType = "vitrine" | "catalogue" | "fiche_modele" | "page_vente" | "demande_plans" | "contenu";

export function pageType(pathname: string): PageType {
  if (pathname === "/") return "vitrine";
  if (pathname === "/catalogue-premium") return "page_vente";
  if (/^\/catalogue\/[^/]+$/.test(pathname)) return "fiche_modele";
  if (/^\/catalogue(-villa|-duplex)?$/.test(pathname)) return "catalogue";
  if (pathname === "/plans-personnalises") return "demande_plans";
  return "contenu";
}

export function planSlugFromPath(pathname: string) {
  return /^\/catalogue\/([^/]+)$/.exec(pathname)?.[1] ?? null;
}

/** Paramètres d'URL conservés ; tous les autres (email, code, jeton…) sont retirés avant envoi. */
const KEPT_PARAMS = /^(utm_(source|medium|campaign|content|term)|fbclid|gclid|variante|categorie|chambres|niveaux|budget|tri|page)$/;

export function sanitizeUrl(value: unknown): unknown {
  if (typeof value !== "string" || !value) return value;
  try {
    const url = new URL(value);
    for (const key of [...url.searchParams.keys()]) if (!KEPT_PARAMS.test(key)) url.searchParams.delete(key);
    url.hash = "";
    return url.toString();
  } catch {
    return value.split(/[?#]/)[0];
  }
}

const URL_PROPERTIES = ["$current_url", "$referrer", "$initial_referrer", "$initial_current_url", "$session_entry_url", "$session_entry_referrer"];

type CaptureEvent = { event?: string; properties?: Record<string, unknown> } | null;

/** Filtre appliqué à chaque événement avant envoi : rien depuis une page privée, URL nettoyées. */
export function filterEvent<T extends CaptureEvent>(event: T, pathname: string): T | null {
  if (!event || isPrivatePath(pathname)) return null;
  const props = event.properties;
  if (props) for (const key of URL_PROPERTIES) if (key in props) props[key] = sanitizeUrl(props[key]);
  return event;
}

/** Pays où le consentement préalable est requis (UE/EEE, Royaume-Uni, Suisse). */
const CONSENT_COUNTRIES = new Set(
  "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE IS LI NO GB CH".split(" "),
);

export function countryRequiresConsent(country: string | null | undefined) {
  return Boolean(country && CONSENT_COUNTRIES.has(country.toUpperCase()));
}

/** Côté navigateur, sans requête serveur : le fuseau horaire suffit à repérer un visiteur en Europe. */
export function timeZoneRequiresConsent(timeZone: string | null | undefined) {
  return Boolean(timeZone && /^(Europe\/|Atlantic\/(Canary|Madeira|Azores|Reykjavik|Faroe))/.test(timeZone));
}

export const CONSENT_COOKIE = "wp_consent";
export type Consent = "granted" | "denied";

export function readConsent(cookieHeader: string | null | undefined): Consent | null {
  const value = cookieHeader?.match(new RegExp(`(?:^|;\\s*)${CONSENT_COOKIE}=(granted|denied)`))?.[1];
  return (value as Consent | undefined) ?? null;
}

/** Mesure autorisée : jamais après un refus ; en Europe, seulement après un accord. */
export function measurementAllowed(input: { requiresConsent: boolean; consent: Consent | null }) {
  if (input.consent === "denied") return false;
  return !input.requiresConsent || input.consent === "granted";
}

/** Le suffixe « @a » / « @b » des identifiants de CTA de la page de vente indique la variante A/B. */
export function variantFromCta(ctaId: string | null | undefined) {
  return /@([ab])$/.exec(ctaId || "")?.[1] ?? null;
}

/** Noms des événements du tunnel envoyés à PostHog. */
export const FUNNEL_EVENTS = {
  ctaClick: "cta_click",
  checkoutOpen: "checkout_open",
  purchase: "purchase_success",
  planRequest: "plan_request_submit",
  whatsapp: "whatsapp_click",
  // Formulaire du plan et devis (fiche modèle) : ouverture, champs touchés, erreurs, abandon.
  planDevisFormOpen: "plan_devis_form_open",
  planDevisField: "plan_devis_field",
  planDevisInvalid: "plan_devis_invalid",
  planDevisError: "plan_devis_error",
  planDevisFormClose: "plan_devis_form_close",
  // Plan et devis offert (fiche modèle) : ouverture du formulaire, envoi réussi, erreur.
  giftFormOpen: "gift_form_open",
  giftSent: "gift_sent",
  giftError: "gift_error",
} as const;

export const POSTHOG_DEFAULT_HOST = "https://eu.i.posthog.com";

/** Hôte de l'interface PostHog (liens vers les enregistrements) à partir de l'hôte d'ingestion. */
export function posthogUiHost(apiHost: string) {
  return apiHost.replace("://eu.i.", "://eu.").replace("://us.i.", "://us.");
}

export type ServerEvent = { event: string; distinctId: string; properties?: Record<string, unknown> };

/** Corps de l'API d'ingestion PostHog (/batch/) ; sans profil de personne, sans donnée personnelle. */
export function buildBatch(apiKey: string, events: ServerEvent[], now = new Date()) {
  return {
    api_key: apiKey,
    batch: events.map((e) => ({
      event: e.event,
      distinct_id: e.distinctId,
      timestamp: now.toISOString(),
      properties: { ...e.properties, $process_person_profile: false, $lib: "wooplans-server" },
    })),
  };
}
