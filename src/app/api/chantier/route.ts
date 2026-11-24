import { NextResponse, type NextRequest } from "next/server";
import { createChantierRequest } from "@/lib/chantier";
import { parseChantier } from "@/lib/chantier-rules";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/** Formulaire « Démarre ton chantier » : enregistre les réponses et renvoie le lien WhatsApp avec le code. */
export async function POST(request: NextRequest) {
  if (!(await rateLimit(`chantier:${clientIp(request.headers)}`, 15, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Trop de tentatives. Réessayez dans un moment." }, { status: 429 });
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = parseChantier(body);
  if (!parsed) return NextResponse.json({ error: "Merci de répondre à toutes les questions et d'indiquer votre nom." }, { status: 400 });
  const utm = (body.utm ?? {}) as Record<string, string | undefined>;
  const r = await createChantierRequest(parsed.answers, parsed.name, { source: utm.source, campaign: utm.campaign, content: utm.content });
  return NextResponse.json({ code: r.code, profile: r.profile, waUrl: r.waUrl, eventId: r.id });
}
