/**
 * Évènements standard du Pixel Meta envoyés par le site (ViewContent, Lead…). Le Pixel est chargé tard
 * (au premier geste ou au repos, et en Europe après accord) : les évènements émis avant son chargement
 * sont gardés en attente puis envoyés par flushPixel, jamais si la mesure est refusée.
 */
import { measurementAllowed, readConsent, timeZoneRequiresConsent } from "@/lib/behavior";

const pending: [string, Record<string, unknown> | undefined, { eventID: string } | undefined][] = [];

/** Installe le Pixel Meta (code d'installation officiel), puis envoie les évènements en attente. */
export function loadPixel(pixelId: string) {
  if (typeof window === "undefined" || window.fbq || !/^\d+$/.test(pixelId)) return;
  const script = document.createElement("script");
  script.text = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`;
  document.head.appendChild(script);
  flushPixel();
}

/** Mesure autorisée pour ce visiteur (en Europe, seulement après accord via le bandeau). */
export function pixelAllowed() {
  if (typeof window === "undefined") return false;
  const requiresConsent = timeZoneRequiresConsent(Intl.DateTimeFormat().resolvedOptions().timeZone);
  return measurementAllowed({ requiresConsent, consent: readConsent(document.cookie) });
}

/**
 * Achat confirmé (page /merci, privée : le Pixel n'y est pas chargé par la mise en page). Charge le Pixel pour
 * ce seul évènement si la mesure est autorisée ; eventID = achat, pour qu'un achat ne compte qu'une fois.
 */
export function pixelPurchase(pixelId: string | undefined, eventId: string, params: Record<string, unknown>) {
  if (!pixelId || !pixelAllowed()) return;
  if (window.fbq) window.fbq("track", "Purchase", params, { eventID: eventId });
  else {
    pending.push(["Purchase", params, { eventID: eventId }]);
    loadPixel(pixelId);
  }
}

export function pixelTrack(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  if (window.fbq) {
    window.fbq("track", event, params);
    return;
  }
  pending.push([event, params, undefined]);
  if (pending.length > 20) pending.shift();
}

/** Envoie les évènements en attente, une fois le Pixel installé. */
export function flushPixel() {
  if (typeof window === "undefined" || !window.fbq) return;
  for (const [event, params, options] of pending.splice(0)) window.fbq("track", event, params, ...(options ? [options] : []));
}
