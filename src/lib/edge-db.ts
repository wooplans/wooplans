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

function mapPlanRecord(row: PlanRecord): PlanRecord {
  return {
    ...row,
    surface: Number(row.surface) || 0,
    bedrooms: Number(row.bedrooms) || 0,
    bathrooms: Number(row.bathrooms) || 0,
    floors: Number(row.floors) || 1,
    estimatedCost: Number(row.estimatedCost) || 0,
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
