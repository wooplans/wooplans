/**
 * Filigrane des documents Premium, en trois couches complémentaires :
 * 1. texte diagonal répété sur toute la page, par-dessus le contenu (`label` et `brand`,
 *    dessinés par plan-pdf) ;
 * 2. même marquage incrusté dans les pixels des images (`rasterLines`, voir watermark-raster) :
 *    supprimer le texte du PDF ne nettoie pas les images ;
 * 3. mention d'exemplaire et de licence en bas de chaque page (`footer`).
 * L'identifiant `id` (membre + modèle) permet de retrouver l'origine d'une fuite.
 */
export type Watermark = {
  /** Texte répété en diagonale, ex. « Exemplaire de Awa Diallo · awa@exemple.com ». */
  label: string;
  /** Mention de bas de page, ex. « Exemplaire personnel de awa@… — 15/10/2026 — W-3F9A2C — … ». */
  footer: string;
  /** Identifiant court et stable de l'exemplaire (membre + modèle), pour retrouver une fuite. */
  id: string;
  /** Ligne « marque » alternée avec `label` dans le filigrane. */
  brand: string;
  /** Lignes incrustées dans les images. */
  rasterLines: string[];
};

type MemberLike = { id: string; email: string; name?: string | null };

/** Empreinte courte et déterministe (FNV-1a 32 bits) : pas de secret, seulement un repère. */
export function fingerprint(...parts: string[]) {
  let hash = 0x811c9dc5;
  for (const char of parts.join("|")) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `W-${hash.toString(16).toUpperCase().padStart(8, "0").slice(0, 6)}`;
}

export function watermarkForMember(member: MemberLike, planCode: string, date = new Date(), site = "www.wooplans.com"): Watermark {
  const who = member.name?.trim() ? `${member.name.trim()} · ${member.email}` : member.email;
  const id = fingerprint(member.id, planCode);
  const day = date.toLocaleDateString("fr-FR", { timeZone: "Africa/Douala" });
  const host = site.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return {
    label: `Exemplaire de ${who} · ${id}`,
    brand: `© WOOPLANS · ${host} · Plan ${planCode} · Reproduction et diffusion interdites`,
    footer: `Exemplaire personnel de ${member.email} — ${day} — ${id} — Diffusion publique et usage commercial interdits`,
    id,
    rasterLines: [`${host} · Plan WOOPLANS ${planCode} · Reproduction interdite`, `Exemplaire de ${who} · ${id}`],
  };
}

/** Marquage des distributions affichées dans l'espace Premium (hors fiche PDF). */
export function imageMarkForMember(member: MemberLike, site = "www.wooplans.com") {
  const who = member.name?.trim() ? `${member.name.trim()} · ${member.email}` : member.email;
  const id = fingerprint(member.id, "espace-premium");
  const host = site.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return { id, lines: [`${host} · Plan WOOPLANS · Reproduction interdite`, `Exemplaire de ${who} · ${id}`] };
}
