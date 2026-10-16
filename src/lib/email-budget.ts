import { and, count, eq, gte } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getSetting, setSetting } from "@/lib/settings";

/**
 * Quota d'envoi Resend (offre gratuite : 100 emails / jour, 3 000 / mois).
 * Les emails automatiques (relances prospects, actualités membres, envoi des codes par lots)
 * ne consomment que ce qui reste après une réserve gardée pour les emails indispensables
 * (code d'accès après un achat, nouveau code demandé, notifications admin).
 */
export type EmailBudget = { dailyLimit: number; monthlyLimit: number; dailyReserve: number };

export const DEFAULT_EMAIL_BUDGET: EmailBudget = { dailyLimit: 100, monthlyLimit: 3000, dailyReserve: 25 };

export async function getEmailBudget(): Promise<EmailBudget> {
  const s = await getSetting<Partial<EmailBudget>>("email_budget", DEFAULT_EMAIL_BUDGET);
  const n = (v: unknown, fallback: number) => Math.max(0, Math.round(Number(v ?? fallback)) || 0);
  return {
    dailyLimit: n(s.dailyLimit, DEFAULT_EMAIL_BUDGET.dailyLimit),
    monthlyLimit: n(s.monthlyLimit, DEFAULT_EMAIL_BUDGET.monthlyLimit),
    dailyReserve: n(s.dailyReserve, DEFAULT_EMAIL_BUDGET.dailyReserve),
  };
}

export const saveEmailBudget = (b: EmailBudget) => setSetting("email_budget", b);

/** Emails partis (et tentés) sur 24 h glissantes et depuis le début du mois (UTC). */
export async function emailUsage(now = new Date()) {
  const db = getDb();
  const dayStart = new Date(now.getTime() - 24 * 3_600_000);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const sentSince = async (since: Date) =>
    (
      await db
        .select({ n: count() })
        .from(schema.emailLog)
        .where(and(eq(schema.emailLog.status, "sent"), gte(schema.emailLog.createdAt, since)))
    )[0]?.n ?? 0;
  const [day, month] = await Promise.all([sentSince(dayStart), sentSince(monthStart)]);
  return { day, month };
}

/** Nombre d'emails automatiques encore autorisés maintenant (0 = attendre). */
export async function automatedEmailAllowance(now = new Date()) {
  const [budget, usage] = await Promise.all([getEmailBudget(), emailUsage(now)]);
  // Réserve mensuelle : la réserve quotidienne sur ~30 jours, plafonnée au cinquième du quota.
  const monthlyReserve = Math.min(budget.dailyReserve * 30, Math.floor(budget.monthlyLimit / 5));
  return Math.max(
    0,
    Math.min(budget.dailyLimit - budget.dailyReserve - usage.day, budget.monthlyLimit - monthlyReserve - usage.month),
  );
}
