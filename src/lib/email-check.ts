/**
 * Contrôle des adresses email saisies dans le formulaire du plan et devis offert : une faute de frappe dans le
 * domaine (gmial.com) fait rebondir l'email, ce qui abîme la réputation de l'expéditeur et envoie les envois
 * suivants vers les spams. Logique pure (testée sous Node) ; la vérification réseau est à part (domainAcceptsMail).
 */

/** Domaines très courants : une faute de frappe proche d'un de ceux-ci est proposée en correction. */
const COMMON_DOMAINS = [
  "gmail.com", "yahoo.com", "yahoo.fr", "hotmail.com", "hotmail.fr", "outlook.com", "outlook.fr",
  "live.com", "live.fr", "icloud.com", "orange.fr", "free.fr", "wanadoo.fr", "protonmail.com", "msn.com",
];

/** Fautes de frappe fréquentes, corrigées directement. */
const KNOWN_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gamil.com": "gmail.com", "gmail.co": "gmail.com",
  "gmail.cm": "gmail.com", "gmail.con": "gmail.com", "gmail.fr": "gmail.com", "gmaill.com": "gmail.com",
  "gnail.com": "gmail.com", "gmil.com": "gmail.com", "gmal.com": "gmail.com", "gmail.om": "gmail.com",
  "gogglemail.com": "gmail.com", "yaho.com": "yahoo.com", "yahou.com": "yahoo.com", "yahoo.co": "yahoo.com",
  "yahoo.con": "yahoo.com", "yaho.fr": "yahoo.fr", "hotmial.com": "hotmail.com", "hotmai.com": "hotmail.com",
  "hotmail.con": "hotmail.com", "hotmal.com": "hotmail.com", "outlok.com": "outlook.com", "outloook.com": "outlook.com",
  "outlook.con": "outlook.com", "iclod.com": "icloud.com", "icloud.con": "icloud.com",
};

function distance(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

/** Adresse corrigée à proposer (« vous@gmail.com »), ou null si le domaine paraît correct. */
export function suggestEmail(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (COMMON_DOMAINS.includes(domain)) return null;
  const fixed = KNOWN_TYPOS[domain];
  if (fixed) return `${local}@${fixed}`;
  // Domaine proche d'un domaine courant (une ou deux lettres de différence), sans être lui-même courant.
  if (domain.length >= 7) {
    const best = COMMON_DOMAINS.map((d) => ({ d, n: distance(domain, d) })).sort((x, y) => x.n - y.n)[0];
    if (best && best.n <= 1) return `${local}@${best.d}`;
  }
  return null;
}

/** Le domaine reçoit-il des emails ? Requête MX (DNS sur HTTPS) ; en cas d'erreur réseau, on laisse passer. */
export async function domainAcceptsMail(domain: string, fetcher: typeof fetch = fetch): Promise<boolean> {
  try {
    const res = await fetcher(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`, {
      headers: { accept: "application/dns-json" },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return true;
    const json = (await res.json()) as { Status?: number; Answer?: { type: number; data: string }[] };
    if (json.Status === 3) return false; // NXDOMAIN : le domaine n'existe pas
    const mx = (json.Answer ?? []).filter((a) => a.type === 15);
    if (mx.length > 0) return !mx.every((a) => /^0?\s*\.?$/.test(a.data.replace(/^\d+\s+/, ""))); // « null MX » : aucun email accepté
    return true; // pas de MX : un enregistrement A peut suffire, on ne bloque pas
  } catch {
    return true;
  }
}
