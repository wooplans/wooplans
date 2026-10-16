import { and, desc, eq, gt, inArray, isNotNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { memberDigestEmail, sendEmail, type DigestPlan } from "@/lib/email";
import { automatedEmailAllowance } from "@/lib/email-budget";
import { siteUrl } from "@/lib/env";
import { formatBudgetRange, levelsLabel } from "@/lib/plans";
import { getSetting, setSetting } from "@/lib/settings";
import { optedOutEmails, unsubscribeHeaders, unsubscribeUrl } from "@/lib/unsubscribe";

/** Emails qui transmettent un code d'accès : un envoi réussi = le membre a reçu son code. */
export const ACCESS_TEMPLATES = ["access_code", "access_code_reset", "legacy_welcome"];

export type CodeStatus = { state: "sent" | "failed" | "never"; at: Date | null };

/** Pour chaque membre : code reçu (date du dernier envoi réussi), échec seulement, ou jamais envoyé. */
export async function codeStatusByMember(): Promise<Map<string, CodeStatus>> {
  const logs = await getDb().query.emailLog.findMany({
    where: and(isNotNull(schema.emailLog.memberId), inArray(schema.emailLog.template, ACCESS_TEMPLATES)),
    columns: { memberId: true, status: true, createdAt: true },
    orderBy: desc(schema.emailLog.createdAt),
  });
  const map = new Map<string, CodeStatus>();
  for (const log of logs) {
    const current = map.get(log.memberId!);
    if (log.status === "sent") {
      if (!current || current.state !== "sent") map.set(log.memberId!, { state: "sent", at: log.createdAt });
    } else if (!current) {
      map.set(log.memberId!, { state: "failed", at: log.createdAt });
    }
  }
  return map;
}

/* ─────────────── Actualités mensuelles ─────────────── */

export type MemberDigestSettings = { enabled: boolean; dayOfMonth: number; perRun: number };
export const DEFAULT_MEMBER_DIGEST: MemberDigestSettings = { enabled: true, dayOfMonth: 1, perRun: 80 };

type Campaign = { month: string; startedAt: string; since: string; planIds: string[]; done: boolean };

export async function getMemberDigestSettings(): Promise<MemberDigestSettings> {
  const s = await getSetting<Partial<MemberDigestSettings>>("member_digest", DEFAULT_MEMBER_DIGEST);
  return {
    enabled: s.enabled ?? true,
    dayOfMonth: Math.min(28, Math.max(1, Math.round(Number(s.dayOfMonth ?? 1)) || 1)),
    perRun: Math.min(200, Math.max(1, Math.round(Number(s.perRun ?? 80)) || 80)),
  };
}

export const saveMemberDigestSettings = (s: MemberDigestSettings) => setSetting("member_digest", s);
export const getDigestCampaign = () => getSetting<Campaign | null>("member_digest_campaign", null);

const monthKey = (d: Date) => d.toISOString().slice(0, 7);

/**
 * Passage quotidien : à partir du jour choisi, ouvre la campagne du mois avec les modèles publiés
 * depuis la précédente (aucun nouveau modèle → pas d'email ce mois-ci), puis envoie par lots
 * aux membres actifs qui ont reçu leur code ou se sont déjà connectés, hors désinscrits.
 */
export async function runMemberDigest(now = new Date()) {
  const settings = await getMemberDigestSettings();
  const result = { campaign: null as string | null, plans: 0, sent: 0, failed: 0, remaining: 0 };
  if (!settings.enabled) return result;
  const db = getDb();
  const month = monthKey(now);
  let campaign = await getDigestCampaign();

  if (!campaign) {
    // Premier passage : point de départ, sans email (les modèles déjà publiés ne sont pas « nouveaux »).
    await setSetting("member_digest_campaign", { month, startedAt: now.toISOString(), since: now.toISOString(), planIds: [], done: true });
    return result;
  }
  if (campaign.month !== month) {
    if (now.getUTCDate() < settings.dayOfMonth) return result;
    const since = new Date(campaign.startedAt);
    const fresh = await db.query.plans.findMany({
      where: and(eq(schema.plans.status, "published"), gt(schema.plans.publishedAt, since)),
      columns: { id: true },
      orderBy: desc(schema.plans.publishedAt),
    });
    campaign = { month, startedAt: now.toISOString(), since: since.toISOString(), planIds: fresh.map((p) => p.id), done: fresh.length === 0 };
    await setSetting("member_digest_campaign", campaign);
  }
  result.campaign = campaign.month;
  result.plans = campaign.planIds.length;
  if (campaign.done) return result;

  const template = `member_digest:${campaign.month}`;
  const [members, codes, logs, plans] = await Promise.all([
    db.query.members.findMany({ where: eq(schema.members.status, "active") }),
    codeStatusByMember(),
    db.query.emailLog.findMany({ where: eq(schema.emailLog.template, template), columns: { memberId: true, status: true } }),
    db.query.plans.findMany({ where: and(inArray(schema.plans.id, campaign.planIds), eq(schema.plans.status, "published")) }),
  ]);
  if (plans.length === 0) {
    await setSetting("member_digest_campaign", { ...campaign, done: true });
    return result;
  }
  const attempts = new Map<string, { sent: boolean; fails: number }>();
  for (const l of logs) {
    const a = attempts.get(l.memberId ?? "") ?? { sent: false, fails: 0 };
    if (l.status === "sent") a.sent = true;
    else a.fails++;
    attempts.set(l.memberId ?? "", a);
  }
  const optedOut = await optedOutEmails(members.map((m) => m.email), "members");
  const eligible = members.filter((m) => {
    if (optedOut.has(m.email)) return false;
    if (codes.get(m.id)?.state !== "sent" && !m.lastLoginAt) return false;
    const a = attempts.get(m.id);
    return !a || (!a.sent && a.fails < 2);
  });

  const digestPlans: DigestPlan[] = plans.map((p) => ({
    name: p.name,
    url: siteUrl(`/espace-premium/plans/${p.slug}`),
    image: p.coverImage ? (p.coverImage.startsWith("http") ? p.coverImage : siteUrl(p.coverImage)) : null,
    details: `${p.bedrooms} chambres · ${p.surfaceTotal} m² · ${p.levels <= 1 ? "plain-pied" : levelsLabel(p.levels)}`,
    budget: formatBudgetRange(p.budgetMin, p.budgetMax),
  }));

  // Quota Resend : on laisse de la place aux relances prospects de la journée (plus urgentes).
  const allowance = Math.max(0, (await automatedEmailAllowance(now)) - 15);
  const batch = eligible.slice(0, Math.min(settings.perRun, allowance));
  for (const m of batch) {
    const mail = memberDigestEmail({
      name: m.name,
      email: m.email,
      plans: digestPlans,
      loginUrl: siteUrl(`/connexion?email=${encodeURIComponent(m.email)}&utm_source=email&utm_medium=actualites&utm_campaign=${campaign.month}`),
      customPlansUrl: siteUrl("/plans-personnalises?utm_source=email&utm_medium=actualites"),
      unsubscribe: await unsubscribeUrl(m.email, "members"),
    });
    const sent = await sendEmail({ to: m.email, ...mail, template, memberId: m.id, headers: await unsubscribeHeaders(m.email, "members") });
    if (sent.ok) result.sent++;
    else result.failed++;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  result.remaining = eligible.length - batch.length;
  if (result.remaining <= 0 && result.failed === 0) await setSetting("member_digest_campaign", { ...campaign, done: true });
  return result;
}
