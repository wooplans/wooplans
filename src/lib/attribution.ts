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

/** Classe la provenance d'une visite : UTM d'abord, puis identifiants de clic, puis référent. */
export function classifySource(input: {
  utmSource: string | null;
  utmMedium: string | null;
  fbclid: boolean;
  referrer: string | null;
}) {
  const { utmSource, utmMedium, fbclid, referrer } = input;
  if (utmSource) {
    const paid = utmMedium && /^(cpc|ppc|paid|paid_social|ads?)$/i.test(utmMedium);
    if (SOCIAL.test(utmSource)) return paid ? "social_ads" : "social";
    if (/google|bing/i.test(utmSource)) return paid ? "search_ads" : "search";
    if (/mail|newsletter|resend/i.test(utmSource)) return "email";
    return utmSource.toLowerCase().slice(0, 40);
  }
  if (fbclid) return "social_ads";
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

export function parseAttribution(url: string, referrer: string | null): Attribution {
  const parsed = new URL(url, "https://www.wooplans.com");
  const p = parsed.searchParams;
  const utmSource = clean(p.get("utm_source"));
  const utmMedium = clean(p.get("utm_medium"));
  const fbclid = p.has("fbclid");
  const ref = clean(referrer, 500);
  return {
    source: classifySource({ utmSource, utmMedium, fbclid, referrer: ref }),
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
