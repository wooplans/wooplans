import { getPrisma } from "@/lib/prisma";
import { ensureD1Schema } from "@/lib/d1-schema";

export type PlanRecord = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  surface: number;
  bedrooms: number;
  bathrooms: number;
  floors: number;
  rooms: string;
  images: string;
  thumbnail: string;
  estimatedCost: number;
  estimatedCostImage: string;
  distributionPlans: string;
  distributionPlanUrl: string;
  featured: boolean;
  cataloguePreview: boolean;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type DashboardStats = {
  totalPlans: number;
  publishedPlans: number;
  featuredPlans: number;
  totalSubscribers: number;
  activeSubscribers: number;
};

export type AnalyticsDashboard = DashboardStats & {
  draftPlans: number;
  inactiveSubscribers: number;
  expiredSubscribers: number;
  expiringSoonSubscribers: number;
  newSubscribers30d: number;
  newPlans30d: number;
  totalEstimatedCost: number;
  averageEstimatedCost: number;
  averageSurface: number;
  publicationRate: number;
  activeSubscriberRate: number;
  categoryBreakdown: {
    category: string;
    total: number;
    published: number;
    featured: number;
    averageSurface: number;
    averageEstimatedCost: number;
  }[];
  surfaceBreakdown: {
    label: string;
    total: number;
  }[];
  subscriberGrowth: {
    label: string;
    total: number;
  }[];
  recentSubscribers: {
    id: string;
    email: string;
    isActive: boolean;
    expiresAt: Date | null;
    createdAt: Date;
  }[];
};

function mapPlanRecord(row: PlanRecord): PlanRecord {
  return {
    ...row,
    surface: Number(row.surface) || 0,
    bedrooms: Number(row.bedrooms) || 0,
    bathrooms: Number(row.bathrooms) || 0,
    floors: Number(row.floors) || 1,
    estimatedCost: Number(row.estimatedCost) || 0,
    cataloguePreview: Boolean(row.cataloguePreview),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export async function listEdgePlans() {
  await ensureD1Schema();
  const prisma = getPrisma();
  const plans = await prisma.plan.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return plans.map((plan: unknown) => mapPlanRecord(plan as PlanRecord));
}

export async function listRecentEdgePlans(limit = 8) {
  await ensureD1Schema();
  const prisma = getPrisma();
  const plans = await prisma.plan.findMany({
    select: {
      id: true,
      name: true,
      category: true,
      surface: true,
      bedrooms: true,
      bathrooms: true,
      floors: true,
      thumbnail: true,
      published: true,
      featured: true,
      estimatedCost: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  return plans.map((plan: {
    id: string;
    name: string;
    category: string;
    surface: number;
    bedrooms: number;
    bathrooms: number;
    floors: number;
    thumbnail: string;
    published: boolean;
    featured: boolean;
    estimatedCost: number;
    updatedAt: Date;
  }) => ({
    ...plan,
    surface: Number(plan.surface) || 0,
    bedrooms: Number(plan.bedrooms) || 0,
    bathrooms: Number(plan.bathrooms) || 0,
    floors: Number(plan.floors) || 1,
    estimatedCost: Number(plan.estimatedCost) || 0,
    updatedAt: new Date(plan.updatedAt),
  }));
}

export async function getEdgePlanById(id: string) {
  await ensureD1Schema();
  const prisma = getPrisma();
  const plan = await prisma.plan.findUnique({
    where: { id },
  });

  return plan ? mapPlanRecord(plan as PlanRecord) : null;
}

export async function getEdgePlanBySlug(slug: string) {
  await ensureD1Schema();
  const prisma = getPrisma();
  const plan = await prisma.plan.findUnique({
    where: { slug },
  });

  return plan ? mapPlanRecord(plan as PlanRecord) : null;
}

export async function createEdgePlan(plan: Omit<PlanRecord, "createdAt" | "updatedAt">) {
  await ensureD1Schema();
  const prisma = getPrisma();
  const created = await prisma.plan.create({
    data: plan,
  });

  return mapPlanRecord(created as PlanRecord);
}

export async function updateEdgePlan(
  id: string,
  updates: Partial<Omit<PlanRecord, "id" | "createdAt" | "updatedAt">>,
) {
  await ensureD1Schema();
  const data = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined),
  );

  if (Object.keys(data).length === 0) {
    return getEdgePlanById(id);
  }

  const prisma = getPrisma();
  const updated = await prisma.plan.update({
    where: { id },
    data,
  });

  return mapPlanRecord(updated as PlanRecord);
}

export async function deleteEdgePlan(id: string) {
  await ensureD1Schema();
  const prisma = getPrisma();
  await prisma.plan.delete({
    where: { id },
  });
}

export async function getEdgeDashboardStats(): Promise<DashboardStats> {
  await ensureD1Schema();
  const prisma = getPrisma();
  const [totalPlans, publishedPlans, featuredPlans, totalSubscribers, activeSubscribers] =
    await Promise.all([
      prisma.plan.count(),
      prisma.plan.count({ where: { published: true } }),
      prisma.plan.count({ where: { featured: true } }),
      prisma.subscriber.count(),
      prisma.subscriber.count({ where: { isActive: true } }),
    ]);

  return {
    totalPlans,
    publishedPlans,
    featuredPlans,
    totalSubscribers,
    activeSubscribers,
  };
}

export async function listCataloguePreviewEdgePlans(limit = 6) {
  await ensureD1Schema();
  const prisma = getPrisma();
  const plans = await prisma.plan.findMany({
    where: {
      published: true,
      cataloguePreview: true,
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  return plans.map((plan: unknown) => mapPlanRecord(plan as PlanRecord));
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(date: Date) {
  return date.toLocaleDateString("fr-FR", { month: "short" });
}

function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function average(total: number, count: number) {
  return count > 0 ? Math.round(total / count) : 0;
}

export async function getEdgeAnalyticsDashboard(): Promise<AnalyticsDashboard> {
  await ensureD1Schema();
  const prisma = getPrisma();
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const expiringSoonLimit = new Date(now);
  expiringSoonLimit.setDate(now.getDate() + 30);

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [plans, subscribers] = await Promise.all([
    prisma.plan.findMany({
      select: {
        id: true,
        category: true,
        surface: true,
        estimatedCost: true,
        published: true,
        featured: true,
        createdAt: true,
      },
    }),
    prisma.subscriber.findMany({
      select: {
        id: true,
        email: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const normalizedPlans = plans.map((plan) => ({
    ...plan,
    surface: Number(plan.surface) || 0,
    estimatedCost: Number(plan.estimatedCost) || 0,
    createdAt: new Date(plan.createdAt),
  }));

  const normalizedSubscribers = subscribers.map((subscriber) => ({
    ...subscriber,
    expiresAt: subscriber.expiresAt ? new Date(subscriber.expiresAt) : null,
    createdAt: new Date(subscriber.createdAt),
  }));

  const totalPlans = normalizedPlans.length;
  const publishedPlans = normalizedPlans.filter((plan) => plan.published).length;
  const featuredPlans = normalizedPlans.filter((plan) => plan.featured).length;
  const totalSubscribers = normalizedSubscribers.length;
  const activeSubscribers = normalizedSubscribers.filter((subscriber) => subscriber.isActive).length;
  const expiredSubscribers = normalizedSubscribers.filter(
    (subscriber) => subscriber.expiresAt !== null && subscriber.expiresAt < now,
  ).length;
  const expiringSoonSubscribers = normalizedSubscribers.filter(
    (subscriber) =>
      subscriber.isActive &&
      subscriber.expiresAt !== null &&
      subscriber.expiresAt >= now &&
      subscriber.expiresAt <= expiringSoonLimit,
  ).length;
  const newSubscribers30d = normalizedSubscribers.filter(
    (subscriber) => subscriber.createdAt >= thirtyDaysAgo,
  ).length;
  const newPlans30d = normalizedPlans.filter((plan) => plan.createdAt >= thirtyDaysAgo).length;
  const totalEstimatedCost = normalizedPlans.reduce((sum, plan) => sum + plan.estimatedCost, 0);
  const totalSurface = normalizedPlans.reduce((sum, plan) => sum + plan.surface, 0);

  const categories = new Map<
    string,
    {
      total: number;
      published: number;
      featured: number;
      surface: number;
      estimatedCost: number;
    }
  >();

  for (const plan of normalizedPlans) {
    const current = categories.get(plan.category) ?? {
      total: 0,
      published: 0,
      featured: 0,
      surface: 0,
      estimatedCost: 0,
    };

    current.total += 1;
    current.published += plan.published ? 1 : 0;
    current.featured += plan.featured ? 1 : 0;
    current.surface += plan.surface;
    current.estimatedCost += plan.estimatedCost;
    categories.set(plan.category, current);
  }

  const categoryBreakdown = Array.from(categories.entries())
    .map(([category, value]) => ({
      category,
      total: value.total,
      published: value.published,
      featured: value.featured,
      averageSurface: average(value.surface, value.total),
      averageEstimatedCost: average(value.estimatedCost, value.total),
    }))
    .sort((a, b) => b.total - a.total);

  const surfaceBuckets = [
    { label: "< 100 m2", min: 0, max: 99, total: 0 },
    { label: "100-149 m2", min: 100, max: 149, total: 0 },
    { label: "150-199 m2", min: 150, max: 199, total: 0 },
    { label: "200+ m2", min: 200, max: Number.POSITIVE_INFINITY, total: 0 },
  ];

  for (const plan of normalizedPlans) {
    const bucket = surfaceBuckets.find(
      (item) => plan.surface >= item.min && plan.surface <= item.max,
    );
    if (bucket) bucket.total += 1;
  }

  const monthBuckets = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: getMonthKey(date),
      label: getMonthLabel(date),
      total: 0,
    };
  });

  const monthBucketMap = new Map(monthBuckets.map((bucket) => [bucket.key, bucket]));
  for (const subscriber of normalizedSubscribers) {
    if (subscriber.createdAt < sixMonthsAgo) continue;
    const bucket = monthBucketMap.get(getMonthKey(subscriber.createdAt));
    if (bucket) bucket.total += 1;
  }

  return {
    totalPlans,
    publishedPlans,
    featuredPlans,
    totalSubscribers,
    activeSubscribers,
    draftPlans: totalPlans - publishedPlans,
    inactiveSubscribers: totalSubscribers - activeSubscribers,
    expiredSubscribers,
    expiringSoonSubscribers,
    newSubscribers30d,
    newPlans30d,
    totalEstimatedCost,
    averageEstimatedCost: average(totalEstimatedCost, totalPlans),
    averageSurface: average(totalSurface, totalPlans),
    publicationRate: percent(publishedPlans, totalPlans),
    activeSubscriberRate: percent(activeSubscribers, totalSubscribers),
    categoryBreakdown,
    surfaceBreakdown: surfaceBuckets.map(({ label, total }) => ({ label, total })),
    subscriberGrowth: monthBuckets.map(({ label, total }) => ({ label, total })),
    recentSubscribers: normalizedSubscribers.slice(0, 5),
  };
}
