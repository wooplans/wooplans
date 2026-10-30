import { and, asc, count, desc, eq, gte, inArray, isNotNull, isNull, lte, or } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { catalogueProductIds } from "@/lib/chariow";
import { randomId } from "@/lib/crypto";
import { prospectEmail, sendEmail, welcomeEmail } from "@/lib/email";
import { getEnv, siteUrl } from "@/lib/env";
import { normalizeEmail } from "@/lib/members";
import { normalizePhone, phoneCountry, type ChariowPhone } from "@/lib/phone";
import { automatedEmailAllowance } from "@/lib/email-budget";
import { formatFcfa } from "@/lib/plans";
import {
  DEFAULT_PROSPECT_SEQUENCE,
  emailKindForStep,
  sanitizeSequenceSettings,
  shouldStartSequence,
  stepDueAt,
  WELCOME_DELAYS_HOURS,
  welcomeKindForStep,
  type ProspectSequenceSettings,
} from "@/lib/prospect-sequence";
import { getSetting, setSetting } from "@/lib/settings";
import { cataloguePrice, whatsappLink } from "@/lib/site";
import { optedOutEmails, unsubscribeHeaders, unsubscribeUrl } from "@/lib/unsubscribe";

const SETTINGS_KEY = "prospect_sequence";

export async function getProspectSettings() {
  return sanitizeSequenceSettings(await getSetting<Partial<ProspectSequenceSettings>>(SETTINGS_KEY, DEFAULT_PROSPECT_SEQUENCE));
}

export async function saveProspectSettings(input: Partial<ProspectSequenceSettings>) {
  const value = sanitizeSequenceSettings(input);
  await setSetting(SETTINGS_KEY, value);
  return value;
}

type ProspectEventInput = {
  email: string;
  name?: string | null;
  phone?: string | null;
  country?: string | null;
  event: "abandoned" | "failed" | "started" | "gift";
  occurredAt: Date;
  saleId?: string | null;
  amount?: number | null;
  source: "webhook" | "chariow_import" | "site" | "gift";
  utmSource?: string | null;
  utmCampaign?: string | null;
  /** Démarre la séquence d'emails (notifications en direct) ; l'historique importé reste en attente. */
  startSequence: boolean;
  /** Séquence à démarrer : relance (paiement abandonné, par défaut) ou bienvenue (plan et devis offert). */
  kind?: "relance" | "bienvenue";
};

const delaysFor = (kind: "relance" | "bienvenue", settings: ProspectSequenceSettings) =>
  kind === "bienvenue" ? WELCOME_DELAYS_HOURS : settings.delaysHours;

/**
 * Déjà client ? Membre actif ou vente payée, avec le même email OU le même numéro WhatsApp
 * (une même personne paie parfois avec un autre email que celui de sa tentative abandonnée).
 */
async function isCustomer(email: string, phone: string | null | undefined) {
  const db = getDb();
  const member = await db.query.members.findFirst({
    where: and(eq(schema.members.status, "active"), phone ? or(eq(schema.members.email, email), eq(schema.members.phone, phone)) : eq(schema.members.email, email)),
    columns: { id: true },
  });
  if (member) return true;
  const sale = await db.query.sales.findFirst({
    where: and(eq(schema.sales.status, "completed"), phone ? or(eq(schema.sales.email, email), eq(schema.sales.phone, phone)) : eq(schema.sales.email, email)),
    columns: { id: true },
  });
  return Boolean(sale);
}

/** Passe en « converti » tous les prospects ouverts qui sont devenus clients (email ou téléphone). */
export async function reconcileProspects() {
  const db = getDb();
  const open = await db.query.prospects.findMany({
    where: inArray(schema.prospects.status, ["open", "lost"]),
    columns: { id: true, email: true, phone: true },
  });
  if (open.length === 0) return 0;
  const [members, sales] = await Promise.all([
    db.query.members.findMany({ where: eq(schema.members.status, "active"), columns: { email: true, phone: true } }),
    db.query.sales.findMany({ where: eq(schema.sales.status, "completed"), columns: { email: true, phone: true } }),
  ]);
  const emails = new Set([...members, ...sales].map((c) => c.email).filter(Boolean));
  const phones = new Set([...members, ...sales].map((c) => c.phone).filter(Boolean));
  const ids = open.filter((p) => emails.has(p.email) || (p.phone && phones.has(p.phone))).map((p) => p.id);
  for (let i = 0; i < ids.length; i += 50) {
    await db
      .update(schema.prospects)
      .set({ status: "converted", convertedAt: new Date(), nextEmailAt: null, updatedAt: new Date() })
      .where(inArray(schema.prospects.id, ids.slice(i, i + 50)));
  }
  return ids.length;
}

/** Enregistre un paiement abandonné / échoué (ou un email laissé) ; ignore les personnes déjà membres. */
export async function recordProspectEvent(input: ProspectEventInput) {
  const db = getDb();
  const email = normalizeEmail(input.email);
  if (!email || (await isCustomer(email, input.phone))) return "customer";

  const settings = await getProspectSettings();
  const existing = await db.query.prospects.findFirst({ where: eq(schema.prospects.email, email) });
  const now = new Date();

  const kind = input.kind ?? "relance";
  if (!existing) {
    const start = input.startSequence && settings.enabled;
    await db
      .insert(schema.prospects)
      .values({
        id: randomId(),
        email,
        name: input.name || null,
        phone: input.phone || null,
        country: input.country || null,
        lastEvent: input.event,
        lastEventAt: input.occurredAt,
        lastSaleId: input.saleId ?? null,
        amount: input.amount ?? null,
        source: input.source,
        utmSource: input.utmSource ?? null,
        utmCampaign: input.utmCampaign ?? null,
        sequenceKind: kind,
        sequenceStartedAt: start ? input.occurredAt : null,
        nextEmailAt: start ? stepDueAt(input.occurredAt, 0, delaysFor(kind, settings)) : null,
      })
      .onConflictDoNothing();
    return "created";
  }

  // Un évènement plus ancien que celui déjà connu (import d'historique) ne change que les champs vides.
  const newer = input.occurredAt.getTime() >= existing.lastEventAt.getTime();
  const reopen = existing.status === "converted" || existing.status === "lost";
  const status = existing.status === "unsubscribed" ? "unsubscribed" : reopen && newer ? "open" : existing.status;
  // Un abandon de paiement pendant la séquence de bienvenue la remplace par la relance (aide au paiement).
  const switchToRelance = kind === "relance" && existing.sequenceKind === "bienvenue" && input.event !== "started";
  const start =
    input.startSequence &&
    settings.enabled &&
    status === "open" &&
    newer &&
    (reopen || switchToRelance || shouldStartSequence(existing, now));
  await db
    .update(schema.prospects)
    .set({
      name: existing.name || input.name || null,
      phone: existing.phone || input.phone || null,
      country: existing.country || input.country || null,
      status,
      ...(newer
        ? {
            lastEvent: input.event,
            lastEventAt: input.occurredAt,
            lastSaleId: input.saleId ?? existing.lastSaleId,
            amount: input.amount ?? existing.amount,
            utmSource: input.utmSource ?? existing.utmSource,
            utmCampaign: input.utmCampaign ?? existing.utmCampaign,
          }
        : {}),
      ...(start
        ? {
            sequenceKind: kind,
            sequenceStep: 0,
            sequenceStartedAt: input.occurredAt,
            nextEmailAt: stepDueAt(input.occurredAt, 0, delaysFor(kind, settings)),
            convertedAt: null,
          }
        : {}),
      updatedAt: now,
    })
    .where(eq(schema.prospects.id, existing.id));
  return start ? "restarted" : "updated";
}

/** Démarre (ou relance depuis le début) la séquence pour un prospect, depuis l'admin. */
export async function startProspectSequence(id: string) {
  const settings = await getProspectSettings();
  const now = new Date();
  // Le premier email part au prochain passage (≈ 15 min) : le délai « +1 h » vaut pour les abandons en direct.
  await getDb()
    .update(schema.prospects)
    .set({ status: "open", sequenceStep: 0, sequenceStartedAt: now, nextEmailAt: now, updatedAt: now })
    .where(and(eq(schema.prospects.id, id), inArray(schema.prospects.status, ["open", "lost"])));
  return settings.enabled;
}

export async function stopProspectSequence(id: string, status: "open" | "lost" = "open") {
  await getDb()
    .update(schema.prospects)
    .set({ status, nextEmailAt: null, updatedAt: new Date() })
    .where(and(eq(schema.prospects.id, id), inArray(schema.prospects.status, ["open", "lost"])));
}

/** Référence du modèle offert à ce prospect (dernier cadeau), pour personnaliser la séquence de bienvenue. */
async function giftPlanCode(email: string) {
  const db = getDb();
  const gift = await db.query.checkoutIntents.findFirst({
    where: and(eq(schema.checkoutIntents.email, email), eq(schema.checkoutIntents.status, "gift")),
    orderBy: desc(schema.checkoutIntents.createdAt),
    columns: { planSlug: true },
  });
  if (!gift?.planSlug) return null;
  const plan = await db.query.plans.findFirst({ where: eq(schema.plans.slug, gift.planSlug), columns: { code: true } });
  return plan?.code ?? null;
}

async function publishedPlanCount() {
  const [row] = await getDb()
    .select({ n: count() })
    .from(schema.plans)
    .where(eq(schema.plans.status, "published"));
  return row?.n ?? 0;
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Passage du cron (toutes les 15 min) : envoie les emails dus de la séquence.
 * Chaque prospect est « réclamé » avant l'envoi (pas de doublon si deux passages se chevauchent).
 */
export async function runProspectSequence(now = new Date()) {
  const settings = await getProspectSettings();
  const result = { sent: 0, failed: 0, converted: 0, unsubscribed: 0, finished: 0, budgetLeft: 0 };
  if (!settings.enabled) return result;
  const db = getDb();

  // Quota Resend : au-delà, les emails dus attendent le prochain passage (aucun n'est perdu).
  const allowance = await automatedEmailAllowance(now);
  result.budgetLeft = allowance;
  if (allowance <= 0) return result;
  const due = await db.query.prospects.findMany({
    where: and(eq(schema.prospects.status, "open"), isNotNull(schema.prospects.nextEmailAt), lte(schema.prospects.nextEmailAt, now)),
    orderBy: asc(schema.prospects.nextEmailAt),
    limit: Math.min(settings.perRun, allowance),
  });
  if (due.length === 0) return result;

  const emails = due.map((p) => p.email);
  const [optedOut, planCount] = await Promise.all([optedOutEmails(emails, "prospects"), publishedPlanCount()]);
  const customers = new Set<string>();
  for (const p of due) if (await isCustomer(p.email, p.phone)) customers.add(p.email);
  const price = formatFcfa(cataloguePrice());

  for (const p of due) {
    if (customers.has(p.email)) {
      await db
        .update(schema.prospects)
        .set({ status: "converted", convertedAt: now, nextEmailAt: null, updatedAt: now })
        .where(eq(schema.prospects.id, p.id));
      result.converted++;
      continue;
    }
    if (optedOut.has(p.email)) {
      await db.update(schema.prospects).set({ status: "unsubscribed", nextEmailAt: null, updatedAt: now }).where(eq(schema.prospects.id, p.id));
      result.unsubscribed++;
      continue;
    }
    const step = p.sequenceStep;
    const delays = delaysFor(p.sequenceKind, settings);
    const total = delays.length;
    if (step >= total || !p.sequenceStartedAt) {
      await db.update(schema.prospects).set({ nextEmailAt: null, updatedAt: now }).where(eq(schema.prospects.id, p.id));
      result.finished++;
      continue;
    }
    const claimed = await db
      .update(schema.prospects)
      .set({ nextEmailAt: null, updatedAt: now })
      .where(and(eq(schema.prospects.id, p.id), eq(schema.prospects.nextEmailAt, p.nextEmailAt!)))
      .returning({ id: schema.prospects.id });
    if (claimed.length === 0) continue;

    const welcome = p.sequenceKind === "bienvenue";
    const kind = emailKindForStep(step, total, Boolean(settings.discountCode));
    const withDiscount = welcome ? step === total - 1 && settings.discountCode : (kind === "offer" || kind === "last") && settings.discountCode;
    const unsubscribe = await unsubscribeUrl(p.email, "prospects");
    const mail = welcome
      ? welcomeEmail({
          kind: welcomeKindForStep(step),
          name: p.name,
          planCode: await giftPlanCode(p.email),
          checkoutUrl: siteUrl(`/catalogue-premium?utm_source=email&utm_medium=bienvenue&utm_campaign=bienvenue_${step + 1}`),
          price,
          planCount,
          discountCode: withDiscount ? settings.discountCode : undefined,
          discountLabel: withDiscount ? settings.discountLabel : undefined,
          unsubscribe,
        })
      : prospectEmail({
          kind,
          name: p.name,
          lastEvent: p.lastEvent === "gift" ? "started" : p.lastEvent,
          checkoutUrl: siteUrl(`/catalogue-premium?utm_source=email&utm_medium=relance&utm_campaign=prospect_${step + 1}`),
          whatsappUrl: whatsappLink(
            p.lastEvent === "failed"
              ? "Bonjour WOOPLANS, mon paiement du Catalogue Premium n'a pas abouti, pouvez-vous m'aider ?"
              : "Bonjour WOOPLANS, j'ai une question sur le Catalogue Premium.",
            getEnv().WHATSAPP_NUMBER || undefined,
          ),
          price,
          planCount,
          discountCode: withDiscount ? settings.discountCode : undefined,
          discountLabel: withDiscount ? settings.discountLabel : undefined,
          unsubscribe,
      });
    const sent = await sendEmail({
      to: p.email,
      ...mail,
      template: welcome ? `bienvenue_${step + 1}` : `prospect_${step + 1}`,
      headers: await unsubscribeHeaders(p.email, "prospects"),
    });

    if (sent.ok) {
      const next = stepDueAt(p.sequenceStartedAt, step + 1, delays);
      await db
        .update(schema.prospects)
        // Un envoi en retard ne déclenche pas le suivant aussitôt : au moins 12 h d'écart.
        .set({
          sequenceStep: step + 1,
          lastEmailAt: now,
          nextEmailAt: next ? new Date(Math.max(next.getTime(), now.getTime() + 12 * 3_600_000)) : null,
          updatedAt: now,
        })
        .where(eq(schema.prospects.id, p.id));
      result.sent++;
      if (!next) result.finished++;
    } else {
      // Nouvelle tentative dans 1 h, sans avancer dans la séquence.
      await db
        .update(schema.prospects)
        .set({ nextEmailAt: new Date(now.getTime() + 3_600_000), updatedAt: now })
        .where(eq(schema.prospects.id, p.id));
      result.failed++;
    }
    await pause(400); // Reste sous la limite de débit de Resend.
  }
  return result;
}

/**
 * Emails laissés sur le site (formulaire avant paiement) sans paiement ni notification Chariow :
 * ils rejoignent les prospects 2 h après, avec la séquence.
 */
export async function enrollStaleIntents(now = new Date()) {
  const db = getDb();
  const intents = await db.query.checkoutIntents.findMany({
    where: and(
      eq(schema.checkoutIntents.status, "started"),
      isNotNull(schema.checkoutIntents.email),
      isNull(schema.checkoutIntents.saleId),
      lte(schema.checkoutIntents.createdAt, new Date(now.getTime() - 2 * 3_600_000)),
      gte(schema.checkoutIntents.createdAt, new Date(now.getTime() - 3 * 24 * 3_600_000)),
    ),
    orderBy: desc(schema.checkoutIntents.createdAt),
    limit: 50,
  });
  let enrolled = 0;
  for (const intent of intents) {
    const email = normalizeEmail(intent.email!);
    const known = await db.query.prospects.findFirst({ where: eq(schema.prospects.email, email), columns: { id: true } });
    if (!known) {
      const visitor = intent.visitorId ? await db.query.visitors.findFirst({ where: eq(schema.visitors.id, intent.visitorId) }) : null;
      const outcome = await recordProspectEvent({
        email,
        event: "started",
        occurredAt: intent.createdAt,
        source: "site",
        utmSource: visitor?.utmSource ?? null,
        utmCampaign: visitor?.utmCampaign ?? null,
        startSequence: true,
      });
      if (outcome === "created") enrolled++;
    }
    await db.update(schema.checkoutIntents).set({ status: "abandoned", updatedAt: now }).where(eq(schema.checkoutIntents.id, intent.id));
  }
  return enrolled;
}

type ApiSale = {
  id: string;
  status: string;
  amount?: { value?: number } | null;
  product?: { id?: string } | null;
  customer?: { email?: string; name?: string; phone?: ChariowPhone; country?: string | { code?: string } | null } | null;
  created_at?: string;
  abandoned_at?: string | null;
  failed_at?: string | null;
};

/** Importe l'historique Chariow des paiements abandonnés / échoués (sans envoyer d'email). */
export async function importChariowProspects(maxPages = 10) {
  const apiKey = getEnv().CHARIOW_API_KEY;
  if (!apiKey) throw new Error("CHARIOW_API_KEY manquant");
  const products = catalogueProductIds();
  let scanned = 0;
  let added = 0;
  let customers = 0;
  for (const status of ["abandoned", "failed"] as const) {
    let cursor: string | null = null;
    for (let page = 0; page < maxPages; page++) {
      const url = new URL("https://api.chariow.com/v1/sales");
      url.searchParams.set("status", status);
      url.searchParams.set("per_page", "100");
      if (cursor) url.searchParams.set("cursor", cursor);
      const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
      if (!res.ok) throw new Error(`Chariow API ${res.status}`);
      const body = (await res.json()) as { data?: ApiSale[]; pagination?: { next_cursor?: string | null; has_more?: boolean } };
      scanned += body.data?.length ?? 0;
      for (const s of body.data ?? []) {
        if (!s.customer?.email || !s.product?.id || !products.has(s.product.id)) continue;
        const country = (typeof s.customer.country === "string" ? s.customer.country : s.customer.country?.code) || phoneCountry(s.customer.phone);
        const outcome = await recordProspectEvent({
          email: s.customer.email,
          name: s.customer.name ?? null,
          phone: normalizePhone(s.customer.phone),
          country: country ?? null,
          event: status,
          occurredAt: new Date(s.abandoned_at || s.failed_at || s.created_at || Date.now()),
          saleId: s.id,
          amount: Math.round(Number(s.amount?.value ?? 0)) || null,
          source: "chariow_import",
          startSequence: false,
        });
        if (outcome === "created") added++;
        if (outcome === "customer") customers++;
      }
      cursor = body.pagination?.next_cursor ?? null;
      if (!cursor || body.pagination?.has_more === false) break;
    }
  }
  // Filet de sécurité : un prospect importé qui a payé plus tard (autre tentative) passe en « converti ».
  const reconciled = await reconcileProspects();
  return { scanned, added, customers, reconciled };
}

/** Lance la séquence pour les prospects importés récents qui n'en ont jamais reçu (depuis l'admin). */
export async function startSequenceForRecent(days: number) {
  const now = new Date();
  const rows = await getDb()
    .update(schema.prospects)
    .set({ sequenceStep: 0, sequenceStartedAt: now, nextEmailAt: now, updatedAt: now })
    .where(
      and(
        eq(schema.prospects.status, "open"),
        isNull(schema.prospects.sequenceStartedAt),
        gte(schema.prospects.lastEventAt, new Date(now.getTime() - days * 24 * 3_600_000)),
      ),
    )
    .returning({ id: schema.prospects.id });
  return rows.length;
}
