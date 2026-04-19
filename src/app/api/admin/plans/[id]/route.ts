import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const plan = await prisma.plan.findUnique({ where: { id: params.id } });

  if (!plan) {
    return NextResponse.json({ error: "Plan introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    ...plan,
    rooms: JSON.parse(plan.rooms),
    images: JSON.parse(plan.images),
    distributionPlans: JSON.parse(plan.distributionPlans),
  });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();

  const existing = await prisma.plan.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Plan introuvable" }, { status: 404 });
  }

  if (body.slug && body.slug !== existing.slug) {
    const slugConflict = await prisma.plan.findUnique({
      where: { slug: body.slug },
    });
    if (slugConflict) {
      return NextResponse.json(
        { error: "Un plan avec ce slug existe déjà" },
        { status: 409 }
      );
    }
  }

  const plan = await prisma.plan.update({
    where: { id: params.id },
    data: {
      ...(body.slug !== undefined && { slug: body.slug }),
      ...(body.name !== undefined && { name: body.name }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.surface !== undefined && { surface: Number(body.surface) }),
      ...(body.bedrooms !== undefined && { bedrooms: Number(body.bedrooms) }),
      ...(body.bathrooms !== undefined && {
        bathrooms: Number(body.bathrooms),
      }),
      ...(body.floors !== undefined && { floors: Number(body.floors) }),
      ...(body.rooms !== undefined && { rooms: JSON.stringify(body.rooms) }),
      ...(body.images !== undefined && { images: JSON.stringify(body.images) }),
      ...(body.thumbnail !== undefined && { thumbnail: body.thumbnail }),
      ...(body.estimatedCost !== undefined && {
        estimatedCost: Number(body.estimatedCost),
      }),
      ...(body.estimatedCostImage !== undefined && {
        estimatedCostImage: body.estimatedCostImage,
      }),
      ...(body.distributionPlans !== undefined && {
        distributionPlans: JSON.stringify(body.distributionPlans),
      }),
      ...(body.distributionPlanUrl !== undefined && {
        distributionPlanUrl: body.distributionPlanUrl,
      }),
      ...(body.featured !== undefined && { featured: Boolean(body.featured) }),
      ...(body.published !== undefined && {
        published: Boolean(body.published),
      }),
    },
  });

  return NextResponse.json(plan);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const existing = await prisma.plan.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Plan introuvable" }, { status: 404 });
  }

  await prisma.plan.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
