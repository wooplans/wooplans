import { NextResponse } from "next/server";
import { MEMBER_COOKIE } from "@/lib/session";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/connexion", request.url), 303);
  response.cookies.delete(MEMBER_COOKIE);
  return response;
}
