import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export const runtime = "edge";
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const prisma = getPrisma();
    const subscriber = await prisma.subscriber.findUnique({
      where: { email },
      select: { premiumCode: true, isActive: true },
    });

    if (!subscriber || !subscriber.premiumCode || !subscriber.isActive) {
      return NextResponse.json({ premiumCode: null });
    }

    return NextResponse.json({ premiumCode: subscriber.premiumCode });
  } catch (error) {
    console.error("Premium code lookup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
