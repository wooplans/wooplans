/**
 * API de conversion Meta : partie sans dépendance (format des évènements, hachage SHA-256 des données
 * personnelles), testée dans tests/meta-capi.test.ts. L'envoi est dans src/lib/meta-capi.ts.
 */
/** Contexte navigateur gardé avec l'intention d'achat, pour l'achat confirmé plus tard par le webhook. */
export type MetaBrowserContext = { ip?: string | null; ua?: string | null; fbp?: string | null; fbc?: string | null; url?: string | null };

export type MetaUser = {
  email?: string | null;
  phone?: string | null;
  /** Nom complet : découpé en prénom / nom. */
  name?: string | null;
  country?: string | null;
  externalId?: string | null;
};

export type MetaEvent = {
  eventName: "PageView" | "ViewContent" | "Lead" | "InitiateCheckout" | "Purchase" | "CompleteRegistration";
  eventId: string;
  eventSourceUrl?: string | null;
  eventTime?: Date;
  user: MetaUser;
  browser?: MetaBrowserContext | null;
  customData?: Record<string, unknown>;
};

/** Identifiant d'évènement partagé avec le Pixel (même valeur des deux côtés = un seul évènement compté). */
export function metaEventId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Valeur du cookie _fbc à partir d'un fbclid (format Meta : fb.1.<horodatage ms>.<fbclid>). */
export function fbcFromFbclid(fbclid: string, now = Date.now()) {
  return `fb.1.${now}.${fbclid}`;
}

function normalizeForHash(kind: "em" | "ph" | "fn" | "ln" | "country" | "external_id", value: string) {
  const v = value.trim().toLowerCase();
  if (kind === "ph") return v.replace(/\D/g, "");
  if (kind === "fn" || kind === "ln") return v.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "");
  if (kind === "country") return v.slice(0, 2);
  return v;
}

/** Données utilisateur au format Meta (hachées, sauf IP, user-agent, fbp, fbc). */
export async function buildUserData(user: MetaUser, browser?: MetaBrowserContext | null) {
  const [first, ...rest] = (user.name || "").trim().split(/\s+/);
  const raw: [string, "em" | "ph" | "fn" | "ln" | "country" | "external_id", string | null | undefined][] = [
    ["em", "em", user.email],
    ["ph", "ph", user.phone],
    ["fn", "fn", first],
    ["ln", "ln", rest.join(" ")],
    ["country", "country", user.country],
    ["external_id", "external_id", user.externalId],
  ];
  const data: Record<string, unknown> = {};
  for (const [key, kind, value] of raw) {
    const normalized = value ? normalizeForHash(kind, value) : "";
    if (normalized) data[key] = [await sha256(normalized)];
  }
  if (browser?.ip) data.client_ip_address = browser.ip;
  if (browser?.ua) data.client_user_agent = browser.ua;
  if (browser?.fbp) data.fbp = browser.fbp;
  if (browser?.fbc) data.fbc = browser.fbc;
  return data;
}

/** Corps de la requête envoyée à Meta (séparé de l'envoi pour les tests). */
export async function buildMetaPayload(event: MetaEvent, fallbackUrl: string, testEventCode?: string) {
  const body: Record<string, unknown> = {
    data: [
      {
        event_name: event.eventName,
        event_time: Math.floor((event.eventTime ?? new Date()).getTime() / 1000),
        event_id: event.eventId,
        action_source: "website",
        event_source_url: event.eventSourceUrl || event.browser?.url || fallbackUrl,
        user_data: await buildUserData(event.user, event.browser),
        ...(event.customData ? { custom_data: event.customData } : {}),
      },
    ],
  };
  if (testEventCode) body.test_event_code = testEventCode;
  return body;
}

/** Contexte navigateur enregistré avec l'intention (colonne meta_context), relu au moment de l'achat. */
export function parseBrowserContext(value: string | null | undefined): MetaBrowserContext | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as MetaBrowserContext;
  } catch {
    return null;
  }
}
