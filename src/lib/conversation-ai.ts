import { and, asc, desc, eq, isNull, lt, or, gt, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getEnv } from "@/lib/env";
import { LEAD_CTA_IDS, LEAD_OFFERS } from "@/lib/lead-offers";
import { phoneMatch } from "@/lib/pipeline";
import { SYSTEM_PROMPT, parseQualification, userPrompt, type ConvMessage } from "@/lib/conversation-ai-rules";
import { inArray } from "drizzle-orm";

/**
 * Conversations WhatsApp et IA (étape 5, 23 nov. 2026) :
 *  1. le webhook Genuka enregistre chaque message reçu et chaque message que Tao envoie depuis WhatsApp Business ;
 *  2. les notes vocales reçues sont récupérées dans l'archive Genuka et transcrites par ElevenLabs (speech-to-text) ;
 *  3. DeepSeek lit la conversation et qualifie la personne (étape, score, résumé, prochaine action pour Tao).
 * Les étapes 2 et 3 passent dans la tâche des 15 minutes, quelques fiches à la fois.
 */
const GENUKA = "https://wa.genuka.com/api/v1";
const HOUR = 3_600_000;

type Incoming = {
  id?: string;
  from?: string;
  to?: string;
  type?: string;
  timestamp?: string;
  text?: { body?: string };
  button?: { text?: string };
  interactive?: { button_reply?: { title?: string } };
  [media: string]: unknown;
};

function messageBody(m: Incoming) {
  if (m.text?.body) return m.text.body;
  if (m.button?.text) return m.button.text;
  if (m.interactive?.button_reply?.title) return m.interactive.button_reply.title;
  const media = m.type ? (m[m.type] as { caption?: string; filename?: string; emoji?: string } | undefined) : undefined;
  return media?.caption || media?.filename || media?.emoji || null;
}

/** Enregistre un message du webhook (reçu : direction « in » ; copie d'un envoi de Tao : « out »). */
export async function recordWaMessage(m: Incoming, direction: "in" | "out") {
  if (!m.id) return;
  const phone = String(direction === "in" ? m.from : m.to || "").replace(/\D/g, "");
  if (!phone) return;
  const db = getDb();
  const prospect = await db.query.prospects.findFirst({ where: phoneMatch(phone), columns: { id: true } });
  const ts = Number(m.timestamp);
  const sentAt = Number.isFinite(ts) && ts > 0 ? new Date(ts * 1000) : new Date();
  const type = String(m.type || "text").slice(0, 20);
  await db
    .insert(schema.waMessages)
    .values({
      id: m.id.slice(0, 200),
      prospectId: prospect?.id ?? null,
      phone,
      direction,
      type,
      body: messageBody(m)?.slice(0, 4000) ?? null,
      // Genuka n'archive que les audios reçus : ceux que Tao envoie ne peuvent pas être transcrits.
      mediaStatus: direction === "in" && type === "audio" ? "pending" : null,
      sentAt,
    })
    .onConflictDoNothing();
  if (prospect && direction === "in") {
    await db.update(schema.prospects).set({ lastInboundAt: sentAt }).where(eq(schema.prospects.id, prospect.id));
  }
}

/* ─────────────── Notes vocales → texte (ElevenLabs) ─────────────── */

async function genukaAudio(messageId: string): Promise<Blob | null> {
  const key = getEnv().GENUKA_API_KEY;
  if (!key) return null;
  const headers = { Authorization: `Bearer ${key}` };
  const list = (await fetch(`${GENUKA}/media?kind=audio&limit=100`, { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null)) as {
    data?: { inboundMessageId?: string; url?: string; mimeType?: string }[];
  } | null;
  const file = list?.data?.find((f) => f.inboundMessageId === messageId);
  if (!file?.url) return null;
  const res = await fetch(file.url, { headers });
  return res.ok ? new Blob([await res.arrayBuffer()], { type: file.mimeType || "audio/ogg" }) : null;
}

async function transcribe(audio: Blob): Promise<string | null> {
  const key = getEnv().ELEVENLABS_API_KEY;
  if (!key) return null;
  const form = new FormData();
  form.append("model_id", "scribe_v1");
  form.append("language_code", "fra");
  form.append("file", audio, "note.ogg");
  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", headers: { "xi-api-key": key }, body: form });
  if (!res.ok) {
    console.error("ElevenLabs speech-to-text : échec", res.status, (await res.text()).slice(0, 200));
    return null;
  }
  const data = (await res.json()) as { text?: string };
  return data.text?.trim() || null;
}

/** Transcrit les notes vocales en attente (les plus anciennes d'abord). Abandon après 24 h sans fichier. */
export async function transcribePending(limit = 5) {
  const db = getDb();
  const pending = await db.query.waMessages.findMany({
    where: eq(schema.waMessages.mediaStatus, "pending"),
    orderBy: asc(schema.waMessages.sentAt),
    limit,
  });
  let done = 0;
  for (const m of pending) {
    const audio = await genukaAudio(m.id).catch(() => null);
    const text = audio ? await transcribe(audio).catch(() => null) : null;
    if (text) {
      await db.update(schema.waMessages).set({ transcript: text.slice(0, 4000), mediaStatus: "done" }).where(eq(schema.waMessages.id, m.id));
      done++;
    } else if (Date.now() - m.sentAt.getTime() > 24 * HOUR) {
      await db.update(schema.waMessages).set({ mediaStatus: "failed" }).where(eq(schema.waMessages.id, m.id));
    }
  }
  return { pending: pending.length, done };
}

/* ─────────────── Qualification (DeepSeek) ─────────────── */

async function askDeepseek(user: string) {
  return parseQualification(await deepseekJson(SYSTEM_PROMPT, user));
}

/** Appel à DeepSeek en mode JSON : contenu brut de la réponse, ou null (pas de clé, erreur). */
export async function deepseekJson(system: string, user: string): Promise<string | null> {
  const key = getEnv().DEEPSEEK_API_KEY;
  if (!key) return null;
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "deepseek-chat",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    console.error("DeepSeek : échec", res.status, (await res.text()).slice(0, 200));
    return null;
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? null;
}

/**
 * Fiches à (re)qualifier : un message reçu après la dernière analyse, et rien de nouveau depuis 10 minutes
 * (on laisse la personne finir d'écrire). Les notes vocales encore en attente de transcription patientent.
 */
export async function qualifyPending(limit = 5, now = new Date()) {
  const db = getDb();
  const settled = new Date(now.getTime() - 10 * 60_000);
  const rows = await db.query.prospects.findMany({
    where: and(lt(schema.prospects.lastInboundAt, settled), or(isNull(schema.prospects.aiUpdatedAt), gt(schema.prospects.lastInboundAt, schema.prospects.aiUpdatedAt))),
    orderBy: desc(schema.prospects.lastInboundAt),
    limit,
    columns: { id: true, email: true, name: true, country: true, pipelineStage: true },
  });
  let qualified = 0;
  for (const p of rows) {
    if (await qualifyOne(p, now)) qualified++;
  }
  return { candidates: rows.length, qualified };
}

type ProspectForAi = { id: string; email: string; name: string | null; country: string | null; pipelineStage: string | null };

/**
 * Qualifie une fiche : conversation WhatsApp + contexte d'achat + comportement (src/lib/lead-ai.ts). Renvoie true si
 * l'IA a répondu. Les notes vocales en attente de transcription font patienter (false, rien d'écrit).
 */
export async function qualifyOne(p: ProspectForAi, now = new Date(), behavior?: string): Promise<boolean> {
  const db = getDb();
  const messages = await db.query.waMessages.findMany({
    where: eq(schema.waMessages.prospectId, p.id),
    orderBy: asc(schema.waMessages.sentAt),
    columns: { direction: true, type: true, body: true, transcript: true, sentAt: true, mediaStatus: true },
  });
  if (messages.some((m) => m.mediaStatus === "pending" && m.direction === "in")) return false;
  const lead = await db.query.checkoutIntents.findFirst({
    where: and(eq(schema.checkoutIntents.email, p.email), inArray(schema.checkoutIntents.ctaId, LEAD_CTA_IDS), eq(schema.checkoutIntents.status, "paid")),
    orderBy: desc(schema.checkoutIntents.createdAt),
    columns: { ctaId: true, createdAt: true },
  });
  const product = lead?.ctaId === LEAD_OFFERS.extrait.ctaId ? "l'Extrait du Catalogue Premium" : lead ? "le Guide des maisons" : "rien encore";
  const context = `${p.name || "Client"}${p.country ? `, ${p.country}` : ""}. A acheté ${product}${lead ? ` le ${lead.createdAt.toISOString().slice(0, 10)}` : ""}. Étape actuelle dans le suivi : ${p.pipelineStage || "inconnue"}. Date du jour : ${now.toISOString().slice(0, 10)}.${behavior ? ` Comportement : ${behavior}.` : ""}`;
  const q = await askDeepseek(userPrompt(context, messages as ConvMessage[])).catch((error) => {
    console.error("Qualification IA impossible", error);
    return null;
  });
  // Réponse inutilisable : on note quand même la date, pour ne pas reposer la question à chaque passage.
  await db
    .update(schema.prospects)
    .set(q ? { aiStage: q.stage, aiScore: q.score, aiSummary: q.summary, aiNextAction: q.nextAction, aiUpdatedAt: now } : { aiUpdatedAt: now })
    .where(eq(schema.prospects.id, p.id));
  return Boolean(q);
}

/** Rattache les messages arrivés avant que la fiche ait ce numéro (correction du numéro, code de commande). */
export async function linkOrphanMessages(prospectId: string, phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return;
  await getDb()
    .update(schema.waMessages)
    .set({ prospectId })
    .where(and(isNull(schema.waMessages.prospectId), sql`substr(${schema.waMessages.phone}, -8) = ${digits.slice(-8)}`));
}
