import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { randomId } from "@/lib/crypto";
import { deepseekJson } from "@/lib/conversation-ai";
import type { ConvMessage } from "@/lib/conversation-ai-rules";
import { CHANTIER_AI_PROMPT, LAND_PROOFS, STEP_LABEL, applyProtocol, chantierAiUserPrompt, leadStageFor, parseChantierAi, type ChantierStep } from "@/lib/chantier-ai-rules";
import { PROFILE_LABEL, adModelCode, chantierMessages, chantierSummary, type ChantierAnswers, type ChantierProfile } from "@/lib/chantier-rules";

/**
 * L'IA suit les dossiers « Démarre ton chantier » (règles : src/lib/chantier-ai-rules.ts). Tâche des 15 minutes :
 * les fiches dont la conversation a bougé depuis la dernière analyse, 10 minutes après le dernier message du prospect
 * (on le laisse finir d'écrire), 25 au plus par passage, 5 à la fois. Elle met à jour l'étape CRM, la date de relance, et note
 * dans l'historique chaque changement d'étape.
 */
export async function followChantierLeads(limit = 25, now = new Date()) {
  const db = getDb();
  const cr = schema.chantierRequests;
  const wa = schema.waMessages;
  const settled = now.getTime() - 10 * 60_000;
  const last = sql<number>`max(${wa.sentAt})`;
  const lastIn = sql<number | null>`max(case when ${wa.direction} = 'in' then ${wa.sentAt} end)`;
  const rows = await db
    .select({ id: cr.id, last, lastIn })
    .from(cr)
    .innerJoin(wa, sql`'+' || ${wa.phone} = ${cr.phone}`)
    .where(isNotNull(cr.leadId))
    .groupBy(cr.id)
    .having(and(sql`${last} > coalesce(${cr.aiUpdatedAt}, 0)`, sql`coalesce(${lastIn}, 0) <= ${settled}`))
    .orderBy(desc(last))
    .limit(limit);
  // 5 dossiers à la fois : l'attente de DeepSeek ne compte pas dans le temps de calcul du Worker.
  let done = 0;
  for (let i = 0; i < rows.length; i += 5) {
    const batch = await Promise.all(
      rows.slice(i, i + 5).map((r) => followOne(r.id, now).catch((error) => (console.error("Suivi IA du dossier impossible", r.id, error), false))),
    );
    done += batch.filter(Boolean).length;
  }
  return { candidates: rows.length, done };
}

export async function followOne(requestId: string, now = new Date()): Promise<boolean> {
  const db = getDb();
  const req = await db.query.chantierRequests.findFirst({ where: eq(schema.chantierRequests.id, requestId) });
  if (!req?.leadId || !req.phone) return false;
  const lead = await db.query.leads.findFirst({ where: eq(schema.leads.id, req.leadId) });
  if (!lead) return false;
  const messages = await db.query.waMessages.findMany({
    where: eq(schema.waMessages.phone, req.phone.replace(/\D/g, "")),
    orderBy: asc(schema.waMessages.sentAt),
    columns: { direction: true, type: true, body: true, transcript: true, sentAt: true, mediaStatus: true },
  });
  // Notes vocales du prospect pas encore transcrites : on attend (celles de Tao ne bloquent pas).
  if (messages.some((m) => m.mediaStatus === "pending" && m.direction === "in")) return false;

  const answers: ChantierAnswers = {
    type: req.houseType as ChantierAnswers["type"],
    chambres: req.bedrooms as ChantierAnswers["chambres"],
    terrain: req.terrain as ChantierAnswers["terrain"],
    relief: (req.relief ?? "na") as ChantierAnswers["relief"],
    plans: req.plans as ChantierAnswers["plans"],
    start: req.start as ChantierAnswers["start"],
    budget: req.budget as ChantierAnswers["budget"],
  };
  const model = adModelCode(req.utmContent);
  const dossier = `${req.code} · ${PROFILE_LABEL[req.profile as ChantierProfile] ?? req.profile} · ${req.name}${req.city ? ` · ${req.city}` : ""}. ${chantierSummary(answers)}${model ? ` Pub cliquée : modèle ${model}.` : ""} Étape CRM actuelle : ${lead.stage}.`;
  const catalog = chantierMessages({ name: req.name, type: req.houseType }).map((m) => ({ id: m.id, title: m.title }));
  const raw = await deepseekJson(CHANTIER_AI_PROMPT, chantierAiUserPrompt(dossier, messages as ConvMessage[], catalog, now));
  const parsed = parseChantierAi(raw, catalog.map((c) => c.id), now);
  const lastClient = [...messages].reverse().find((m) => m.direction === "in");
  const lastIsClient = messages.length > 0 && messages[messages.length - 1].direction === "in";
  const ai = parsed ? applyProtocol(parsed, req.profile, now, lastIsClient ? (lastClient?.transcript ?? lastClient?.body) : null) : null;
  if (!ai) {
    // Réponse inutilisable : on note la date pour ne pas reposer la question à chaque passage.
    await db.update(schema.chantierRequests).set({ aiUpdatedAt: now }).where(eq(schema.chantierRequests.id, req.id));
    return false;
  }
  // La preuve du terrain ne recule jamais (un dossier reçu reste reçu).
  const land = LAND_PROOFS.indexOf(ai.land) >= LAND_PROOFS.indexOf((req.aiLand as (typeof LAND_PROOFS)[number]) ?? "aucun") ? ai.land : req.aiLand;
  await db
    .update(schema.chantierRequests)
    .set({
      aiStep: ai.step,
      aiLand: land,
      aiLandDetails: ai.landDetails || req.aiLandDetails,
      aiRelief: ai.relief !== "inconnu" ? ai.relief : req.aiRelief ?? (answers.relief === "plat" || answers.relief === "pente" ? answers.relief : "inconnu"),
      aiSummary: ai.summary,
      aiNextAction: ai.nextAction,
      aiMessageId: ai.messageId,
      aiFollowUp: ai.followUp,
      aiLostReason: ai.lostReason || null,
      aiAwaiting: ai.awaitingReply ? 1 : 0,
      aiUpdatedAt: now,
    })
    .where(eq(schema.chantierRequests.id, req.id));

  // Tièdes et froids en attente : l'étape CRM ne bouge pas (ils restent en « Demande »).
  const stage = (ai.nurture ? lead.stage : leadStageFor(ai.step, lead.stage)) as typeof lead.stage;
  await db
    .update(schema.leads)
    .set({
      stage,
      nextFollowUpAt: ai.followUp ? new Date(`${ai.followUp}T08:00:00Z`) : stage === "perdu" ? null : lead.nextFollowUpAt,
      lostReason: stage === "perdu" ? ai.lostReason || lead.lostReason : lead.lostReason,
      updatedAt: now,
    })
    .where(eq(schema.leads.id, lead.id));

  if (ai.step !== req.aiStep) {
    const terrain = land !== "aucun" ? ` Terrain : ${land}${ai.landDetails ? ` (${ai.landDetails})` : ""}.` : "";
    await db.insert(schema.leadActivities).values({
      id: randomId(),
      leadId: lead.id,
      kind: "stage",
      body: `IA : ${STEP_LABEL[ai.step as ChantierStep]}.${terrain}${ai.lostReason ? ` Motif : ${ai.lostReason}.` : ""} ${ai.nextAction}`.trim(),
      author: "ia",
    });
  }
  return true;
}

/** Libellés pour la fiche CRM. */
export function landLabel(land: string | null, details: string | null) {
  const base = land === "dossier" ? "Dossier technique reçu" : land === "dimensions" ? "Dimensions connues" : "Pas encore de dossier ni de dimensions";
  return details ? `${base} · ${details}` : base;
}

