import { getPrisma } from "@/lib/prisma";
import { ensureD1Schema } from "@/lib/d1-schema";
import {
  type FunnelAttribution,
  type FunnelEventType,
  type FunnelSource,
  parseFunnelJson,
  sanitizeMetadataInput,
  safeJsonStringify,
} from "@/lib/funnel";

export type FunnelSessionRecord = {
  id: string;
  source: FunnelSource;
  landingPath: string;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  fbclidPresent: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type FunnelEventRecord = {
  id: string;
  sessionId: string;
  type: FunnelEventType;
  path: string;
  ctaId: string | null;
  metadataJson: string;
  createdAt: Date;
};

export type FunnelSaleRecord = {
  id: string;
  sessionId: string | null;
  chariowSaleId: string;
  productId: string;
  productName: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: Date;
};

export type FunnelSessionInput = FunnelAttribution & {
  sessionId: string;
};

export type FunnelEventInput = {
  sessionId: string;
  type: FunnelEventType;
  path: string;
  ctaId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type FunnelSaleInput = {
  sessionId?: string | null;
  chariowSaleId: string;
  productId: string;
  productName: string;
  amount: number;
  currency: string;
  status: string;
};

export type FunnelComparisonRow = {
  source: FunnelSource;
  sessions: number;
  ctaClicks: number;
  checkoutsStarted: number;
  salesCompleted: number;
  revenue: number;
  visitToCtaRate: number;
  ctaToCheckoutRate: number;
  checkoutToSaleRate: number;
  visitToSaleRate: number;
};

export type FunnelTopStepRow = {
  key: string;
  path: string;
  ctaId: string | null;
  sessions: number;
  sales: number;
  revenue: number;
  conversionRate: number;
};

export type FunnelInsight = {
  title: string;
  description: string;
  severity: "info" | "warning" | "critical";
};

export type FunnelAnalytics = {
  periodDays: number;
  startDate: Date;
  endDate: Date;
  totals: {
    sessions: number;
    ctaClicks: number;
    checkoutsStarted: number;
    salesCompleted: number;
    revenue: number;
  };
  comparisons: FunnelComparisonRow[];
  dropOff: {
    stage: string;
    rate: number;
    loss: number;
  } | null;
  topPages: FunnelTopStepRow[];
  topCtas: FunnelTopStepRow[];
  insights: FunnelInsight[];
};

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function money(value: number) {
  return `${value.toLocaleString("fr-FR")} FCFA`;
}

function normalizeSession(row: {
  id: string;
  source: string;
  landingPath: string;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  fbclidPresent: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}): FunnelSessionRecord {
  return {
    ...row,
    source: row.source as FunnelSource,
    fbclidPresent: Boolean(row.fbclidPresent),
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
  };
}

function normalizeEvent(row: {
  id: string;
  sessionId: string;
  type: string;
  path: string;
  ctaId: string | null;
  metadataJson: string;
  createdAt: Date | string;
}): FunnelEventRecord {
  return {
    ...row,
    type: row.type as FunnelEventType,
    createdAt: toDate(row.createdAt),
  };
}

function normalizeSale(row: {
  id: string;
  sessionId: string | null;
  chariowSaleId: string;
  productId: string;
  productName: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: Date | string;
}): FunnelSaleRecord {
  return {
    ...row,
    amount: Number(row.amount) || 0,
    createdAt: toDate(row.createdAt),
  };
}

export async function ensureFunnelSession(input: FunnelSessionInput) {
  await ensureD1Schema();
  const prisma = getPrisma();
  const existing = await prisma.funnelSession.findUnique({
    where: { id: input.sessionId },
  });

  if (existing) {
    return normalizeSession(existing as FunnelSessionRecord);
  }

  const created = await prisma.funnelSession.create({
    data: {
      id: input.sessionId,
      source: input.source,
      landingPath: input.landingPath,
      referrer: input.referrer,
      utmSource: input.utmSource,
      utmMedium: input.utmMedium,
      utmCampaign: input.utmCampaign,
      utmContent: input.utmContent,
      utmTerm: input.utmTerm,
      fbclidPresent: input.fbclidPresent,
    },
  });

  return normalizeSession(created as FunnelSessionRecord);
}

export async function recordFunnelEvent(input: FunnelEventInput) {
  await ensureD1Schema();
  const prisma = getPrisma();
  const created = await prisma.funnelEvent.create({
    data: {
      sessionId: input.sessionId,
      type: input.type,
      path: input.path,
      ctaId: input.ctaId ?? null,
      metadataJson: safeJsonStringify(sanitizeMetadataInput(input.metadata)),
    },
  });

  return normalizeEvent(created as FunnelEventRecord);
}

export async function recordFunnelSale(input: FunnelSaleInput) {
  await ensureD1Schema();
  const prisma = getPrisma();
  const saleData = {
    sessionId: input.sessionId ?? null,
    productId: input.productId,
    productName: input.productName,
    amount: Math.max(0, Math.round(input.amount)),
    currency: input.currency,
    status: input.status,
  };

  const sale = await prisma.funnelSale.upsert({
    where: { chariowSaleId: input.chariowSaleId },
    update: saleData,
    create: {
      id: crypto.randomUUID(),
      chariowSaleId: input.chariowSaleId,
      ...saleData,
    },
  });

  return normalizeSale(sale as FunnelSaleRecord);
}

export async function getFunnelAnalytics(periodDays = 30): Promise<FunnelAnalytics> {
  await ensureD1Schema();
  const prisma = getPrisma();
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - Math.max(1, periodDays - 1));
  startDate.setHours(0, 0, 0, 0);

  const [sessions, events, sales] = await Promise.all([
    prisma.funnelSession.findMany({
      where: { createdAt: { gte: startDate } },
    }),
    prisma.funnelEvent.findMany({
      where: { createdAt: { gte: startDate } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.funnelSale.findMany({
      where: { createdAt: { gte: startDate } },
    }),
  ]);

  const normalizedSessions = sessions.map((session) => normalizeSession(session as FunnelSessionRecord));
  const normalizedEvents = events.map((event) => normalizeEvent(event as FunnelEventRecord));
  const normalizedSales = sales.map((sale) => normalizeSale(sale as FunnelSaleRecord));

  const sessionMap = new Map(normalizedSessions.map((session) => [session.id, session]));
  const sessionSales = new Map<string, FunnelSaleRecord>();
  for (const sale of normalizedSales) {
    if (sale.sessionId) {
      sessionSales.set(sale.sessionId, sale);
    }
  }

  const ctaClicks = normalizedEvents.filter((event) => event.type === "premium_cta_click");
  const checkoutsStarted = normalizedEvents.filter((event) => event.type === "checkout_started");

  const comparisonBySource = new Map<FunnelSource, FunnelComparisonRow>([
    [
      "organic",
      {
        source: "organic",
        sessions: 0,
        ctaClicks: 0,
        checkoutsStarted: 0,
        salesCompleted: 0,
        revenue: 0,
        visitToCtaRate: 0,
        ctaToCheckoutRate: 0,
        checkoutToSaleRate: 0,
        visitToSaleRate: 0,
      },
    ],
    [
      "facebook_ads",
      {
        source: "facebook_ads",
        sessions: 0,
        ctaClicks: 0,
        checkoutsStarted: 0,
        salesCompleted: 0,
        revenue: 0,
        visitToCtaRate: 0,
        ctaToCheckoutRate: 0,
        checkoutToSaleRate: 0,
        visitToSaleRate: 0,
      },
    ],
  ]);

  for (const session of normalizedSessions) {
    const bucket = comparisonBySource.get(session.source);
    if (bucket) bucket.sessions += 1;
  }

  for (const event of ctaClicks) {
    const session = sessionMap.get(event.sessionId);
    if (!session) continue;
    const bucket = comparisonBySource.get(session.source);
    if (bucket) bucket.ctaClicks += 1;
  }

  for (const event of checkoutsStarted) {
    const session = sessionMap.get(event.sessionId);
    if (!session) continue;
    const bucket = comparisonBySource.get(session.source);
    if (bucket) bucket.checkoutsStarted += 1;
  }

  for (const sale of normalizedSales) {
    const session = sale.sessionId ? sessionMap.get(sale.sessionId) : null;
    if (!session) continue;
    const bucket = comparisonBySource.get(session.source);
    if (bucket) {
      bucket.salesCompleted += 1;
      bucket.revenue += sale.amount;
    }
  }

  for (const bucket of Array.from(comparisonBySource.values())) {
    bucket.visitToCtaRate = percent(bucket.ctaClicks, bucket.sessions);
    bucket.ctaToCheckoutRate = percent(bucket.checkoutsStarted, bucket.ctaClicks);
    bucket.checkoutToSaleRate = percent(bucket.salesCompleted, bucket.checkoutsStarted);
    bucket.visitToSaleRate = percent(bucket.salesCompleted, bucket.sessions);
  }

  const stageDropCandidates = [
    {
      stage: "Visite -> CTA",
      rate: percent(normalizedEvents.filter((event) => event.type === "premium_cta_click").length, normalizedSessions.length),
    },
    {
      stage: "CTA -> Checkout",
      rate: percent(
        normalizedEvents.filter((event) => event.type === "checkout_started").length,
        normalizedEvents.filter((event) => event.type === "premium_cta_click").length,
      ),
    },
    {
      stage: "Checkout -> Paiement",
      rate: percent(normalizedSales.length, normalizedEvents.filter((event) => event.type === "checkout_started").length),
    },
  ];

  const dropOffStage = stageDropCandidates
    .map((candidate) => ({
      ...candidate,
      loss: Math.max(0, 100 - candidate.rate),
    }))
    .sort((a, b) => b.loss - a.loss)[0] ?? null;

  const latestCheckoutBySession = new Map<string, FunnelEventRecord>();
  for (const event of checkoutsStarted) {
    const current = latestCheckoutBySession.get(event.sessionId);
    if (!current || current.createdAt < event.createdAt) {
      latestCheckoutBySession.set(event.sessionId, event);
    }
  }

  const pageStats = new Map<string, { path: string; ctaId: string | null; sessions: number; sales: number; revenue: number }>();
  const ctaStats = new Map<string, { path: string; ctaId: string | null; sessions: number; sales: number; revenue: number }>();

  for (const [sessionId, event] of Array.from(latestCheckoutBySession.entries())) {
    const sale = sessionSales.get(sessionId);
    const key = `${event.path}::${event.ctaId || "cta"}`;
    const current = pageStats.get(event.path) ?? {
      path: event.path,
      ctaId: event.ctaId,
      sessions: 0,
      sales: 0,
      revenue: 0,
    };
    current.sessions += 1;
    if (sale) {
      current.sales += 1;
      current.revenue += sale.amount;
    }
    pageStats.set(event.path, current);

    const ctaCurrent = ctaStats.get(key) ?? {
      path: event.path,
      ctaId: event.ctaId,
      sessions: 0,
      sales: 0,
      revenue: 0,
    };
    ctaCurrent.sessions += 1;
    if (sale) {
      ctaCurrent.sales += 1;
      ctaCurrent.revenue += sale.amount;
    }
    ctaStats.set(key, ctaCurrent);
  }

  const topPages = Array.from(pageStats.values())
    .map((row) => ({
      key: row.path,
      path: row.path,
      ctaId: row.ctaId,
      sessions: row.sessions,
      sales: row.sales,
      revenue: row.revenue,
      conversionRate: percent(row.sales, row.sessions),
    }))
    .sort((a, b) => b.sales - a.sales || b.conversionRate - a.conversionRate)
    .slice(0, 5);

  const topCtas = Array.from(ctaStats.values())
    .map((row) => ({
      key: `${row.path}::${row.ctaId || "cta"}`,
      path: row.path,
      ctaId: row.ctaId,
      sessions: row.sessions,
      sales: row.sales,
      revenue: row.revenue,
      conversionRate: percent(row.sales, row.sessions),
    }))
    .sort((a, b) => b.sales - a.sales || b.conversionRate - a.conversionRate)
    .slice(0, 5);

  const insights: FunnelInsight[] = [];
  if (normalizedSessions.length > 0) {
    const visitToCtaRate = percent(ctaClicks.length, normalizedSessions.length);
    if (visitToCtaRate < 35) {
      insights.push({
        title: "Forte perte visite -> CTA",
        description: `Seulement ${visitToCtaRate}% des visites déclenchent un clic CTA. Tester le hero, le wording ou la hiérarchie de la preuve sociale.`,
        severity: "critical",
      });
    }
  }

  if (ctaClicks.length > 0) {
    const ctaToCheckoutRate = percent(checkoutsStarted.length, ctaClicks.length);
    if (ctaToCheckoutRate < 45) {
      insights.push({
        title: "Forte perte CTA -> checkout",
        description: `${ctaToCheckoutRate}% des clics continuent vers le checkout. Le formulaire pré-paiement ou la promesse peuvent freiner le passage à l'action.`,
        severity: "warning",
      });
    }
  }

  if (checkoutsStarted.length > 0) {
    const checkoutToSaleRate = percent(normalizedSales.length, checkoutsStarted.length);
    if (checkoutToSaleRate < 65) {
      insights.push({
        title: "Forte perte checkout -> paiement Chariow",
        description: `${checkoutToSaleRate}% des checkouts aboutissent à une vente. Vérifier la disponibilité des moyens de paiement, les messages d'erreur et la latence Chariow.`,
        severity: "critical",
      });
    }
  }

  const sourceRows = Array.from(comparisonBySource.values()).sort((a, b) => b.sessions - a.sessions);
  if (sourceRows.length >= 2) {
    const topSource = sourceRows[0];
    const otherSource = sourceRows[1];
    if (topSource.sessions >= 10 && topSource.visitToSaleRate < otherSource.visitToSaleRate - 10) {
      insights.push({
        title: "Source à volume élevé mais conversion faible",
        description: `${topSource.source} génère ${topSource.sessions} visites mais convertit à ${topSource.visitToSaleRate}% contre ${otherSource.visitToSaleRate}% pour ${otherSource.source}.`,
        severity: "warning",
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      title: "Tunnel stable",
      description: "Aucune perte critique détectée sur la période sélectionnée.",
      severity: "info",
    });
  }

  return {
    periodDays,
    startDate,
    endDate,
    totals: {
      sessions: normalizedSessions.length,
      ctaClicks: ctaClicks.length,
      checkoutsStarted: checkoutsStarted.length,
      salesCompleted: normalizedSales.length,
      revenue: normalizedSales.reduce((sum, sale) => sum + sale.amount, 0),
    },
    comparisons: Array.from(comparisonBySource.values()),
    dropOff: dropOffStage
      ? {
          stage: dropOffStage.stage,
          rate: dropOffStage.rate,
          loss: dropOffStage.loss,
        }
      : null,
    topPages,
    topCtas,
    insights,
  };
}

export function formatFunnelMoney(value: number) {
  return money(value);
}

export function formatFunnelMetadata(value: Record<string, unknown>) {
  return parseFunnelJson(safeJsonStringify(sanitizeMetadataInput(value)), {});
}
