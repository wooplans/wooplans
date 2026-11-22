import { extraitBuyer, recordExtraitEvent } from "@/lib/extrait-web";
import type { ExtraitEventType } from "@/lib/extrait-web-rules";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const TYPES: ExtraitEventType[] = ["open", "view", "locked", "offer"];

/** Suivi de l'extrait en ligne (envoyé par la page, pas au rendu : les robots d'aperçu de lien ne comptent pas). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { type?: string; slug?: string };
  const type = TYPES.find((t) => t === body.type);
  if (!type) return Response.json({ ok: false }, { status: 400 });
  if (!(await rateLimit(`extrait-suivi:${clientIp(request.headers)}`, 120, 60 * 60 * 1000))) return Response.json({ ok: false }, { status: 429 });
  const buyer = await extraitBuyer(id);
  if (!buyer) return Response.json({ ok: false }, { status: 404 });
  await recordExtraitEvent(buyer, type, typeof body.slug === "string" ? body.slug : null);
  return Response.json({ ok: true });
}
