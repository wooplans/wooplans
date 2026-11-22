import { NextResponse, type NextRequest } from "next/server";
import { prospectByToken, RESERVED_COOKIE } from "@/lib/catalogue-offer";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { recordVideoEvent, videoPage, type VideoEvent } from "@/lib/videos";

const EVENTS: VideoEvent[] = ["open", "play", "half", "end", "cta"];

/** Suivi des pages vidéo (envoyé par la page : les robots d'aperçu de lien ne comptent pas). */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { video?: string; event?: string };
  const event = EVENTS.find((e) => e === body.event);
  if (!event || !videoPage(body.video)) return NextResponse.json({ ok: false }, { status: 400 });
  if (!(await rateLimit(`video-suivi:${clientIp(request.headers)}`, 60, 60 * 60 * 1000))) return NextResponse.json({ ok: false }, { status: 429 });
  const prospect = await prospectByToken(request.cookies.get(RESERVED_COOKIE)?.value).catch(() => null);
  await recordVideoEvent(prospect?.id ?? null, body.video!, event);
  return NextResponse.json({ ok: true });
}
