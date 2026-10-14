import { NextResponse } from "next/server";
import { downloadR2Object } from "@/lib/r2";
import { getCurrentSession, hasPremiumAccess } from "@/lib/auth-server";
import { getPrisma } from "@/lib/prisma";
import { parseStringArray } from "@/lib/plan-serialization";
export const runtime = "edge";
export async function GET(
  _request: Request,
  { params }: { params: { key: string } },
) {
  try {
    const url = `/api/uploads/${encodeURIComponent(params.key)}`;
    const plans = await getPrisma().plan.findMany();
    const privateDocument = plans.some(
      (p) =>
        p.distributionPlanUrl === url ||
        p.estimatedCostImage === url ||
        parseStringArray(p.distributionPlans).includes(url),
    );
    const publicImage = plans.some(
      (p) =>
        p.published &&
        (p.thumbnail === url || parseStringArray(p.images).includes(url)),
    );
    const admin = (await getCurrentSession())?.user.role === "admin";
    if (
      !admin &&
      (privateDocument ? !(await hasPremiumAccess()) : !publicImage)
    )
      return NextResponse.json({ error: "Accès réservé" }, { status: 403 });
    const response = await downloadR2Object(params.key);
    return new NextResponse(response.body, {
      headers: {
        "Content-Type":
          response.headers.get("content-type") || "application/octet-stream",
        "Cache-Control": "private, no-store",
        Vary: "Cookie",
      },
    });
  } catch {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }
}
