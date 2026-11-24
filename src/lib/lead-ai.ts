import { qualifyOne } from "@/lib/conversation-ai";
import { relanceQueue } from "@/lib/relances";

/**
 * L'IA suit le COMPORTEMENT des leads en séquence, pas seulement leurs messages (demande de Tao, 24 nov. 2026) :
 * dès qu'une personne fait quelque chose (clic, vidéo, extrait en ligne, paiement commencé, message), sa fiche est
 * réanalysée avec ce comportement dans le contexte, 10 minutes après sa dernière action (on la laisse finir).
 * Tâche des 15 minutes, quelques fiches à la fois (les plus chaudes d'abord).
 */
export async function qualifyLeadsBehavior(limit = 6, now = new Date()) {
  const settled = now.getTime() - 10 * 60_000;
  const items = (await relanceQueue(now))
    .filter((i) => i.lastActionAt && i.lastActionAt.getTime() <= settled && (!i.aiUpdatedAt || i.lastActionAt > i.aiUpdatedAt))
    .sort((a, b) => b.heat.score - a.heat.score)
    .slice(0, limit);
  let qualified = 0;
  for (const i of items) {
    const behavior = `${i.heat.reasons.join(", ")} (chaleur calculée ${i.heat.score}/100)`;
    if (await qualifyOne({ id: i.id, email: i.email, name: i.name, country: i.country, pipelineStage: "sequence" }, now, behavior)) qualified++;
  }
  return { candidates: items.length, qualified };
}
