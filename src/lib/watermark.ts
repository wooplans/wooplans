import { degrees, rgb, type PDFFont, type PDFPage } from "pdf-lib";

/**
 * Filigrane des documents Premium.
 *
 * Interface stable : le reste du code ne connaît que `Watermark`, `watermarkForMember`
 * et `drawWatermark`. Une implémentation plus poussée (marquage invisible, empreinte
 * unique, PDF existants) peut remplacer `drawWatermark` sans toucher aux appelants.
 */
export type Watermark = {
  /** Texte répété en diagonale, ex. « Exemplaire de Awa Diallo · awa@exemple.com ». */
  label: string;
  /** Mention de bas de page, ex. « Document personnel — awa@… — 15/10/2026 — W-3F9A2C ». */
  footer: string;
  /** Identifiant court et stable de l'exemplaire (membre + modèle), pour retrouver une fuite. */
  id: string;
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

export function watermarkForMember(member: MemberLike, planCode: string, date = new Date()): Watermark {
  const who = member.name?.trim() ? `${member.name.trim()} · ${member.email}` : member.email;
  const id = fingerprint(member.id, planCode);
  const day = date.toLocaleDateString("fr-FR", { timeZone: "Africa/Douala" });
  return {
    label: `Exemplaire de ${who}`,
    footer: `Document personnel, ne pas diffuser — ${member.email} — ${day} — ${id}`,
    id,
  };
}

/** Filigrane visible : texte diagonal discret répété sur la page. */
export function drawWatermark(page: PDFPage, mark: Watermark, font: PDFFont) {
  const { width, height } = page.getSize();
  const size = 15;
  const textWidth = font.widthOfTextAtSize(mark.label, size);
  for (let i = 0; i < 4; i++) {
    const y = height * (0.18 + i * 0.22);
    page.drawText(mark.label, {
      x: Math.max(20, (width - textWidth * 0.82) / 2),
      y,
      size,
      font,
      color: rgb(0.06, 0.36, 0.35),
      opacity: 0.11,
      rotate: degrees(28),
    });
  }
}
