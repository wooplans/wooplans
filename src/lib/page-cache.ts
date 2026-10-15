/**
 * Cache des pages publiques au bord du réseau Cloudflare (worker.ts).
 * Accueil, catalogue et fiches sont rendus à chaque visite (force-dynamic, lecture D1 à Madrid) :
 * une copie de 5 min par centre de données évite ce rendu pour les visiteurs suivants.
 * Module sans dépendance pour pouvoir être testé isolément.
 */

export const PAGE_CACHE_TTL_SECONDS = 300;

const CACHEABLE_PATHS = [/^\/$/, /^\/catalogue$/, /^\/catalogue-villa$/, /^\/catalogue-duplex$/, /^\/catalogue\/[a-z0-9-]+$/];

/** Paramètres de suivi : ignorés dans la clé (chaque clic Facebook a son fbclid) ; la page ne les lit pas côté serveur. */
const TRACKING_PARAM = /^(utm_[a-z]+|fbclid|gclid|gbraid|wbraid|ttclid|msclkid|igshid)$/i;

/** Requête de page publique pouvant être servie depuis le cache (visiteur anonyme, page HTML complète). */
export function isCacheablePageRequest(method: string, url: URL, headers: Headers) {
  if (method !== "GET") return false;
  if (!CACHEABLE_PATHS.some((re) => re.test(url.pathname))) return false;
  // Navigation interne Next (données RSC) et préchargements : non mis en cache.
  if (url.searchParams.has("_rsc") || headers.has("rsc") || headers.has("next-router-prefetch") || headers.has("next-action")) return false;
  // Membres et administrateurs : toujours la page fraîche.
  const cookie = headers.get("cookie") || "";
  if (/(?:^|;\s*)(wp_member|wp_admin)=/.test(cookie)) return false;
  return true;
}

/** Clé de cache : l'URL sans paramètres de suivi, paramètres triés. */
export function pageCacheKey(url: URL) {
  const key = new URL(url.origin + url.pathname);
  const params = [...url.searchParams.entries()].filter(([name]) => !TRACKING_PARAM.test(name));
  params.sort(([a], [b]) => a.localeCompare(b));
  for (const [name, value] of params) key.searchParams.append(name, value);
  return key.toString();
}

/** La réponse peut être partagée entre visiteurs : page HTML 200 sans cookie posé. */
export function isCacheablePageResponse(status: number, headers: Headers) {
  return status === 200 && (headers.get("content-type") || "").includes("text/html") && !headers.has("set-cookie");
}
