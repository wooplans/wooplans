import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "edge";
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const plans = await prisma.plan.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(plans);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();

  const slug = body.slug || body.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const existing = await prisma.plan.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(
      { error: "Un plan avec ce slug existe déjà" },
      { status: 409 }
    );
  }

  const plan = await prisma.plan.create({
    data: {
      slug,
      name: body.name,
      category: body.category,
      description: body.description,
      surface: Number(body.surface),
      bedrooms: Number(body.bedrooms),
      bathrooms: Number(body.bathrooms),
      floors: Number(body.floors),
      rooms: JSON.stringify(body.rooms || []),
      images: JSON.stringify(body.images || []),
      thumbnail: body.thumbnail || "",
      estimatedCost: Number(body.estimatedCost || 0),
      estimatedCostImage: body.estimatedCostImage || "",
      distributionPlans: JSON.stringify(body.distributionPlans || []),
      distributionPlanUrl: body.distributionPlanUrl || "",
      featured: Boolean(body.featured),
      published: Boolean(body.published),
    },
  });

  return NextResponse.json(plan, { status: 201 });
}
