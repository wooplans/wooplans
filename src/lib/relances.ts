/**
 * Relances WhatsApp à la main (provisoire, tant que Meta bloque les envois par l'API) : chaque acheteur du guide
 * ou de l'extrait reçoit 3 messages, que Tao envoie en un clic depuis /admin/relances (lien wa.me pré-rempli).
 * Message 1 = livraison (tout de suite), message 2 = la page de l'offre réservée aux acheteurs (+24 h),
 * message 3 = témoignage + prix (+48 h). « M. » ou « Mme » devant le nom (src/lib/civilite.ts).
 * Un acheteur du Catalogue Premium sort de la file automatiquement (rapprochement toutes les 15 min, et ici).
 */
import { and, desc, eq, inArray, isNull, lt } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { guessCivilite, salutation, type Civilite } from "@/lib/civilite";
import { siteUrl } from "@/lib/env";
import { GUIDE } from "@/lib/guide";
import { EXTRAIT_MODELS, LEAD_CTA_IDS, LEAD_OFFERS } from "@/lib/lead-offers";
import { WA_DELAYS_HOURS } from "@/lib/pipeline";
import { formatFcfa } from "@/lib/plans";
import { customerLookup } from "@/lib/prospects";
import { inChunks } from "@/lib/sql-chunks";
import { cataloguePrice, cataloguePriceBefore } from "@/lib/site";
import { waNumber } from "@/lib/whatsapp-rules";

const HOUR = 3_600_000;

export const RELANCE_STEPS = [
  { title: "Message 1 · Livraison", when: "dès l'achat", file: "Le PDF" },
  { title: "Message 2 · Offre flash", when: "le lendemain", file: "La vidéo du catalogue" },
  { title: "Message 3 · Témoignage + prix", when: "2 jours après", file: "La vidéo de Bassirou" },
] as const;

export type RelanceItem = {
  id: string;
  name: string | null;
  /** Déduite du prénom ; null = inconnue (la page propose M. et Mme). */
  civilite: Civilite | null;
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

/**
 * Toute la file : les messages à envoyer aujourd'hui (due) et ceux à venir.
 * 3 requêtes en parallèle au plus (prospects, clients, achats), quel que soit le nombre de personnes :
 * auparavant 2 requêtes PAR personne, l'une après l'autre, d'où une page très lente.
 */
export async function relanceQueue(now = new Date()): Promise<RelanceItem[]> {
  const db = getDb();
  const [rows, isClient] = await Promise.all([
    db.query.prospects.findMany({
      where: and(eq(schema.prospects.pipelineStage, "sequence"), lt(schema.prospects.waStep, 3), isNull(schema.prospects.waOptOutAt)),
      orderBy: [desc(schema.prospects.lastEventAt)],
      limit: 500,
    }),
    customerLookup(),
  ]);
  // Déjà client du catalogue (le rapprochement passe toutes les 15 min) : on ne le relance pas.
  const withPhone = rows.filter((r) => waNumber(r.phone) && !isClient(r.email, r.phone));
  // D1 refuse plus de 100 paramètres par requête : adresses par lots.
  const intents = await inChunks(
    withPhone.map((r) => r.email),
    (emails) =>
      db.query.checkoutIntents.findMany({
        where: and(inArray(schema.checkoutIntents.email, emails), inArray(schema.checkoutIntents.ctaId, LEAD_CTA_IDS), eq(schema.checkoutIntents.status, "paid")),
        orderBy: [desc(schema.checkoutIntents.createdAt)],
        columns: { id: true, email: true, ctaId: true, createdAt: true },
      }),
    40,
  );
  intents.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const intentByEmail = new Map<string, (typeof intents)[number]>();
  for (const i of intents) if (i.email && !intentByEmail.has(i.email)) intentByEmail.set(i.email, i);
  return withPhone.map((r) => {
    const intent = intentByEmail.get(r.email);
    const dueAt = r.waNextAt ?? r.lastEventAt;
    return {
      id: r.id,
      name: r.name,
      civilite: guessCivilite(r.name),
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
    };
  });
}

/** Une seule personne de la file (lien de secours /admin/relances/envoyer) : 2 petites requêtes, pas toute la file. */
export async function relanceItem(id: string) {
  const db = getDb();
  const p = await db.query.prospects.findFirst({ where: eq(schema.prospects.id, id), columns: { id: true, name: true, email: true, phone: true } });
  if (!p) return null;
  const intent = await db.query.checkoutIntents.findFirst({
    where: and(eq(schema.checkoutIntents.email, p.email), inArray(schema.checkoutIntents.ctaId, LEAD_CTA_IDS), eq(schema.checkoutIntents.status, "paid")),
    orderBy: [desc(schema.checkoutIntents.createdAt)],
    columns: { id: true, ctaId: true },
  });
  return { ...p, civilite: guessCivilite(p.name), offer: (intent?.ctaId === LEAD_OFFERS.extrait.ctaId ? "extrait" : "guide") as RelanceItem["offer"], intentId: intent?.id ?? null };
}

/**
 * Texte pré-rempli du message (les liens sont suivis : téléchargement du PDF, clics vers la page de l'offre).
 * `civilite` : celle choisie sur la carte quand le prénom n'a pas suffi ; sinon celle déduite du prénom.
 */
export function relanceMessage(
  item: Pick<RelanceItem, "id" | "name" | "offer" | "intentId" | "step"> & { civilite?: Civilite | null },
  modelsCount: number,
) {
  const who = salutation(item.name, item.civilite === undefined ? guessCivilite(item.name) : item.civilite);
  const extrait = item.offer === "extrait";
  const models = modelsCount || GUIDE.announcedModels;
  if (item.step === 0) {
    // Modèle de Tao (19 nov.) : le PDF est joint à la main dans WhatsApp, pas de lien.
    const merci = who ? `Merci ${who} pour votre achat 🙏` : "Merci pour votre achat 🙏";
    return extrait
      ? `${merci}\n\nVoici votre *Extrait du Catalogue Premium* (${EXTRAIT_MODELS} maisons avec leur plan de distribution et leur devis poste par poste)`
      : `${merci}\n\nVoici votre *Guide WooPlans des maisons* (${models} villas et duplex avec leur budget de construction)`;
  }
  const hello = who ? `Bonjour ${who} 👋` : "Bonjour 👋";
  const price = cataloguePrice();
  const before = cataloguePriceBefore();
  const priceText = `${before ? `~${formatFcfa(before)}~ ` : ""}*${formatFcfa(price)}*`;
  if (item.step === 1) {
    // Le lien mène à la page réservée aux acheteurs de l'extrait ou du guide (/extrait-catalogue-premium/catalogue).
    const link = siteUrl(`/r/${item.id}.j1`);
    const discount = before && before > price ? ` (-${Math.round((1 - price / before) * 100)} %)` : "";
    return extrait
      ? `${hello}\n\nVous avez vu les ${EXTRAIT_MODELS} maisons de votre extrait. Voici les ${Math.max(models - EXTRAIT_MODELS, 0)} autres, au même format : plan de distribution coté et devis poste par poste pour chaque maison.\n\n⚡ *Offre flash réservée aux acheteurs de l'extrait* : le Catalogue Premium complet à ${priceText}${discount}, paiement unique.\n\n👉 ${link}`
      : `${hello}\n\nDans votre guide, vous avez vu nos ${models} villas et duplex. Le Catalogue Premium vous donne, pour chacune, le plan de distribution coté et le devis poste par poste.\n\n⚡ *Offre flash réservée aux acheteurs du guide* : ${priceText}${discount}, paiement unique.\n\n👉 ${link}`;
  }
  const link = siteUrl(`/r/${item.id}.j3`);
  return `${who ? `${who}, voici` : "Voici"} ce que Mamadou Bassirou a fait avec le Catalogue Premium 🎥\nPrix actuel : ${priceText}, paiement unique, accès à vie.\n👉 ${link}\n(Répondez Stop pour ne plus recevoir de messages.)`;
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
