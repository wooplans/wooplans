import { hasPremiumAccess } from "@/lib/auth-server";
import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

export const runtime = "edge";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (session?.user.role === "subscriber" && !(await hasPremiumAccess())) return NextResponse.json({ session: null }, { headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ session }, { headers: { "Cache-Control": "no-store" } });
}

