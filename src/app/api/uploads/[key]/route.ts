import { NextResponse } from "next/server";
import { downloadR2Object } from "@/lib/r2";

export const runtime = "edge";

export async function GET(
  _request: Request,
  { params }: { params: { key: string } },
) {
  try {
    const { key } = params;
    const response = await downloadR2Object(key);
    const contentType = response.headers.get("content-type") || "application/octet-stream";

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("R2 download error:", error);
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }
}
