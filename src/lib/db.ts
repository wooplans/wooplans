import { prisma } from "@/lib/prisma";

type PlanFilters = {
  featured?: boolean;
  published?: boolean;
  category?: string;
};

export async function listPlans(filters?: PlanFilters) {
  const where: Record<string, unknown> = {};

  if (filters?.featured !== undefined) where.featured = filters.featured;
  if (filters?.published !== undefined) where.published = filters.published;
  if (filters?.category) where.category = filters.category;

  const plans = await prisma.plan.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return plans.map((p) => ({
    ...p,
    rooms: JSON.parse(p.rooms),
    images: JSON.parse(p.images),
    distributionPlans: JSON.parse(p.distributionPlans),
  }));
}

export async function getPlanBySlug(slug: string) {
  const plan = await prisma.plan.findUnique({ where: { slug } });

  if (!plan) return null;

  return {
    ...plan,
    rooms: JSON.parse(plan.rooms),
    images: JSON.parse(plan.images),
    distributionPlans: JSON.parse(plan.distributionPlans),
  };
}

export async function getSimilarPlans(category: string, excludeSlug: string) {
  const plans = await prisma.plan.findMany({
    where: {
      published: true,
      category,
      slug: { not: excludeSlug },
    },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  return plans.map((p) => ({
    ...p,
    rooms: JSON.parse(p.rooms),
    images: JSON.parse(p.images),
    distributionPlans: JSON.parse(p.distributionPlans),
  }));
}
