/**
 * Relances WhatsApp à la main (provisoire, tant que Meta bloque les envois par l'API) : chaque acheteur du guide
 * ou de l'extrait reçoit 5 messages (22 nov. 2026), que Tao envoie en un clic depuis /admin/relances (lien wa.me
 * pré-rempli), calés sur son achat et sur la fin de son prix réservé (29 000 FCFA jusqu'à minuit de J7) :
 * J0 livraison, J1 vidéo + offre, J4 rappel, J7 matin dernier jour, J7 20 h message court (src/lib/relance-schedule.ts).
 * Les messages 3 à 5 ne partent plus une fois la date passée. « M. » ou « Mme » devant le nom (src/lib/civilite.ts).
 * Un acheteur du Catalogue Premium sort de la file automatiquement (rapprochement toutes les 15 min, et ici).
 */
import { and, desc, eq, gte, inArray, isNotNull, isNull, like, lt, lte, notInArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { guessCivilite, salutation, type Civilite } from "@/lib/civilite";
import { siteUrl } from "@/lib/env";
import { GUIDE } from "@/lib/guide";
import { EXTRAIT_MODELS, LEAD_CTA_IDS, LEAD_OFFERS } from "@/lib/lead-offers";
import { formatFcfa } from "@/lib/plans";
import { customerLookup } from "@/lib/prospects";
import { extraitActivityByEmail } from "@/lib/extrait-web";
import { videoActivityByProspect } from "@/lib/videos";
import { linkOrphanMessages } from "@/lib/conversation-ai";
import { inChunks } from "@/lib/sql-chunks";
import { cataloguePrice, catalogueReservedPrice } from "@/lib/site";
import { deadlineLabel, reservedUntil } from "@/lib/catalogue-offer-rules";
import { currentStep, endsText, greeting, offerMessagesOver, relanceDueAt, RELANCE_STEP_COUNT } from "@/lib/relance-schedule";
import { waNumber } from "@/lib/whatsapp-rules";
import { leadHeat, type HeatLevel } from "@/lib/lead-heat-rules";
import { sql } from "drizzle-orm";

const HOUR = 3_600_000;

export const RELANCE_STEPS = [
  { title: "Message 1 · Livraison", when: "dès l'achat", file: "Le PDF" },
  { title: "Message 2 · Vidéo + offre", when: "J1", file: null },
  { title: "Message 3 · Rappel de l'offre", when: "J4", file: null },
  { title: "Message 4 · Dernier jour", when: "J7 au matin", file: null },
  { title: "Message 5 · Dernières heures", when: "J7 vers 20 h", file: null },
] as const;

export type RelanceStep = 0 | 1 | 2 | 3 | 4;

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
  step: RelanceStep;
  boughtAt: Date;
  /** Fin du prix réservé (minuit de J7, ou réouverture de 24 h). */
  reservedUntil: Date | null;
  dueAt: Date;
  due: boolean;
  read: boolean;
  clicked: boolean;
  replied: boolean;
  lastSentAt: Date | null;
  /** Page vidéo : ce qu'il a regardé (fin > moitié > lecture > ouverture), null s'il ne l'a pas ouverte. */
  video: { video: string; event: string } | null;
  /** Qualification de l'IA d'après la conversation WhatsApp (DeepSeek), null si pas encore de conversation analysée. */
  ai: { stage: string; score: number | null; summary: string | null; nextAction: string | null } | null;
  /** Activité sur l'extrait en ligne (/mon-extrait) : score d'intérêt et détail, null s'il ne l'a pas ouvert. */
  extrait: { score: number; opens: number; viewed: number; lockedClicks: number; offerClick: boolean } | null;
  /** A commencé à payer le Catalogue Premium (paiement lancé, échoué ou abandonné). */
  checkout: boolean;
  /** Chaleur en temps réel (src/lib/lead-heat-rules.ts) : note, niveau et ce qu'il a fait. */
  heat: { score: number; level: HeatLevel; reasons: string[] };
  /** Dernière action connue (clic, message, extrait, paiement commencé) et dernière analyse de l'IA. */
  lastActionAt: Date | null;
  aiUpdatedAt: Date | null;
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
      where: and(eq(schema.prospects.pipelineStage, "sequence"), lt(schema.prospects.waStep, RELANCE_STEP_COUNT), isNull(schema.prospects.waOptOutAt), isNull(schema.prospects.waInvalidAt)),
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
  const [activity, videos, checkouts, inbound] = await Promise.all([
    extraitActivityByEmail(withPhone.map((r) => r.email)).catch(() => new Map()),
    videoActivityByProspect(withPhone.map((r) => r.id)).catch(() => new Map()),
    catalogueCheckoutsByEmail(withPhone.map((r) => r.email)).catch(() => new Map<string, Date>()),
    inboundCountByProspect(withPhone.map((r) => r.id)).catch(() => new Map<string, number>()),
  ]);
  const intentByEmail = new Map<string, (typeof intents)[number]>();
  for (const i of intents) if (i.email && !intentByEmail.has(i.email)) intentByEmail.set(i.email, i);
  const items = withPhone.map((r): RelanceItem => {
    const intent = intentByEmail.get(r.email);
    const boughtAt = intent?.createdAt ?? r.lastEventAt;
    const until = reservedUntil(boughtAt, r.offerReopenUntil, 7);
    // Étape calée sur la date de fin de promo de la personne (leads arrivés avant les 5 messages : on avance).
    const step = Math.min(currentStep(r.waStep, boughtAt, until, now), RELANCE_STEP_COUNT) as RelanceStep;
    const dueAt = step >= 3 && until ? new Date(Math.min(relanceDueAt(boughtAt, step).getTime(), until.getTime() - (step === 3 ? 86_400_000 : 5 * 3_600_000))) : relanceDueAt(boughtAt, step);
    return {
      id: r.id,
      name: r.name,
      civilite: guessCivilite(r.name),
      email: r.email,
      phone: r.phone!,
      country: r.country,
      offer: intent?.ctaId === LEAD_OFFERS.extrait.ctaId ? "extrait" : "guide",
      intentId: intent?.id ?? null,
      step,
      boughtAt,
      reservedUntil: until,
      dueAt,
      due: dueAt.getTime() <= now.getTime(),
      read: Boolean(r.waReadAt),
      clicked: Boolean(r.waClickedAt),
      replied: Boolean(r.waRepliedAt),
      lastSentAt: r.waLastSentAt,
      extrait: activity.get(r.email) ?? null,
      video: videos.get(r.id) ?? null,
      ai: r.aiStage ? { stage: r.aiStage, score: r.aiScore, summary: r.aiSummary, nextAction: r.aiNextAction } : null,
      checkout: checkouts.has(r.email.toLowerCase()),
      lastActionAt: latest([r.waClickedAt, r.lastInboundAt, r.waRepliedAt, activity.get(r.email)?.lastAt ?? null, checkouts.get(r.email.toLowerCase()) ?? null]),
      aiUpdatedAt: r.aiUpdatedAt,
      heat: leadHeat(
        {
          wrote: Boolean(r.waRepliedAt || r.lastInboundAt),
          inbound: inbound.get(r.id) ?? (r.waRepliedAt ? 1 : 0),
          read: Boolean(r.waReadAt),
          clicked: Boolean(r.waClickedAt),
          video: videos.get(r.id)?.event ?? null,
          extrait: activity.get(r.email)?.score ?? null,
          checkout: checkouts.has(r.email.toLowerCase()),
          ai: r.aiScore ?? null,
          lastActionAt: latest([r.waClickedAt, r.lastInboundAt, r.waRepliedAt, activity.get(r.email)?.lastAt ?? null, checkouts.get(r.email.toLowerCase()) ?? null]),
        },
        now,
      ),
    };
  });
  // Messages 3 à 5 : plus rien à dire une fois le prix réservé terminé (le classement du pipeline les sort ensuite).
  return items.filter((i) => i.step < RELANCE_STEP_COUNT && !offerMessagesOver(i.step, i.reservedUntil, now));
}

function latest(dates: (Date | null | undefined)[]) {
  const t = Math.max(...dates.map((d) => d?.getTime() ?? 0));
  return t > 0 ? new Date(t) : null;
}

/** Paiements du Catalogue Premium commencés (lancé, échoué ou abandonné) : dernière tentative par email. */
export async function catalogueCheckoutsByEmail(emails: string[]) {
  const unique = [...new Set(emails.filter(Boolean).map((e) => e.toLowerCase()))];
  const rows = unique.length
    ? await inChunks(unique, (chunk) =>
        getDb().query.checkoutIntents.findMany({
          where: and(
            inArray(sql`lower(${schema.checkoutIntents.email})`, chunk),
            notInArray(schema.checkoutIntents.ctaId, LEAD_CTA_IDS),
            isNull(schema.checkoutIntents.planSlug),
            inArray(schema.checkoutIntents.status, ["started", "failed", "abandoned", "paid"]),
          ),
          columns: { email: true, createdAt: true },
        }),
      )
    : [];
  const out = new Map<string, Date>();
  for (const r of rows) {
    const e = (r.email || "").toLowerCase();
    if (e && (!out.get(e) || out.get(e)!.getTime() < r.createdAt.getTime())) out.set(e, r.createdAt);
  }
  return out;
}

/** Nombre de messages WhatsApp reçus par fiche. */
export async function inboundCountByProspect(ids: string[]) {
  const rows = ids.length
    ? await inChunks(ids, (chunk) =>
        getDb()
          .select({ id: schema.waMessages.prospectId, n: sql<number>`count(*)` })
          .from(schema.waMessages)
          .where(and(inArray(schema.waMessages.prospectId, chunk), eq(schema.waMessages.direction, "in")))
          .groupBy(schema.waMessages.prospectId),
      )
    : [];
  return new Map(rows.filter((r) => r.id).map((r) => [r.id!, Number(r.n)]));
}

/** Une seule personne de la file (lien de secours /admin/relances/envoyer) : 2 petites requêtes, pas toute la file. */
export async function relanceItem(id: string) {
  const db = getDb();
  const p = await db.query.prospects.findFirst({
    where: eq(schema.prospects.id, id),
    columns: { id: true, name: true, email: true, phone: true, country: true, lastEventAt: true, offerReopenUntil: true },
  });
  if (!p) return null;
  const intent = await db.query.checkoutIntents.findFirst({
    where: and(eq(schema.checkoutIntents.email, p.email), inArray(schema.checkoutIntents.ctaId, LEAD_CTA_IDS), eq(schema.checkoutIntents.status, "paid")),
    orderBy: [desc(schema.checkoutIntents.createdAt)],
    columns: { id: true, ctaId: true, createdAt: true },
  });
  const boughtAt = intent?.createdAt ?? p.lastEventAt;
  return {
    ...p,
    civilite: guessCivilite(p.name),
    offer: (intent?.ctaId === LEAD_OFFERS.extrait.ctaId ? "extrait" : "guide") as RelanceItem["offer"],
    intentId: intent?.id ?? null,
    boughtAt,
    reservedUntil: reservedUntil(boughtAt, p.offerReopenUntil, 7),
  };
}

/**
 * Texte pré-rempli du message (les liens sont suivis : téléchargement du PDF, clics vers la page de l'offre).
 * `civilite` : celle choisie sur la carte quand le prénom n'a pas suffi ; sinon celle déduite du prénom.
 */
export function relanceMessage(
  item: Pick<RelanceItem, "id" | "name" | "offer" | "intentId" | "step" | "reservedUntil"> & { civilite?: Civilite | null; country?: string | null },
  modelsCount: number,
  now = new Date(),
) {
  const who = salutation(item.name, item.civilite === undefined ? guessCivilite(item.name) : item.civilite);
  const extrait = item.offer === "extrait";
  const models = modelsCount || GUIDE.announcedModels;
  if (item.step === 0) {
    // Modèle de Tao (19 nov.) : le PDF est joint à la main dans WhatsApp, pas de lien.
    const merci = who ? `Merci ${who} pour votre achat 🙏` : "Merci pour votre achat 🙏";
    return extrait
      ? `${merci}\n\nVoici votre *Extrait du Catalogue Premium* (${EXTRAIT_MODELS} maisons avec leur plan de distribution et leur devis poste par poste)${item.intentId ? `\n\n📱 Aussi en ligne, sur votre téléphone : ${siteUrl(`/mon-extrait/${item.intentId}`)}` : ""}`
      : `${merci}\n\nVoici votre *Guide WooPlans des maisons* (${models} villas et duplex avec leur budget de construction)`;
  }
  const salut = greeting(item.country, now);
  const hello = who ? `${salut} ${who} 👋` : `${salut} 👋`;
  const reserved = `*${formatFcfa(catalogueReservedPrice())}*`;
  const publicPrice = formatFcfa(cataloguePrice());
  const until = item.reservedUntil;
  const label = until ? deadlineLabel(until) : null;
  // Lien personnel : reconnaît la personne sur la page (son prix et son compte à rebours), suivi des clics.
  const link = siteUrl(`/r/${item.id}.${["", "j1", "j4", "j7", "j7s"][item.step]}`);
  if (item.step === 1) {
    const intro = extrait
      ? `Vous avez vu les ${EXTRAIT_MODELS} maisons de votre extrait. Le Catalogue Premium vous donne les ${Math.max(models - EXTRAIT_MODELS, 0)} autres, au même format : plan de distribution coté et devis poste par poste pour chaque maison.`
      : `Dans votre guide, vous avez vu nos ${models} villas et duplex. Le Catalogue Premium vous donne, pour chacune, le plan de distribution coté et le devis poste par poste.`;
    // Lien de la page vidéo (à la place de la pièce jointe) : la vidéo puis l'offre, suivi des lectures.
    return `${hello}\n\n${intro}\n\n🎁 *Votre prix réservé* : ${reserved} au lieu de ${publicPrice}${label ? `, jusqu'au ${label}` : ""}.\n\n🎥 ${extrait ? "Regardez cette vidéo (5 min)" : "Regardez la vidéo du catalogue"} : ${link}`;
  }
  if (item.step === 2) {
    return `${hello}\n\nPetit rappel : votre prix réservé pour le Catalogue Premium, ${reserved} au lieu de ${publicPrice}, est valable jusqu'au ${label}.\n\nCe que vous débloquez :\n✅ les ${models} villas et duplex\n✅ le plan coté de chaque niveau\n✅ le devis poste par poste, de la fondation aux finitions\n✅ les nouveaux modèles, inclus\n\nPaiement unique par Mobile Money, accès tout de suite.\n\n👉 ${link}`;
  }
  const ends = until && label ? endsText(until, label, now) : "bientôt";
  if (item.step === 3) {
    return `${hello}\n\n⏳ C'est le dernier jour : votre prix réservé de ${reserved} pour le Catalogue Premium se termine ${ends}. Ensuite, ce sera ${publicPrice}.\n\n👉 ${link}`;
  }
  // Message 5 (idée de Tao) : court, sans lien ni image ; la réponse ouvre la conversation.
  return `⏳ ${who ? `${who}, votre` : "Votre"} prix réservé de ${reserved} se termine ${ends}. Après, ce sera ${publicPrice}.\n\nVous voulez en profiter ? Répondez *OUI* et je vous envoie le lien tout de suite 👇`;
}

/** Fichier à joindre à la main dans WhatsApp (Tao le télécharge une fois sur son téléphone). */
export function relanceAttachment(item: Pick<RelanceItem, "offer" | "intentId" | "step">) {
  if (item.step === 0) {
    return {
      label: item.offer === "extrait" ? "PDF de l'extrait" : "PDF du guide",
      url: item.intentId ? `/api/guide/${item.intentId}` : null,
    };
  }
  // Messages 3 à 5 : texte seul.
  return null;
}

export function relanceWhatsappUrl(phone: string, text: string) {
  const to = (waNumber(phone) || "").replace("+", "");
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}

/** Clic sur « Envoyer » : le message est noté envoyé et le suivant est programmé (verrou sur l'étape : pas de doublon). */
export async function recordManualSend(id: string, step: number, now = new Date()) {
  if (!Number.isInteger(step) || step < 0 || step >= RELANCE_STEP_COUNT) return false;
  const item = await relanceItem(id);
  if (!item) return false;
  // Prochain message à sa date (J1, J4, J7…) ; après le 5e, classement du pipeline à la fin du prix réservé.
  const next = relanceDueAt(item.boughtAt, step + 1);
  const updated = await getDb()
    .update(schema.prospects)
    .set({ waStep: step + 1, waLastSentAt: now, waNextAt: next.getTime() > now.getTime() ? next : now, updatedAt: now })
    // Verrou : pas deux fois le même message ; une personne avancée à sa date peut avoir un waStep plus petit que l'étape envoyée.
    .where(and(eq(schema.prospects.id, id), lte(schema.prospects.waStep, step), eq(schema.prospects.pipelineStage, "sequence")))
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

/* ─────────────── Phase d'accompagnement : formulaire « Mon projet » (J10) ─────────────── */

export const PROJECT_FORM_AFTER_DAYS = 10;

export type ProjectItem = { id: string; name: string | null; civilite: Civilite | null; email: string; phone: string; country: string | null; boughtAt: Date };

/**
 * Prospects dont la phase de conversion est finie (message 2 envoyé et prix réservé terminé), 10 jours après l'achat, à qui le lien du formulaire
 * n'a pas encore été envoyé (ni rempli). Les clients du Catalogue Premium et les désinscrits sont exclus.
 */
export async function projectQueue(now = new Date()): Promise<ProjectItem[]> {
  const db = getDb();
  const [rows, isClient] = await Promise.all([
    db.query.prospects.findMany({
      where: and(
        gte(schema.prospects.waStep, 2),
        isNull(schema.prospects.projectSentAt),
        isNull(schema.prospects.projectAnsweredAt),
        isNull(schema.prospects.waOptOutAt),
        isNull(schema.prospects.waInvalidAt),
        notInArray(schema.prospects.pipelineStage, ["client", "desinscrit"]),
        lte(schema.prospects.lastEventAt, new Date(now.getTime() - PROJECT_FORM_AFTER_DAYS * 24 * HOUR)),
      ),
      orderBy: [desc(schema.prospects.lastEventAt)],
      limit: 300,
      columns: { id: true, name: true, email: true, phone: true, country: true, lastEventAt: true },
    }),
    customerLookup(),
  ]);
  return rows
    .filter((r) => waNumber(r.phone) && !isClient(r.email, r.phone))
    .map((r) => ({ id: r.id, name: r.name, civilite: guessCivilite(r.name), email: r.email, phone: r.phone!, country: r.country, boughtAt: r.lastEventAt }));
}

/** Message WhatsApp du formulaire (lien personnel : aucune information à saisir). */
export function projectMessage(item: Pick<ProjectItem, "id" | "name"> & { civilite?: Civilite | null }) {
  const who = salutation(item.name, item.civilite === undefined ? guessCivilite(item.name) : item.civilite);
  const link = siteUrl(`/mon-projet/${item.id}?utm_source=whatsapp&utm_medium=relance&utm_campaign=projet`);
  return `${who ? `Bonjour ${who} 👋` : "Bonjour 👋"}\n\nPour vous montrer les maisons qui correspondent à votre projet, j'ai 4 questions rapides : 20 secondes, rien à écrire.\n\n👉 ${link}`;
}

/** Lien du formulaire envoyé sur WhatsApp (clic sur « Envoyer »). */
export async function recordProjectSent(id: string, now = new Date()) {
  const updated = await getDb()
    .update(schema.prospects)
    .set({ projectSentAt: now, waLastSentAt: now, updatedAt: now })
    .where(and(eq(schema.prospects.id, id), isNull(schema.prospects.projectSentAt)))
    .returning({ id: schema.prospects.id });
  return updated.length > 0;
}

/* ─────────────── Numéro sans WhatsApp ─────────────── */

/** « Pas de WhatsApp » : la fiche sort des relances WhatsApp (les emails continuent). */
export async function markNoWhatsapp(id: string, now = new Date()) {
  const db = getDb();
  const p = await db.query.prospects.findFirst({ where: eq(schema.prospects.id, id), columns: { notes: true, phone: true } });
  if (!p) return false;
  const line = `${now.toISOString().slice(0, 10)} : numéro ${p.phone || "—"} signalé sans WhatsApp.`;
  await db
    .update(schema.prospects)
    .set({ waInvalidAt: now, notes: p.notes ? `${p.notes}\n${line}` : line, updatedAt: now })
    .where(eq(schema.prospects.id, id));
  return true;
}

/** Correction du numéro WhatsApp (indicatif compris) : la fiche revient dans les relances, à la même étape. */
export async function correctWhatsappNumber(id: string, input: string, now = new Date()) {
  const digits = input.replace(/\D/g, "").replace(/^00/, "");
  if (digits.length < 11 || digits.length > 15) return false;
  const db = getDb();
  const p = await db.query.prospects.findFirst({ where: eq(schema.prospects.id, id), columns: { notes: true, phone: true } });
  if (!p) return false;
  const line = `${now.toISOString().slice(0, 10)} : numéro WhatsApp corrigé à la main (ancien : ${p.phone || "aucun"}).`;
  await db
    .update(schema.prospects)
    .set({ phone: digits, waInvalidAt: null, notes: p.notes ? `${p.notes}\n${line}` : line, updatedAt: now })
    .where(eq(schema.prospects.id, id));
  // Messages déjà reçus de ce numéro : rattachés à la fiche (conversation lue par l'IA).
  await linkOrphanMessages(id, digits).catch(() => {});
  return true;
}

/** Fiches signalées sans WhatsApp (encore dans la séquence ou en accompagnement), pour corriger le numéro plus tard. */
export async function noWhatsappList() {
  return getDb().query.prospects.findMany({
    where: and(isNotNull(schema.prospects.waInvalidAt), isNull(schema.prospects.waOptOutAt), notInArray(schema.prospects.pipelineStage, ["client", "desinscrit"])),
    orderBy: [desc(schema.prospects.waInvalidAt)],
    limit: 100,
    columns: { id: true, name: true, email: true, phone: true },
  });
}

/* ─────────────── Deuxième chance : « Rouvrir l'offre 24 h » ─────────────── */

/**
 * Prospect retrouvé par son email ou son numéro WhatsApp (8 derniers chiffres), pour rouvrir son prix réservé.
 * Renvoie null si aucune fiche ne correspond, ou si plusieurs numéros correspondent (il faut alors l'email).
 */
export async function findProspectForReopen(query: string) {
  const db = getDb();
  const q = query.trim().toLowerCase();
  if (q.includes("@")) {
    return (await db.query.prospects.findFirst({ where: eq(schema.prospects.email, q), columns: { id: true, name: true, email: true, phone: true } })) ?? null;
  }
  const digits = q.replace(/\D/g, "");
  if (digits.length < 8) return null;
  const rows = await db.query.prospects.findMany({
    where: like(schema.prospects.phone, `%${digits.slice(-8)}`),
    columns: { id: true, name: true, email: true, phone: true },
    limit: 2,
  });
  return rows.length === 1 ? rows[0] : null;
}

/** Prix réservé rouvert 24 h à partir de maintenant (noté sur la fiche). */
export async function reopenReservedOffer(id: string, now = new Date()) {
  const db = getDb();
  const p = await db.query.prospects.findFirst({ where: eq(schema.prospects.id, id), columns: { notes: true } });
  if (!p) return null;
  const until = new Date(now.getTime() + 24 * HOUR);
  const line = `${now.toISOString().slice(0, 16).replace("T", " ")} UTC : prix réservé du catalogue rouvert 24 h (jusqu'au ${deadlineLabel(until)}).`;
  await db
    .update(schema.prospects)
    .set({ offerReopenUntil: until, notes: p.notes ? `${p.notes}\n${line}` : line, updatedAt: now })
    .where(eq(schema.prospects.id, id));
  return until;
}
