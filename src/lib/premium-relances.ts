import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { guessCivilite, salutation, type Civilite } from "@/lib/civilite";
import { CUSTOM_PLAN_DELIVERY, CUSTOM_PLAN_DEPOSIT, CUSTOM_PLAN_OFFERS } from "@/lib/custom-plans";
import { siteUrl } from "@/lib/env";
import { formatFcfa } from "@/lib/plans";
import { greeting } from "@/lib/relance-schedule";
import { inChunks } from "@/lib/sql-chunks";
import { waNumber } from "@/lib/whatsapp-rules";

/**
 * Relances WhatsApp Premium → plans complets (décision de Tao, 23 nov. 2026). Les relances de la phase de conversion
 * mènent les acheteurs de l'extrait vers le Catalogue Premium ; celles-ci mènent les membres Premium vers les plans
 * complets (200 000 FCFA villa, 300 000 FCFA duplex, src/lib/custom-plans.ts). Envoi à la main depuis /admin/relances,
 * comme les autres : 3 messages.
 *  1. 2 jours après l'achat : « Avez-vous repéré votre modèle ? » (réponse = le code du modèle) ;
 *  2. 7 jours après : l'offre des plans complets (ce qui est livré, prix, avance) ;
 *  3. 10 jours après : « Avez-vous votre terrain ? » (dimensions → modèles qui y entrent).
 * Les membres les plus actifs (connexion récente, modèles ouverts) passent en premier. Exclus : membres révoqués, sans
 * WhatsApp, désinscrits des relances, et ceux qui ont déjà commandé des plans complets.
 */
export const PREMIUM_STEPS = [
  { title: "Premium 1 · Votre modèle ?", when: "2 jours après l'achat", gapDays: 2 },
  { title: "Premium 2 · Offre plans complets", when: "7 jours après le message 1", gapDays: 7 },
  { title: "Premium 3 · Votre terrain ?", when: "10 jours après le message 2", gapDays: 10 },
] as const;
export const PREMIUM_STEP_COUNT = PREMIUM_STEPS.length;

const DAY = 86_400_000;
const ORDERED_STAGES = ["commande", "production", "livraison", "termine"] as const;

export type PremiumItem = {
  id: string;
  name: string;
  civilite: Civilite | null;
  email: string;
  phone: string;
  country: string | null;
  joinedAt: Date;
  step: number;
  dueAt: Date;
  due: boolean;
  lastSentAt: Date | null;
  lastLoginAt: Date | null;
  models: number;
  lastModel: string | null;
  /** Classement : connexion récente et modèles ouverts d'abord. */
  heat: number;
};

/** Date à laquelle le message `step` (0 à 2) devient à envoyer. Règle pure. */
export function premiumDueAt(step: number, joinedAt: Date, lastSentAt: Date | null) {
  const base = step === 0 || !lastSentAt ? joinedAt : lastSentAt;
  return new Date(base.getTime() + PREMIUM_STEPS[Math.min(step, PREMIUM_STEP_COUNT - 1)].gapDays * DAY);
}

/** Chaleur d'un membre (0 à 100) : connexion récente et nombre de modèles ouverts. Règle pure. */
export function premiumHeat(p: { lastLoginAt: Date | null; models: number }, now = new Date()) {
  let h = 0;
  if (p.lastLoginAt) {
    const days = (now.getTime() - p.lastLoginAt.getTime()) / DAY;
    h += days <= 7 ? 50 : days <= 30 ? 35 : 15;
  }
  h += Math.min(p.models, 5) * 10;
  return Math.min(h, 100);
}

export async function premiumQueue(now = new Date()): Promise<PremiumItem[]> {
  const db = getDb();
  const members = await db.query.members.findMany({
    where: and(eq(schema.members.status, "active"), isNotNull(schema.members.phone)),
    columns: { id: true, email: true, name: true, phone: true, country: true, createdAt: true, lastLoginAt: true, premiumWaStep: true, premiumWaLastAt: true },
  });
  const active = members.filter((m) => m.premiumWaStep < PREMIUM_STEP_COUNT && waNumber(m.phone));
  if (!active.length) return [];
  const ids = active.map((m) => m.id);
  const emails = active.map((m) => m.email.toLowerCase());
  const [downloads, ordered, optedOut] = await Promise.all([
    inChunks(ids, (chunk) =>
      db
        .select({ memberId: schema.pdfDownloads.memberId, models: sql<number>`count(distinct ${schema.pdfDownloads.planSlug})`, last: sql<string>`max(${schema.pdfDownloads.createdAt} || '|' || coalesce(${schema.pdfDownloads.planCode}, ''))` })
        .from(schema.pdfDownloads)
        .where(inArray(schema.pdfDownloads.memberId, chunk))
        .groupBy(schema.pdfDownloads.memberId),
    ),
    db.query.leads.findMany({ where: inArray(schema.leads.stage, [...ORDERED_STAGES]), columns: { email: true, memberId: true } }),
    inChunks(emails, (chunk) =>
      db.query.prospects.findMany({ where: and(inArray(sql`lower(${schema.prospects.email})`, chunk), isNotNull(schema.prospects.waOptOutAt)), columns: { email: true } }),
    ),
  ]);
  const dl = new Map(downloads.map((d) => [d.memberId, d]));
  const orderedEmails = new Set(ordered.map((l) => (l.email || "").toLowerCase()).filter(Boolean));
  const orderedMembers = new Set(ordered.map((l) => l.memberId).filter(Boolean));
  const out = new Set(optedOut.map((p) => p.email.toLowerCase()));
  return active
    .filter((m) => !orderedMembers.has(m.id) && !orderedEmails.has(m.email.toLowerCase()) && !out.has(m.email.toLowerCase()))
    .map((m) => {
      const d = dl.get(m.id);
      const models = Number(d?.models ?? 0);
      const lastModel = d?.last?.split("|")[1] || null;
      const dueAt = premiumDueAt(m.premiumWaStep, m.createdAt, m.premiumWaLastAt);
      return {
        id: m.id,
        name: m.name,
        civilite: guessCivilite(m.name),
        email: m.email,
        phone: m.phone!,
        country: m.country,
        joinedAt: m.createdAt,
        step: m.premiumWaStep,
        dueAt,
        due: dueAt.getTime() <= now.getTime(),
        lastSentAt: m.premiumWaLastAt,
        lastLoginAt: m.lastLoginAt,
        models,
        lastModel,
        heat: premiumHeat({ lastLoginAt: m.lastLoginAt, models }, now),
      };
    })
    .sort((a, b) => b.heat - a.heat || a.dueAt.getTime() - b.dueAt.getTime());
}

export async function premiumItem(id: string, now = new Date()) {
  return (await premiumQueue(now)).find((i) => i.id === id) ?? null;
}

/** Texte du message `step` (0 à 2). */
export function premiumMessage(item: Pick<PremiumItem, "name" | "email" | "country" | "lastModel"> & { civilite?: Civilite | null }, step: number, now = new Date()) {
  const who = salutation(item.name, item.civilite === undefined ? guessCivilite(item.name) : item.civilite);
  const salut = greeting(item.country, now);
  const hello = who ? `${salut} ${who} 👋` : `${salut} 👋`;
  const utm = (c: string) => `utm_source=whatsapp&utm_medium=premium&utm_campaign=${c}`;
  if (step === 0) {
    const link = siteUrl(`/connexion?email=${encodeURIComponent(item.email)}&${utm("premium_1")}`);
    const seen = item.lastModel ? ` J'ai vu que vous avez regardé le modèle ${item.lastModel}.` : "";
    return `${hello}\n\nC'est Tao, de WooPlans. Merci d'être membre du Catalogue Premium.${seen}\n\nAvez-vous déjà repéré la maison que vous voulez construire ? Répondez simplement avec son code (par exemple D4-019) : je vous dis comment nos architectes peuvent l'adapter à votre terrain.\n\n📲 Votre espace Premium : ${link}`;
  }
  if (step === 1) {
    const [villa, duplex] = CUSTOM_PLAN_OFFERS;
    const items = villa.deliverables.map((d) => `✅ ${d}`).join("\n");
    const link = siteUrl(`/plans-personnalises?${utm("premium_2")}`);
    return `${hello}\n\nQuand vous avez choisi votre modèle, nos architectes l'adaptent à votre terrain et à vos besoins, et réalisent le dossier complet pour construire :\n${items}\n\nPrix : *${formatFcfa(villa.price)}* pour une villa, *${formatFcfa(duplex.price)}* pour un duplex, livrés en ${CUSTOM_PLAN_DELIVERY}. Avance de ${formatFcfa(CUSTOM_PLAN_DEPOSIT)} à la commande, déduite du prix.\n\n👉 ${link}\n\nVous pouvez aussi me répondre ici avec le code du modèle.`;
  }
  return `${hello}\n\nUne question rapide : avez-vous déjà votre terrain ?\n\nSi oui, envoyez-moi ses dimensions (ou une photo du plan du terrain) : je vous dis quels modèles du catalogue y entrent, et comment nos architectes adaptent celui que vous préférez.`;
}

/** Message envoyé (bouton vert) : passe à l'étape suivante. Verrou sur l'étape : un second clic ne compte pas deux fois. */
export async function recordPremiumSend(id: string, step: number, now = new Date()) {
  const updated = await getDb()
    .update(schema.members)
    .set({ premiumWaStep: step + 1, premiumWaLastAt: now, updatedAt: now })
    .where(and(eq(schema.members.id, id), eq(schema.members.premiumWaStep, step)))
    .returning({ id: schema.members.id });
  return updated.length > 0;
}
