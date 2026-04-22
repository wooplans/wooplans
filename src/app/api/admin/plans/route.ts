import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stringifyRooms, stringifyStringArray } from "@/lib/plan-serialization";

export const runtime = "edge";

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function validatePlanBody(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug = normalizeSlug(
    typeof body.slug === "string" && body.slug.trim() ? body.slug : name,
  );
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const category = body.category === "duplex" ? "duplex" : "villa";
  const surface = Number(body.surface);
  const bedrooms = Number(body.bedrooms);
  const bathrooms = Number(body.bathrooms);
  const floors = Number(body.floors);

  if (!name) return { error: "Le nom du plan est requis" };
  if (!slug) return { error: "Le slug du plan est invalide" };
  if (!description) return { error: "La description du plan est requise" };
  if (!Number.isFinite(surface) || surface <= 0) {
    return { error: "La surface doit etre superieure a 0" };
  }
  if (!Number.isFinite(bedrooms) || bedrooms < 0) {
    return { error: "Le nombre de chambres est invalide" };
  }
  if (!Number.isFinite(bathrooms) || bathrooms < 0) {
    return { error: "Le nombre de salles de bain est invalide" };
  }
  if (!Number.isFinite(floors) || floors < 1) {
    return { error: "Le nombre de niveaux doit etre au moins de 1" };
  }

  return {
    data: {
      slug,
      name,
      category,
      description,
      surface,
      bedrooms,
      bathrooms,
      floors,
      rooms: stringifyRooms(Array.isArray(body.rooms) ? (body.rooms as { name: string; area: number }[]) : []),
      images: stringifyStringArray(Array.isArray(body.images) ? (body.images as string[]) : []),
      thumbnail: typeof body.thumbnail === "string" ? body.thumbnail.trim() : "",
      estimatedCost: Math.max(0, Number(body.estimatedCost || 0) || 0),
      estimatedCostImage:
        typeof body.estimatedCostImage === "string" ? body.estimatedCostImage.trim() : "",
      distributionPlans: stringifyStringArray(
        Array.isArray(body.distributionPlans) ? (body.distributionPlans as string[]) : [],
      ),
      distributionPlanUrl:
        typeof body.distributionPlanUrl === "string" ? body.distributionPlanUrl.trim() : "",
      featured: Boolean(body.featured),
      published: Boolean(body.published),
    },
  };
}

export async function GET(request: Request) {
  const session = await requireRole(request, "admin");
  if (!session) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  try {
    const plans = await prisma.plan.findMany({
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error("Failed to list admin plans:", error);
    return NextResponse.json({ error: "Erreur lors du chargement des plans" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await requireRole(request, "admin");
  if (!session) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const validated = validatePlanBody(body);

    if ("error" in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const existing = await prisma.plan.findUnique({ where: { slug: validated.data.slug } });
    if (existing) {
      return NextResponse.json({ error: "Un plan avec ce slug existe deja" }, { status: 409 });
    }

    const plan = await prisma.plan.create({
      data: validated.data,
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error("Failed to create plan:", error);
    return NextResponse.json({ error: "Erreur lors de la creation du plan" }, { status: 500 });
  }
}
