import { and, asc, count, eq, gte, inArray, isNotNull, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { accessCodeEmail, sendEmail } from "@/lib/email";
import { automatedEmailAllowance } from "@/lib/email-budget";
import {
  doualaDayStart,
  LEGACY_FIRST_TEMPLATE,
  LEGACY_REMINDER_TEMPLATE,
  legacyBatchSize,
  legacyQueue,
  sanitizeLegacyCodesSettings,
  type LegacyCodesSettings,
  type LegacyHistory,
} from "@/lib/legacy-codes-schedule";
import { ACCESS_TEMPLATES } from "@/lib/member-mailing";
import { rotateAccessCode } from "@/lib/members";
import { getSetting, setSetting } from "@/lib/settings";

const LEGACY_TEMPLATES = [LEGACY_FIRST_TEMPLATE, LEGACY_REMINDER_TEMPLATE];

export const getLegacyCodesSettings = async () => sanitizeLegacyCodesSettings(await getSetting<Partial<LegacyCodesSettings> | null>("legacy_codes", null));
export const saveLegacyCodesSettings = (s: LegacyCodesSettings) => setSetting("legacy_codes", sanitizeLegacyCodesSettings(s));

/** File d'attente actuelle : membres actifs jamais connectés, sans code reçu (premiers envois) ou à relancer. */
export async function legacyCodesQueue(settings: LegacyCodesSettings, now = new Date()) {
  const db = getDb();
  const [members, logs] = await Promise.all([
    db.query.members.findMany({
      where: and(eq(schema.members.status, "active"), isNull(schema.members.lastLoginAt)),
      orderBy: asc(schema.members.createdAt),
    }),
    db.query.emailLog.findMany({
      where: and(isNotNull(schema.emailLog.memberId), inArray(schema.emailLog.template, ACCESS_TEMPLATES)),
      columns: { memberId: true, template: true, status: true, createdAt: true },
      orderBy: asc(schema.emailLog.createdAt),
    }),
  ]);
  const history = new Map<string, LegacyHistory>();
  for (const log of logs) {
    const h = history.get(log.memberId!) ?? { codeSentAt: null, reminded: false, failures: 0 };
    if (log.status === "sent") {
      h.codeSentAt = log.createdAt;
      h.failures = 0;
      if (log.template === LEGACY_REMINDER_TEMPLATE) h.reminded = true;
    } else if (LEGACY_TEMPLATES.includes(log.template)) {
      h.failures++;
    }
    history.set(log.memberId!, h);
  }
  return legacyQueue(members, history, settings, now);
}

/** Codes envoyés depuis le début de la journée (heure de Douala). */
export async function legacyCodesSentToday(now = new Date()) {
  const [row] = await getDb()
    .select({ n: count() })
    .from(schema.emailLog)
    .where(
      and(
        inArray(schema.emailLog.template, LEGACY_TEMPLATES),
        eq(schema.emailLog.status, "sent"),
        gte(schema.emailLog.createdAt, doualaDayStart(now)),
      ),
    );
  return row?.n ?? 0;
}

type Member = Awaited<ReturnType<typeof legacyCodesQueue>>["first"][number];

async function sendCodes(batch: { member: Member; reminder: boolean }[]) {
  let sent = 0;
  let failed = 0;
  for (const { member, reminder } of batch) {
    const { code } = await rotateAccessCode(member.id);
    const kind = reminder ? "legacy_reminder" : member.source === "legacy_import" ? "legacy" : "purchase";
    const mail = accessCodeEmail({ name: member.name, email: member.email, code, kind });
    const result = await sendEmail({
      to: member.email,
      ...mail,
      template: reminder ? LEGACY_REMINDER_TEMPLATE : LEGACY_FIRST_TEMPLATE,
      memberId: member.id,
    });
    if (result.ok) sent++;
    else failed++;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return { sent, failed };
}

/**
 * Passage automatique (toutes les 15 min) : dans la fenêtre du matin, complète le lot du jour
 * (premiers envois d'abord, puis rappels) dans la limite du quota Resend. Rien à faire = 0 email.
 */
export async function runLegacyCodes(now = new Date()) {
  const settings = await getLegacyCodesSettings();
  const result = { sent: 0, failed: 0, waiting: 0, reminders: 0 };
  if (!settings.enabled) return result;
  const [sentToday, allowance] = await Promise.all([legacyCodesSentToday(now), automatedEmailAllowance(now)]);
  const size = legacyBatchSize({ settings, now, sentToday, allowance });
  if (size <= 0) return result;
  const queue = await legacyCodesQueue(settings, now);
  const batch = [
    ...queue.first.map((member) => ({ member, reminder: false })),
    ...queue.reminders.map((member) => ({ member, reminder: true })),
  ].slice(0, size);
  Object.assign(result, await sendCodes(batch));
  result.waiting = queue.first.length;
  result.reminders = queue.reminders.length;
  return result;
}

/** Envoi manuel depuis l'admin (premiers envois seulement), hors fenêtre mais dans le quota. */
export async function sendLegacyCodesNow(limit = 25) {
  const queue = await legacyCodesQueue(await getLegacyCodesSettings());
  const allowance = await automatedEmailAllowance();
  const pending = queue.first.slice(0, Math.min(limit, allowance));
  const { sent } = await sendCodes(pending.map((member) => ({ member, reminder: false })));
  return { sent, attempted: pending.length, remaining: queue.first.length - sent, quotaReached: pending.length < Math.min(limit, queue.first.length) };
}
