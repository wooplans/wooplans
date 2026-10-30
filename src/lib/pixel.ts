/**
 * Évènements standard du Pixel Meta envoyés par le site (ViewContent, Lead…). Le Pixel est chargé tard
 * (au premier geste ou au repos, et en Europe après accord) : les évènements émis avant son chargement
 * sont gardés en attente puis envoyés par flushPixel, jamais si la mesure est refusée.
 */
const pending: [string, Record<string, unknown> | undefined][] = [];

export function pixelTrack(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  if (window.fbq) {
    window.fbq("track", event, params);
    return;
  }
  pending.push([event, params]);
  if (pending.length > 20) pending.shift();
}

/** Envoie les évènements en attente, une fois le Pixel installé. */
export function flushPixel() {
  if (typeof window === "undefined" || !window.fbq) return;
  for (const [event, params] of pending.splice(0)) window.fbq("track", event, params);
}
