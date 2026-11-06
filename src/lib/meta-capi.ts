/**
 * API Conversions de Meta : envoie l'achat depuis le serveur, au moment où Chariow confirme le paiement.
 * Le Pixel du navigateur ne suffit pas : l'acheteur paie sur Chariow (Mobile Money) et ne revient pas toujours sur /merci.
 * Le même eventID que le Pixel (« wp_purchase_<intention> ») évite le double comptage quand les deux partent.
 * Sans le secret META_CAPI_TOKEN, rien n'est envoyé. Les adresses email et numéros partent hachés (SHA-256), jamais en clair.
 */
const GRAPH_VERSION = "v21.0";

export type PurchaseInput = {
  eventId: string;
  value: number;
  currency: string;
  contentName: string;
  occurredAt: Date;
  email: string | null;
  phone: string | null;
  country: string | null;
  sourceUrl: string;
};

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Normalisation demandée par Meta avant hachage : minuscules sans espaces ; numéro en chiffres seulement. */
export async function hashedUserData(input: Pick<PurchaseInput, "email" | "phone" | "country">) {
  const email = input.email?.trim().toLowerCase();
  const phone = input.phone?.replace(/\D/g, "");
  const country = input.country?.trim().toLowerCase();
  return {
    ...(email ? { em: [await sha256(email)] } : {}),
    ...(phone && phone.length >= 6 ? { ph: [await sha256(phone)] } : {}),
    ...(country && /^[a-z]{2}$/.test(country) ? { country: [await sha256(country)] } : {}),
  };
}

export async function buildPurchaseEvent(input: PurchaseInput) {
  return {
    event_name: "Purchase",
    event_time: Math.floor(input.occurredAt.getTime() / 1000),
    event_id: input.eventId,
    action_source: "website",
    event_source_url: input.sourceUrl,
    user_data: await hashedUserData(input),
    custom_data: { value: input.value, currency: input.currency, content_name: input.contentName },
  };
}

/** Envoie l'achat à Meta. Renvoie « sent », « skipped » (pas de secret ou valeur nulle) ou « failed ». L'appelant écarte les acheteurs d'Europe (consentement inconnu côté serveur). */
export async function sendMetaPurchase(
  pixelId: string | undefined,
  token: string | undefined,
  input: PurchaseInput,
): Promise<"sent" | "skipped" | "failed"> {
  if (!pixelId || !token || input.value <= 0) return "skipped";
  const event = await buildPurchaseEvent(input);
  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [event], access_token: token }),
    });
    if (!res.ok) {
      console.error("API Conversions Meta : refus", res.status, (await res.text()).slice(0, 300));
      return "failed";
    }
    return "sent";
  } catch (error) {
    console.error("API Conversions Meta : envoi impossible", error);
    return "failed";
  }
}
