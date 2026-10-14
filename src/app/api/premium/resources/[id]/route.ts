import { serverEnv } from "@/lib/server-env";
import { NextResponse } from "next/server";
import { hasPremiumAccess } from "@/lib/auth-server";
import { downloadR2Object } from "@/lib/r2";
export const runtime = "edge";
export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  if (!(await hasPremiumAccess()))
    return NextResponse.json({ error: "Accès réservé" }, { status: 401 });
  const resources: Record<string, string | undefined> = {
    catalogue: serverEnv("CATALOGUE_PDF_KEY"),
    guide: serverEnv("PREMIUM_GUIDE_KEY"),
    "video-choix": serverEnv("PREMIUM_VIDEO_CHOIX_KEY"),
    "video-plans": serverEnv("PREMIUM_VIDEO_PLANS_KEY"),
    "video-devis": serverEnv("PREMIUM_VIDEO_DEVIS_KEY"),
  };
  const key = Object.hasOwn(resources, params.id)
    ? resources[params.id]
    : undefined;
  if (!key)
    return NextResponse.json(
      { error: "Ressource indisponible" },
      { status: 404 },
    );
  try {
    const file = await downloadR2Object(key);
    return new NextResponse(file.body, {
      headers: {
        "Content-Type":
          file.headers.get("Content-Type") || "application/octet-stream",
        "Cache-Control": "private, no-store",
        Vary: "Cookie",
        ...(params.id === "catalogue"
          ? {
              "Content-Disposition":
                'attachment; filename="Catalogue_Premium_Wooplans.pdf"',
            }
          : {}),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Ressource indisponible" },
      { status: 404 },
    );
  }
}
