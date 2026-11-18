/**
 * Relances WhatsApp à la main (provisoire, tant que Meta bloque les envois par l'API) : chaque acheteur du guide
 * ou de l'extrait reçoit 3 messages, que Tao envoie en un clic depuis /admin/relances (lien wa.me pré-rempli).
 * Message 1 = livraison (tout de suite), message 2 = le catalogue (+24 h), message 3 = témoignage + prix (+48 h).
 * Un acheteur du Catalogue Premium sort de la file automatiquement (rapprochement toutes les 15 min, et ici).
 */
import { and, desc, eq, inArray, isNull, lt } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { siteUrl } from "@/lib/env";
import { GUIDE } from "@/lib/guide";
import { EXTRAIT_MODELS, LEAD_CTA_IDS, LEAD_OFFERS } from "@/lib/lead-offers";
import { WA_DELAYS_HOURS } from "@/lib/pipeline";
import { formatFcfa } from "@/lib/plans";
import { isCustomer } from "@/lib/prospects";
import { cataloguePrice, cataloguePriceBefore } from "@/lib/site";
import { firstName, waNumber } from "@/lib/whatsapp-rules";

const HOUR = 3_600_000;

export const RELANCE_STEPS = [
  { title: "Message 1 · Livraison", when: "dès l'achat", file: "Le PDF" },
  { title: "Message 2 · Le catalogue", when: "le lendemain", file: "La vidéo du catalogue" },
  { title: "Message 3 · Témoignage + prix", when: "2 jours après", file: "La vidéo de Bassirou" },
] as const;

export type RelanceItem = {
  id: string;
  name: string | null;
  email: string;
  phone: string;
  country: string | null;
  offer: "guide" | "extrait";
  intentId: string | null;
  step: 0 | 1 | 2;
  boughtAt: Date;
  dueAt: Date;
  due: boolean;
  read: boolean;
  clicked: boolean;
  replied: boolean;
  lastSentAt: Date | null;
};

/** Toute la file : les messages à envoyer aujourd'hui (due) et ceux à venir. */
export async function relanceQueue(now = new Date()): Promise<RelanceItem[]> {
  const db = getDb();
  const rows = await db.query.prospects.findMany({
    where: and(eq(schema.prospects.pipelineStage, "sequence"), lt(schema.prospects.waStep, 3), isNull(schema.prospects.waOptOutAt)),
    orderBy: [desc(schema.prospects.lastEventAt)],
    limit: 500,
  });
  const withPhone = rows.filter((r) => waNumber(r.phone));
  const emails = withPhone.map((r) => r.email);
  const intents = emails.length
    ? await db.query.checkoutIntents.findMany({
        where: and(inArray(schema.checkoutIntents.email, emails), inArray(schema.checkoutIntents.ctaId, LEAD_CTA_IDS), eq(schema.checkoutIntents.status, "paid")),
        orderBy: [desc(schema.checkoutIntents.createdAt)],
        columns: { id: true, email: true, ctaId: true },
      })
    : [];
  const items: RelanceItem[] = [];
  for (const r of withPhone) {
    // Déjà client du catalogue (le rapprochement passe toutes les 15 min) : on ne le relance pas.
    if (await isCustomer(r.email, r.phone)) continue;
    const intent = intents.find((i) => i.email === r.email);
    const dueAt = r.waNextAt ?? r.lastEventAt;
    items.push({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone!,
      country: r.country,
      offer: intent?.ctaId === LEAD_OFFERS.extrait.ctaId ? "extrait" : "guide",
      intentId: intent?.id ?? null,
      step: Math.min(Math.max(r.waStep, 0), 2) as 0 | 1 | 2,
      boughtAt: r.lastEventAt,
      dueAt,
      due: dueAt.getTime() <= now.getTime(),
      read: Boolean(r.waReadAt),
      clicked: Boolean(r.waClickedAt),
      replied: Boolean(r.waRepliedAt),
      lastSentAt: r.waLastSentAt,
    });
  }
  return items;
}

/** Texte pré-rempli du message (les liens sont suivis : téléchargement du PDF, clics vers le catalogue). */
export function relanceMessage(item: Pick<RelanceItem, "id" | "name" | "offer" | "intentId" | "step">, modelsCount: number) {
  const first = firstName(item.name);
  const extrait = item.offer === "extrait";
  const models = modelsCount || GUIDE.announcedModels;
  if (item.step === 0) {
    const download = item.intentId ? siteUrl(`/api/guide/${item.intentId}`) : siteUrl(LEAD_OFFERS[item.offer].path);
    return extrait
      ? `Merci ${first} pour votre achat 🙏\nVoici votre Extrait du Catalogue Premium : ${EXTRAIT_MODELS} maisons avec leur plan de distribution et leur devis poste par poste.\n📄 Le PDF est juste ici. Votre lien personnel : ${download}`
      : `Merci ${first} pour votre achat 🙏\nVoici votre Guide WooPlans des maisons : ${models} villas et duplex avec leur budget. Aux pages 4 à 6, un exemple du Catalogue Premium.\n📄 Le PDF est juste ici. Votre lien personnel : ${download}`;
  }
  if (item.step === 1) {
    const link = siteUrl(`/r/${item.id}.j1`);
    return extrait
      ? `Bonjour ${first} 👋\nVous avez vu le format avec les ${EXTRAIT_MODELS} maisons de l'extrait. Le Catalogue Premium contient nos ${models} villas et duplex, chacun avec son plan de distribution coté et son devis poste par poste.\n👉 ${link}`
      : `Bonjour ${first} 👋\nVoici nos ${models} plans modèles en vidéo. Dans le Catalogue Premium, chaque maison a son plan de distribution coté et son devis poste par poste.\n👉 ${link}`;
  }
  const before = cataloguePriceBefore();
  const link = siteUrl(`/r/${item.id}.j3`);
  return `${first}, voici ce que Mamadou Bassirou a fait avec le Catalogue Premium 🎥\nPrix actuel : ${before ? `~${formatFcfa(before)}~ ` : ""}*${formatFcfa(cataloguePrice())}*, paiement unique, accès à vie.\n👉 ${link}\n(Répondez Stop pour ne plus recevoir de messages.)`;
}

/** Fichier à joindre à la main dans WhatsApp (Tao le télécharge une fois sur son téléphone). */
export function relanceAttachment(item: Pick<RelanceItem, "offer" | "intentId" | "step">) {
  if (item.step === 0) {
    return {
      label: item.offer === "extrait" ? "PDF de l'extrait" : "PDF du guide",
      url: item.intentId ? `/api/guide/${item.intentId}` : null,
    };
  }
  if (item.step === 1) return { label: "Vidéo du catalogue", url: "/assets/catalogue/catalogue-premium.mp4" };
  return { label: "Vidéo témoignage de Bassirou", url: "/assets/whatsapp/temoignage-bassirou.mp4" };
}

export function relanceWhatsappUrl(phone: string, text: string) {
  const to = (waNumber(phone) || "").replace("+", "");
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}

/** Clic sur « Envoyer » : le message est noté envoyé et le suivant est programmé (verrou sur l'étape : pas de doublon). */
export async function recordManualSend(id: string, step: number, now = new Date()) {
  if (step < 0 || step > 2) return false;
  const updated = await getDb()
    .update(schema.prospects)
    .set({ waStep: step + 1, waLastSentAt: now, waNextAt: new Date(now.getTime() + WA_DELAYS_HOURS[step] * HOUR), updatedAt: now })
    .where(and(eq(schema.prospects.id, id), eq(schema.prospects.waStep, step), eq(schema.prospects.pipelineStage, "sequence")))
    .returning({ id: schema.prospects.id });
  return updated.length > 0;
}

/** « Pas envoyé » : on revient à l'étape précédente, le message réapparaît dans la file du jour. */
export async function undoManualSend(id: string, now = new Date()) {
  const db = getDb();
  const p = await db.query.prospects.findFirst({ where: eq(schema.prospects.id, id), columns: { waStep: true, pipelineStage: true } });
  if (!p || p.waStep <= 0) return false;
  await db
    .update(schema.prospects)
    .set({ waStep: p.waStep - 1, waLastSentAt: null, waNextAt: now, pipelineStage: "sequence", pipelineUpdatedAt: now, updatedAt: now })
    .where(eq(schema.prospects.id, id));
  return true;
}
