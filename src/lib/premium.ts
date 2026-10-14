import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

export async function getFavoriteIds(memberId: string) {
  const rows = await getDb().query.favorites.findMany({ where: eq(schema.favorites.memberId, memberId), columns: { planId: true } });
  return new Set(rows.map((r) => r.planId));
}

/** Les fichiers privés sont stockés par clé R2 ; on les sert via la route protégée. */
export function privateFileUrl(keyOrUrl: string, download = false) {
  if (/^https?:\/\//.test(keyOrUrl) || keyOrUrl.startsWith("/")) return keyOrUrl;
  return `/api/premium/fichier/${keyOrUrl.split("/").map(encodeURIComponent).join("/")}${download ? "?telecharger=1" : ""}`;
}

export const NEW_PLAN_DAYS = 60;

export function isNewPlan(publishedAt: Date | null) {
  return Boolean(publishedAt && Date.now() - publishedAt.getTime() < NEW_PLAN_DAYS * 86400_000);
}
