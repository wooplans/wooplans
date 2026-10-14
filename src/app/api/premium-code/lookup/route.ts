import { NextResponse } from "next/server";
export const runtime = "edge";
export async function GET() {
  return NextResponse.json({ error: "Consultez les instructions de votre commande ou contactez le support." }, { status: 410, headers: { "Cache-Control": "no-store" } });
}
