import { and, eq, gte, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { randomId } from "@/lib/crypto";
import { PHONE_COUNTRIES } from "@/lib/phone";
import { WHATSAPP_BUSINESS_NUMBER } from "@/lib/lead-offers";
import { whatsappLink } from "@/lib/site";
import {
  chantierCode,
  chantierFirstMessage,
  chantierProfile,
  chantierSummary,
  chantierWhatsappText,
  adModelCode,
  findChantierCode,
  PROFILE_LABEL,
  answerLabel,
  type ChantierAnswers,
} from "@/lib/chantier-rules";

/**
 * « Démarre ton chantier » : enregistre les réponses du formulaire (avant WhatsApp), puis les rattache au numéro qui
 * écrit avec le code (webhook WhatsApp) et crée la fiche CRM à la bonne étape. Règles : src/lib/chantier-rules.ts.
 */
export async function createChantierRequest(answers: ChantierAnswers, name: string, utm: { source?: string | null; campaign?: string | null; content?: string | null }) {
  const id = randomId();
  const code = chantierCode(id);
  const { profile } = chantierProfile(answers);
  await getDb()
    .insert(schema.chantierRequests)
    .values({
      id,
      code,
      name,
      terrain: answers.terrain,
      start: answers.start,
      plans: answers.plans,
      houseType: answers.type,
      bedrooms: answers.chambres,
      budget: answers.budget,
      profile,
      utmSource: utm.source?.slice(0, 80) || null,
      utmCampaign: utm.campaign?.slice(0, 120) || null,
      utmContent: utm.content?.slice(0, 120) || null,
    });
  return { id, code, profile, waUrl: whatsappLink(chantierWhatsappText(code, name), WHATSAPP_BUSINESS_NUMBER) };
}

/** Pays d'après l'indicatif (le plus long qui correspond) ; +1 (États-Unis ou Canada) reste indécis. */
export function countryFromDigits(digits: string) {
  const d = digits.replace(/\D/g, "");
  const match = [...PHONE_COUNTRIES]
    .map(([code, , dial]) => ({ code, dial: dial.replace(/\D/g, "") }))
    .filter((c) => d.startsWith(c.dial))
    .sort((a, b) => b.dial.length - a.dial.length)[0];
  if (!match || match.dial === "1") return null;
  return match.code;
}

/**
 * Message reçu contenant un code « CH-123456 » : on retrouve les réponses (demande de moins de 60 jours, pas encore
 * rattachée), on note le numéro et le pays, puis on crée la fiche CRM avec le profil, l'offre conseillée et le premier
 * message à envoyer. Renvoie l'identifiant de la fiche créée, ou null.
 */
export async function linkChantierByCode(phoneDigits: string, text: string, now = new Date()) {
  const code = findChantierCode(text);
  const from = phoneDigits.replace(/\D/g, "");
  if (!code || from.length < 8) return null;
  const db = getDb();
  const req = await db.query.chantierRequests.findFirst({
    where: and(eq(schema.chantierRequests.code, code), isNull(schema.chantierRequests.linkedAt), gte(schema.chantierRequests.createdAt, new Date(now.getTime() - 60 * 86_400_000))),
  });
  if (!req) return null;
  const answers: ChantierAnswers = {
    terrain: req.terrain as ChantierAnswers["terrain"],
    start: req.start as ChantierAnswers["start"],
    plans: req.plans as ChantierAnswers["plans"],
    type: req.houseType as ChantierAnswers["type"],
    chambres: req.bedrooms as ChantierAnswers["chambres"],
    budget: req.budget as ChantierAnswers["budget"],
  };
  const { profile, offer, stage } = chantierProfile(answers);
  const country = countryFromDigits(from);
  const leadId = randomId();
  // Verrou : une seule fiche par demande, même si le message arrive deux fois.
  const claimed = await db
    .update(schema.chantierRequests)
    .set({ linkedAt: now, phone: `+${from}`, country, leadId })
    .where(and(eq(schema.chantierRequests.id, req.id), isNull(schema.chantierRequests.linkedAt)))
    .returning({ id: schema.chantierRequests.id });
  if (!claimed.length) return null;
  const summary = chantierSummary(answers);
  // Modèle de la pub cliquée (utm_content) : affiché sur la fiche pour l'échange WhatsApp.
  const adCode = adModelCode(req.utmContent);
  const adPlan = adCode ? await db.query.plans.findFirst({ where: eq(schema.plans.code, adCode), columns: { id: true, name: true } }) : undefined;
  const wish = answers.type === "indecis" ? null : `${answerLabel("type", answers.type)} · ${answerLabel("chambres", answers.chambres)}`;
  await db.insert(schema.leads).values({
    id: leadId,
    name: req.name,
    phone: `+${from}`,
    country,
    channel: "whatsapp",
    stage,
    planId: adPlan?.id ?? null,
    planLabel: adCode ? `Pub cliquée : ${adPlan?.name ?? adCode}${wish ? ` (souhait : ${wish})` : ""}` : wish,
    projectDetails: `Démarre ton chantier (${code}) · ${PROFILE_LABEL[profile]}.${adCode ? ` Modèle de la pub : ${adCode}.` : ""} ${summary}`,
    landDetails: answerLabel("terrain", answers.terrain),
    catalogueCredit: 0,
    nextFollowUpAt: now,
    utmSource: req.utmSource ?? "facebook",
    utmCampaign: req.utmCampaign ?? "demarrer_chantier",
  });
  await db.insert(schema.leadActivities).values([
    { id: randomId(), leadId, kind: "note", body: `${PROFILE_LABEL[profile]}. Offre conseillée : ${offer}`, author: "ia" },
    { id: randomId(), leadId, kind: "note", body: `Premier message conseillé : ${chantierFirstMessage(req.name, answers)}`, author: "ia" },
  ]);
  return leadId;
}
