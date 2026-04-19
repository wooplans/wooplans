import { prisma } from "@/lib/prisma";

type RawPlan = {
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

export type Plan = Omit<RawPlan, "rooms" | "images" | "distributionPlans"> & {
  rooms: { name: string; area: number }[];
  images: string[];
  distributionPlans: string[];
};

type PlanFilters = {
  featured?: boolean;
  published?: boolean;
  category?: string;
};

function parsePlan(p: RawPlan): Plan {
  return {
    ...p,
    rooms: JSON.parse(p.rooms),
    images: JSON.parse(p.images),
    distributionPlans: JSON.parse(p.distributionPlans),
  };
}

export async function listPlans(filters?: PlanFilters) {
  try {
    const where: Record<string, unknown> = {};

    if (filters?.featured !== undefined) where.featured = filters.featured;
    if (filters?.published !== undefined) where.published = filters.published;
    if (filters?.category) where.category = filters.category;

    const plans: RawPlan[] = await prisma.plan.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return plans.map(parsePlan);
  } catch (error) {
    console.error("Failed to list plans:", error);
    return [];
  }
}

export async function getPlanBySlug(slug: string) {
  try {
    const plan: RawPlan | null = await prisma.plan.findUnique({ where: { slug } });

    if (!plan) return null;

    return parsePlan(plan);
  } catch (error) {
    console.error("Failed to load plan:", error);
    return null;
  }
}

export async function getSimilarPlans(category: string, excludeSlug: string) {
  try {
    const plans: RawPlan[] = await prisma.plan.findMany({
      where: {
        published: true,
        category,
        slug: { not: excludeSlug },
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    });

    return plans.map(parsePlan);
  } catch (error) {
    console.error("Failed to load similar plans:", error);
    return [];
  }
}
