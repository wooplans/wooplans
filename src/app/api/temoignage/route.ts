import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { randomId } from "@/lib/crypto";
import { adminTestimonialEmail, sendEmail } from "@/lib/email";
import { getEnv, requireSecret, runInBackground } from "@/lib/env";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { declaredSize, prepareIncomingFile } from "@/lib/remote-file";
import { getSetting } from "@/lib/settings";
import {
  TESTIMONIAL_MAX_BYTES,
  cleanText,
  firstName,
  sniffMediaType,
  verifyTestimonialToken,
  type TestimonialKind,
} from "@/lib/testimonial-request";

/**
 * Page /temoignage : GET = accueil personnalisé (lien personnel « #jeton » ou lien général),
 * PUT = corps brut = l'enregistrement (?kind=video|audio&name=…&location=…&quote=…&consent=1&first_only=1&duration=…),
 * transmis en flux vers R2 (bucket VIDEOS). Jeton dans l'en-tête Authorization, jamais dans l'URL.
 */
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });

/** Membre du lien personnel ; undefined = lien général ; null = jeton invalide. */
async function memberFromRequest(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return undefined;
  const memberId = await verifyTestimonialToken(requireSecret("AUTH_SECRET"), token);
  if (!memberId) return null;
  return (await getDb().query.members.findFirst({ where: eq(schema.members.id, memberId) })) ?? null;
}

const invalidLink = () => json({ error: "Ce lien n'est pas valide. Demandez-en un nouveau à WOOPLANS sur WhatsApp." }, 401);

export async function GET(request: Request) {
  const member = await memberFromRequest(request);
  if (member === null) return invalidLink();
  const reward = await getSetting<string>("testimonial_reward", "");
  if (!member) return json({ personal: false, name: "", first_name: "", already_sent: false, reward });
  const previous = await getDb().query.testimonialSubmissions.findFirst({ where: eq(schema.testimonialSubmissions.memberId, member.id) });
  return json({ personal: true, name: member.name, first_name: firstName(member.name), already_sent: Boolean(previous), reward });
}

export async function PUT(request: Request) {
  const cancel = () => request.body?.cancel().catch(() => {});
  const member = await memberFromRequest(request);
  if (member === null) {
    await cancel();
    return invalidLink();
  }
  // Lien général : ouvert à tous, donc limité par adresse IP ; lien personnel : limité par membre.
  const limitKey = member ? `testimonial:m:${member.id}` : `testimonial:ip:${clientIp(request.headers)}`;
  if (!(await rateLimit(limitKey, member ? 6 : 4, 3_600_000))) {
    await cancel();
    return json({ error: "Trop d'envois pour le moment. Réessayez dans une heure." }, 429);
  }

  const params = new URL(request.url).searchParams;
  const kind = params.get("kind") as TestimonialKind;
  const name = cleanText(params.get("name"), 80) || cleanText(member?.name, 80);
  if (kind !== "video" && kind !== "audio") {
    await cancel();
    return json({ error: "Paramètre kind : video ou audio" }, 400);
  }
  if (!name) {
    await cancel();
    return json({ error: "Indiquez votre nom." }, 400);
  }
  if (params.get("consent") !== "1") {
    await cancel();
    return json({ error: "Cochez l'autorisation de diffusion pour envoyer votre témoignage." }, 400);
  }
  if (!request.body) return json({ error: "Enregistrement manquant" }, 400);

  const id = randomId(12);
  try {
    const file = await prepareIncomingFile(request.body, declaredSize(request.headers), TESTIMONIAL_MAX_BYTES, (head) => sniffMediaType(head, kind));
    if (!file.type) return json({ error: "Format non reconnu : envoyez une vidéo ou un enregistrement audio." }, 400);
    const month = new Date().toISOString().slice(0, 7);
    const key = `temoignages/recus/${month}/${id}.${file.type.ext}`;
    await getEnv().VIDEOS.put(key, file.body, { httpMetadata: { contentType: file.type.contentType } });

    const duration = Math.round(Number(params.get("duration")));
    const row = {
      id,
      memberId: member?.id ?? null,
      name,
      location: cleanText(params.get("location"), 80),
      kind,
      mediaKey: key,
      contentType: file.type.contentType,
      size: file.size,
      durationSec: Number.isFinite(duration) && duration > 0 ? Math.min(duration, 3600) : null,
      quote: cleanText(params.get("quote"), 500),
      consent: true,
      firstNameOnly: params.get("first_only") === "1",
    };
    await getDb().insert(schema.testimonialSubmissions).values(row);

    const notify = getEnv().ADMIN_NOTIFY_EMAIL;
    if (notify) {
      const mail = adminTestimonialEmail({ name, location: row.location, kind, quote: row.quote, email: member?.email });
      runInBackground(sendEmail({ to: notify, ...mail, template: "admin_testimonial", memberId: member?.id }));
    }
    return json({ ok: true, id });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Échec de l'envoi" }, 400);
  }
}

