import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

export const runtime = "edge";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  return NextResponse.json({ session });
}

