import config from "@/config/videos.json";
import { getDb, schema } from "@/db";
import { randomId } from "@/lib/crypto";
import { inArray } from "drizzle-orm";
import { inChunks } from "@/lib/sql-chunks";

/**
 * Pages vidéo partagées sur WhatsApp (23 nov. 2026) : un lien au lieu d'une pièce jointe (léger, suivi, joli aperçu).
 * Lien personnel envoyé par les relances : /r/<fiche>.v-<clé> (pose le cookie de reconnaissance, puis /video/<clé>).
 */
export type VideoPage = { title: string; intro: string; src?: string; poster?: string; og: string; testimonials?: boolean };
export const VIDEOS = config as Record<string, VideoPage>;
export type VideoEvent = "open" | "play" | "half" | "end" | "cta";

export function videoPage(key: string | null | undefined): VideoPage | null {
  return (key && Object.prototype.hasOwnProperty.call(VIDEOS, key) ? VIDEOS[key] : null) ?? null;
}

export async function recordVideoEvent(prospectId: string | null, video: string, event: VideoEvent) {
  await getDb().insert(schema.videoEvents).values({ id: randomId(), prospectId, video: video.slice(0, 40), event });
}

/** Ce que chaque fiche a regardé : la vidéo la plus avancée (fin > moitié > lecture > ouverture). */
export async function videoActivityByProspect(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  const rows = unique.length
    ? await inChunks(unique, (chunk) => getDb().query.videoEvents.findMany({ where: inArray(schema.videoEvents.prospectId, chunk), columns: { prospectId: true, video: true, event: true } }), 80)
    : [];
  const rank: Record<string, number> = { open: 1, play: 2, half: 3, end: 4, cta: 5 };
  const best = new Map<string, { video: string; event: VideoEvent }>();
  for (const r of rows) {
    if (!r.prospectId) continue;
    const cur = best.get(r.prospectId);
    if (!cur || rank[r.event] > rank[cur.event]) best.set(r.prospectId, { video: r.video, event: r.event });
  }
  return best;
}
