import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  parseRooms,
  parseStringArray,
  stringifyRooms,
  stringifyStringArray,
} from "@/lib/plan-serialization";

export const runtime = "edge";

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await requireRole(request, "admin");
  if (!session) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  try {
    const plan = await prisma.plan.findUnique({ where: { id: params.id } });

    if (!plan) {
      return NextResponse.json({ error: "Plan introuvable" }, { status: 404 });
    }

    return NextResponse.json({
      ...plan,
      rooms: parseRooms(plan.rooms),
      images: parseStringArray(plan.images),
      distributionPlans: parseStringArray(plan.distributionPlans),
    });
  } catch (error) {
    console.error("Failed to load plan:", error);
    return NextResponse.json({ error: "Erreur lors du chargement du plan" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await requireRole(request, "admin");
  if (!session) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const existing = await prisma.plan.findUnique({ where: { id: params.id } });

    if (!existing) {
      return NextResponse.json({ error: "Plan introuvable" }, { status: 404 });
    }

    const nextSlug =
      body.slug !== undefined && typeof body.slug === "string"
        ? normalizeSlug(body.slug)
        : undefined;

    if (nextSlug && nextSlug !== existing.slug) {
      const slugConflict = await prisma.plan.findUnique({ where: { slug: nextSlug } });
      if (slugConflict) {
        return NextResponse.json({ error: "Un plan avec ce slug existe deja" }, { status: 409 });
      }
    }

    const plan = await prisma.plan.update({
      where: { id: params.id },
      data: {
        ...(nextSlug !== undefined && { slug: nextSlug }),
        ...(typeof body.name === "string" && { name: body.name.trim() }),
        ...(body.category !== undefined && { category: body.category === "duplex" ? "duplex" : "villa" }),
        ...(typeof body.description === "string" && { description: body.description.trim() }),
        ...(body.surface !== undefined && { surface: Number(body.surface) }),
        ...(body.bedrooms !== undefined && { bedrooms: Number(body.bedrooms) }),
        ...(body.bathrooms !== undefined && { bathrooms: Number(body.bathrooms) }),
        ...(body.floors !== undefined && { floors: Number(body.floors) }),
        ...(body.rooms !== undefined && {
          rooms: stringifyRooms(Array.isArray(body.rooms) ? (body.rooms as { name: string; area: number }[]) : []),
        }),
        ...(body.images !== undefined && {
          images: stringifyStringArray(Array.isArray(body.images) ? (body.images as string[]) : []),
        }),
        ...(typeof body.thumbnail === "string" && { thumbnail: body.thumbnail.trim() }),
        ...(body.estimatedCost !== undefined && { estimatedCost: Math.max(0, Number(body.estimatedCost) || 0) }),
        ...(typeof body.estimatedCostImage === "string" && {
          estimatedCostImage: body.estimatedCostImage.trim(),
        }),
        ...(body.distributionPlans !== undefined && {
          distributionPlans: stringifyStringArray(
            Array.isArray(body.distributionPlans) ? (body.distributionPlans as string[]) : [],
          ),
        }),
        ...(typeof body.distributionPlanUrl === "string" && {
          distributionPlanUrl: body.distributionPlanUrl.trim(),
        }),
        ...(body.featured !== undefined && { featured: Boolean(body.featured) }),
        ...(body.published !== undefined && { published: Boolean(body.published) }),
      },
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Failed to update plan:", error);
    return NextResponse.json({ error: "Erreur lors de la mise a jour du plan" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await requireRole(request, "admin");
  if (!session) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  try {
    const existing = await prisma.plan.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Plan introuvable" }, { status: 404 });
    }

    await prisma.plan.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete plan:", error);
    return NextResponse.json({ error: "Erreur lors de la suppression du plan" }, { status: 500 });
  }
}
