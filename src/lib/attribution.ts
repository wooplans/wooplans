export type Attribution = {
  source: string;
  landingPath: string;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  fbclid: boolean;
};

const clean = (value: string | null | undefined, max = 200) => {
  const v = typeof value === "string" ? value.trim() : "";
  return v ? v.slice(0, max) : null;
};

const SOCIAL = /facebook|fb|meta|instagram|ig|tiktok|youtube|whatsapp/i;
const SEARCH = /google\.|bing\.|duckduckgo\.|yahoo\.|ecosia\./i;

/**
 * Classe la provenance d'une visite : UTM d'abord, puis identifiants de clic, puis référent.
 * Facebook ajoute fbclid à TOUS les liens cliqués (publications gratuites comme publicités) :
 * sans UTM, on ne peut pas savoir si c'est payant → « social ». Les publicités se reconnaissent
 * à leurs UTM (utm_medium=paid_social…) ou aux identifiants propres aux régies (ttclid, gclid).
 */
export function classifySource(input: {
  utmSource: string | null;
  utmMedium: string | null;
  fbclid: boolean;
  referrer: string | null;
  adClick?: "social" | "search" | null;
}) {
  const { utmSource, utmMedium, fbclid, referrer, adClick } = input;
  if (utmSource) {
    const paid = utmMedium && /^(cpc|ppc|paid|paid_social|ads?)$/i.test(utmMedium);
    if (SOCIAL.test(utmSource)) return paid ? "social_ads" : "social";
    if (/google|bing/i.test(utmSource)) return paid ? "search_ads" : "search";
    if (/mail|newsletter|resend/i.test(utmSource)) return "email";
    return utmSource.toLowerCase().slice(0, 40);
  }
  if (adClick === "social") return "social_ads";
  if (adClick === "search") return "search_ads";
  if (fbclid) return "social";
  if (referrer) {
    try {
      const host = new URL(referrer).hostname;
      if (/wooplans\.com$/i.test(host)) return "direct";
      if (SEARCH.test(host)) return "search";
      if (SOCIAL.test(host)) return "social";
      return "referral";
    } catch {
      return "referral";
    }
  }
  return "direct";
}

export const CHANNELS = [
  "Facebook",
  "Instagram",
  "YouTube",
  "TikTok",
  "WhatsApp",
  "Google et moteurs",
  "Email",
  "ChatGPT et IA",
  "Autres sites",
  "Direct",
] as const;
export type Channel = (typeof CHANNELS)[number];

const CHANNEL_PATTERNS: [Channel, RegExp][] = [
  ["Instagram", /instagram|^ig$/i],
  ["Facebook", /facebook|^fb$|^meta$|com\.facebook/i],
  ["YouTube", /youtube|youtu\.be|^yt$/i],
  ["TikTok", /tiktok/i],
  ["WhatsApp", /whatsapp|^wa$|^l\.wl\.co$/i],
  ["Email", /mail|newsletter|resend|com\.google\.android\.gm$|outlook/i],
  ["ChatGPT et IA", /chatgpt|openai|perplexity|gemini\.google|copilot|claude\.ai/i],
  ["Google et moteurs", /google|bing|yahoo|duckduckgo|ecosia|qwant|yandex/i],
];

function hostOf(referrer: string) {
  const m = referrer.match(/^[a-z-]+:\/\/([^/?#]+)/i);
  return m ? m[1].toLowerCase() : "";
}

/**
 * Canal lisible (Facebook, YouTube, Google…) d'une visite, pour le tableau de bord : UTM d'abord,
 * puis référent (y compris les applis Android, « android-app://com.facebook.katana »), puis
 * identifiants de clic. Une visite sans aucune trace (lien ouvert depuis WhatsApp, une appli, un favori)
 * reste « Direct ». `paid` : publicité reconnue (UTM payants, ttclid, gclid).
 */
export function channelOf(input: {
  source: string;
  utmSource: string | null;
  fbclid: boolean;
  referrer: string | null;
}): { channel: Channel; paid: boolean } {
  const paid = input.source === "social_ads" || input.source === "search_ads";
  const match = (value: string) => CHANNEL_PATTERNS.find(([, re]) => re.test(value))?.[0];
  if (input.utmSource) return { channel: match(input.utmSource.trim()) ?? "Autres sites", paid };
  const host = input.referrer ? hostOf(input.referrer) : "";
  if (host && !/(^|\.)wooplans\.com$/.test(host)) return { channel: match(host) ?? "Autres sites", paid };
  if (input.fbclid) return { channel: "Facebook", paid };
  if (input.source === "social_ads") return { channel: "TikTok", paid };
  if (input.source === "search_ads") return { channel: "Google et moteurs", paid };
  return { channel: "Direct", paid: false };
}

export function parseAttribution(url: string, referrer: string | null): Attribution {
  const parsed = new URL(url, "https://www.wooplans.com");
  const p = parsed.searchParams;
  const utmSource = clean(p.get("utm_source"));
  const utmMedium = clean(p.get("utm_medium"));
  const fbclid = p.has("fbclid");
  const adClick = p.has("ttclid") ? "social" : p.has("gclid") || p.has("gbraid") || p.has("wbraid") ? "search" : null;
  const ref = clean(referrer, 500);
  return {
    source: classifySource({ utmSource, utmMedium, fbclid, referrer: ref, adClick }),
    landingPath: parsed.pathname.slice(0, 300),
    referrer: ref,
    utmSource,
    utmMedium,
    utmCampaign: clean(p.get("utm_campaign")),
    utmContent: clean(p.get("utm_content")),
    utmTerm: clean(p.get("utm_term")),
    fbclid,
  };
}
