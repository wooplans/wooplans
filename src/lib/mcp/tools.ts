import { and, asc, desc, eq, gte, inArray, like, lte, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { cataloguePrice } from "@/lib/site";
import { LEAD_STAGES, type LeadStage } from "@/db/schema";
import { getFunnelKpis, getSourceBreakdown, type Period } from "@/lib/analytics";
import { randomId } from "@/lib/crypto";
import { accessCodeEmail, leadFollowUpEmail, sendEmail } from "@/lib/email";
import { getEnv, requireSecret, siteUrl } from "@/lib/env";
import { deleteMedia, planMediaFolder } from "@/lib/media-store";
import { attachFileToPlan } from "@/lib/plan-media";
import { derivedPlanFields, isStanding } from "@/lib/plan-pricing";
import { getCostSettings, getSetting } from "@/lib/settings";
import { grantAccess, normalizeEmail, revokeAccess, rotateAccessCode } from "@/lib/members";
import {
  PLAN_CATEGORIES,
  PLAN_IMAGE_MAX_BYTES,
  UPLOAD_LINK_MAX_BYTES,
  decodeBase64File,
  parseCreatePlanInput,
  reorderList,
  signFileToken,
  signUploadToken,
  sniffFileType,
  type ImageRole,
  parsePremiumUpdate,
} from "@/lib/plan-input";
import { privateFileUrl } from "@/lib/premium";
import { downloadFile, type IncomingFile } from "@/lib/remote-file";

type JsonSchema = Record<string, unknown>;
export type McpTool = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean; idempotentHint?: boolean };
  handler: (args: Record<string, unknown>) => Promise<unknown>;
};

/** Résultat d'outil accompagné de contenus MCP (image, document) en plus du JSON. */
export class ToolContent {
  constructor(
    readonly structured: Record<string, unknown>,
    readonly content: Record<string, unknown>[],
  ) {}
}

const obj = (properties: Record<string, JsonSchema>, required: string[] = []): JsonSchema => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});
const str = (description: string, extra: JsonSchema = {}) => ({ type: "string", description, ...extra });
const num = (description: string) => ({ type: "number", description });

const asString = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const asNumber = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(Number(v)) ? Number(v) : undefined);
const asDate = (v: unknown) => {
  const s = asString(v);
  if (!s) return undefined;
  const d = new Date(s.length === 10 ? `${s}T09:00:00` : s);
  if (Number.isNaN(d.getTime())) throw new Error(`Date invalide : ${s}`);
  return d;
};
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

async function logLead(leadId: string, kind: "note" | "stage" | "email" | "payment" | "call", body: string) {
  await getDb().insert(schema.leadActivities).values({ id: randomId(), leadId, kind, body, author: "agent-mcp" });
}

async function findLead(id: unknown) {
  const leadId = asString(id);
  if (!leadId) throw new Error("lead_id requis");
  const lead = await getDb().query.leads.findFirst({ where: eq(schema.leads.id, leadId) });
  if (!lead) throw new Error(`Demande introuvable : ${leadId}`);
  return lead;
}

async function findMember(email: unknown) {
  const e = asString(email);
  if (!e) throw new Error("email requis");
  const member = await getDb().query.members.findFirst({ where: eq(schema.members.email, normalizeEmail(e)) });
  if (!member) throw new Error(`Aucun membre avec l'email ${e}`);
  return member;
}

async function findPlan(code: unknown) {
  const ref = asString(code);
  if (!ref) throw new Error("code requis (référence du modèle, ex. V4-001)");
  const plan = await getDb().query.plans.findFirst({ where: or(eq(schema.plans.code, ref.toUpperCase()), eq(schema.plans.slug, ref.toLowerCase())) });
  if (!plan) throw new Error(`Modèle introuvable : ${ref}`);
  return plan;
}

const asRole = (v: unknown): ImageRole => {
  if (v === "render" || v === "floor_plan") return v;
  throw new Error("role : « render » (rendu 3D public) ou « floor_plan » (distribution privée, Premium)");
};

/** Retrouve une image dans la liste du rôle : valeur exacte, clé R2 seule, ou position (1 = première). */
function matchImage(list: string[], image: unknown) {
  const value = typeof image === "number" ? String(image) : asString(image);
  if (value && /^\d{1,3}$/.test(value) && Number(value) >= 1 && Number(value) <= list.length) return list[Number(value) - 1];
  const found = value ? list.find((item) => item === value || item === `/media/${value}` || item.replace(/^\/media\//, "") === value) : undefined;
  if (!found) throw new Error(`Image introuvable dans cette liste : ${JSON.stringify(list)}`);
  return found;
}

const mediaKeyOf = (ref: string) => ref.replace(/^\/media\//, "");

type CatalogueFile = { key: string; label: string; updatedAt?: string };

/** Taille maximale d'un fichier renvoyé dans la réponse (au-delà : lien temporaire seulement). */
const INLINE_IMAGE_MAX_BYTES = 3_750_000;
const INLINE_PDF_MAX_BYTES = 10_000_000;

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

const D1_MAX_PARAMS = 90;

/** Fichiers Premium : distributions des modèles et catalogue PDF complet (réglages). */
async function premiumFileIndex() {
  const db = getDb();
  const [plans, catalogue] = await Promise.all([
    db.query.plans.findMany({ columns: { code: true, name: true, status: true, floorPlans: true }, orderBy: [asc(schema.plans.category), asc(schema.plans.code)] }),
    getSetting<CatalogueFile[]>("catalogue_files", []),
  ]);
  const keys = [...plans.flatMap((p) => p.floorPlans), ...catalogue.map((f) => f.key)].filter((k) => !/^https?:\/\//.test(k) && !k.startsWith("/"));
  // D1 refuse plus de 100 paramètres par requête : recherche par lots.
  const batches: string[][] = [];
  for (let i = 0; i < keys.length; i += D1_MAX_PARAMS) batches.push(keys.slice(i, i + D1_MAX_PARAMS));
  const entries = (await Promise.all(batches.map((batch) => db.query.media.findMany({ where: inArray(schema.media.key, batch) })))).flat();
  const byKey = new Map(entries.map((m) => [m.key, m]));
  const describe = (key: string) => {
    const m = byKey.get(key);
    return { key, label: m?.label ?? null, content_type: m?.contentType ?? null, size: m?.size ?? null };
  };
  return {
    plans: plans.map((p) => ({ code: p.code, name: p.name, status: p.status, floor_plans: p.floorPlans.map((key, i) => ({ position: i + 1, ...describe(key) })) })),
    catalogue_files: catalogue.map((f) => ({ ...describe(f.key), label: f.label, updated_at: f.updatedAt ?? null })),
  };
}

function planDetails(p: typeof schema.plans.$inferSelect) {
  return {
    id: p.id,
    code: p.code,
    slug: p.slug,
    name: p.name,
    category: p.category,
    status: p.status,
    public_url: `/catalogue/${p.slug}`,
    premium_url: `/espace-premium/plans/${p.slug}`,
    summary: p.summary,
    description: p.description,
    seo_title: p.seoTitle,
    seo_description: p.seoDescription,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    levels: p.levels,
    surface_total: p.surfaceTotal,
    footprint: p.footprint,
    building_width: p.buildingWidth,
    building_depth: p.buildingDepth,
    land_area: p.landArea,
    land_width: p.landWidth,
    land_depth: p.landDepth,
    budget_min: p.budgetMin,
    budget_max: p.budgetMax,
    standing: p.standing,
    featured: p.featured,
    sort_order: p.sortOrder,
    cover_image: p.coverImage,
    renders: p.renders,
    premium: {
      floor_plans: p.floorPlans.map((key) => ({ key, url: privateFileUrl(key) })),
      rooms: p.rooms,
      rooms_area_total: Math.round(p.rooms.reduce((sum, r) => sum + r.area, 0) * 100) / 100,
      estimate_total: p.estimateTotal,
      estimate_lots: p.estimateLots,
      estimate_lots_total: p.estimateLots.reduce((sum, l) => sum + l.amount, 0),
      cost_assumptions: p.costAssumptions,
      strengths: p.strengths,
      watchouts: p.watchouts,
      premium_notes: p.premiumNotes,
    },
    currency: "XAF",
    published_at: iso(p.publishedAt),
    created_at: iso(p.createdAt),
    updated_at: iso(p.updatedAt),
  };
}

const roomSchema = obj({ name: str("Pièce, ex. « Séjour »"), area: num("Surface (m²)"), level: str("Niveau, ex. « RDC », « R+1 »") }, ["name", "area"]);
const lotSchema = obj({ label: str("Lot, ex. « Gros œuvre »"), amount: num("Montant entier (FCFA)") }, ["label", "amount"]);

/** Outils exposés à un agent IA pour piloter l'activité WOOPLANS. */
export const TOOLS: McpTool[] = [
  /* ─────────── Pilotage ─────────── */
  {
    name: "get_business_summary",
    description:
      "Résumé du tunnel de vente sur une période : visiteurs, visiteurs de la page de vente, paiements démarrés, achats, revenu du catalogue, encaissements des plans complets, membres, demandes, et performance par source/campagne UTM.",
    inputSchema: obj({ days: { type: "number", enum: [7, 30, 90, 365], description: "Période en jours (défaut 30)" } }),
    annotations: { readOnlyHint: true },
    handler: async (args) => {
      const days = ([7, 30, 90, 365].includes(asNumber(args.days) ?? 30) ? asNumber(args.days) ?? 30 : 30) as Period;
      const [kpis, sources] = await Promise.all([getFunnelKpis(days), getSourceBreakdown(days)]);
      return { period_days: days, currency: "XAF", ...kpis, sources: sources.slice(0, 15) };
    },
  },
  {
    name: "list_sales",
    description: "Liste les ventes du Catalogue Premium (Chariow), les plus récentes d'abord. Filtre possible par statut et date.",
    inputSchema: obj({
      status: str("completed | abandoned | failed", { enum: ["completed", "abandoned", "failed"] }),
      since: str("Date ISO (AAAA-MM-JJ) de début"),
      limit: num("Nombre maximum (défaut 25, max 100)"),
    }),
    annotations: { readOnlyHint: true },
    handler: async (args) => {
      const conditions = [];
      const status = asString(args.status);
      if (status === "completed" || status === "abandoned" || status === "failed") conditions.push(eq(schema.sales.status, status));
      const since = asDate(args.since);
      if (since) conditions.push(gte(schema.sales.occurredAt, since));
      const rows = await getDb().query.sales.findMany({
        where: conditions.length ? and(...conditions) : undefined,
        orderBy: desc(schema.sales.occurredAt),
        limit: Math.min(100, asNumber(args.limit) ?? 25),
      });
      return rows.map((s) => ({
        sale_id: s.chariowSaleId,
        date: iso(s.occurredAt),
        status: s.status,
        amount: s.amount,
        currency: s.currency,
        name: s.name,
        email: s.email,
        phone: s.phone,
        source: s.source,
        campaign: s.utmCampaign,
      }));
    },
  },

  /* ─────────── Membres Premium ─────────── */
  {
    name: "find_members",
    description: "Recherche des membres Premium par email, nom ou téléphone.",
    inputSchema: obj({ query: str("Texte recherché (vide = derniers membres)"), limit: num("Maximum (défaut 20)") }),
    annotations: { readOnlyHint: true },
    handler: async (args) => {
      const q = asString(args.query);
      const rows = await getDb().query.members.findMany({
        where: q ? or(like(schema.members.email, `%${q}%`), like(schema.members.name, `%${q}%`), like(schema.members.phone, `%${q}%`)) : undefined,
        orderBy: desc(schema.members.createdAt),
        limit: Math.min(100, asNumber(args.limit) ?? 20),
      });
      return rows.map((m) => ({
        email: m.email,
        name: m.name,
        phone: m.phone,
        status: m.status,
        source: m.source,
        since: iso(m.createdAt),
        last_login: iso(m.lastLoginAt),
        revoked_reason: m.revokedReason,
      }));
    },
  },
  {
    name: "grant_premium_access",
    description:
      "Donne (ou rétablit) l'accès Premium à un email et envoie le code d'accès par email. À utiliser pour un paiement reçu hors Chariow ou un geste commercial.",
    inputSchema: obj({ email: str("Email du client"), name: str("Nom du client"), phone: str("Téléphone") }, ["email"]),
    annotations: { idempotentHint: false },
    handler: async (args) => {
      const email = asString(args.email);
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email invalide");
      const { member, code, created } = await grantAccess({ email, name: asString(args.name), phone: asString(args.phone), source: "manual" });
      const mail = accessCodeEmail({ name: member.name, email: member.email, code });
      const sent = await sendEmail({ to: member.email, ...mail, template: "access_code", memberId: member.id });
      return { email: member.email, created, code_emailed: sent.ok, email_error: sent.ok ? undefined : sent.error };
    },
  },
  {
    name: "send_new_access_code",
    description: "Génère un nouveau code d'accès pour un membre actif et l'envoie par email (l'ancien code ne fonctionne plus).",
    inputSchema: obj({ email: str("Email du membre") }, ["email"]),
    handler: async (args) => {
      const member = await findMember(args.email);
      if (member.status !== "active") throw new Error("Ce membre est révoqué : utilisez grant_premium_access pour le réactiver.");
      const { code } = await rotateAccessCode(member.id);
      const mail = accessCodeEmail({ name: member.name, email: member.email, code, kind: "new_code" });
      const sent = await sendEmail({ to: member.email, ...mail, template: "access_code_reset", memberId: member.id });
      return { email: member.email, code_emailed: sent.ok };
    },
  },
  {
    name: "revoke_premium_access",
    description: "Révoque immédiatement l'accès Premium d'un membre (remboursement, partage abusif). Ses sessions sont fermées.",
    inputSchema: obj({ email: str("Email du membre"), reason: str("Motif") }, ["email", "reason"]),
    annotations: { destructiveHint: true },
    handler: async (args) => {
      const member = await findMember(args.email);
      await revokeAccess(member.id, asString(args.reason) ?? "Révoqué par l'agent");
      return { email: member.email, status: "revoked" };
    },
  },

  /* ─────────── CRM plans complets ─────────── */
  {
    name: "list_leads",
    description:
      "Liste les demandes de plans complets (CRM). Filtres : étape du pipeline, ou uniquement celles à relancer (relance prévue aujourd'hui ou en retard).",
    inputSchema: obj({
      stage: str("Étape", { enum: [...LEAD_STAGES] }),
      due_only: { type: "boolean", description: "Uniquement les relances dues" },
      limit: num("Maximum (défaut 50)"),
    }),
    annotations: { readOnlyHint: true },
    handler: async (args) => {
      const conditions = [];
      const stage = asString(args.stage);
      if (stage && (LEAD_STAGES as readonly string[]).includes(stage)) conditions.push(eq(schema.leads.stage, stage as LeadStage));
      if (args.due_only === true) {
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        conditions.push(lte(schema.leads.nextFollowUpAt, endOfDay));
      }
      const db = getDb();
      const [rows, payments] = await Promise.all([
        db.query.leads.findMany({
          where: conditions.length ? and(...conditions) : undefined,
          orderBy: [asc(schema.leads.nextFollowUpAt), desc(schema.leads.updatedAt)],
          limit: Math.min(200, asNumber(args.limit) ?? 50),
        }),
        db.query.leadPayments.findMany({ columns: { leadId: true, amount: true } }),
      ]);
      return rows
        .filter((l) => args.due_only !== true || !["termine", "perdu"].includes(l.stage))
        .map((l) => ({
          lead_id: l.id,
          name: l.name,
          phone: l.phone,
          email: l.email,
          city: l.city,
          plan: l.planLabel,
          channel: l.channel,
          stage: l.stage,
          agreed_price: l.agreedPrice,
          catalogue_credit: l.catalogueCredit,
          paid: payments.filter((p) => p.leadId === l.id).reduce((s, p) => s + p.amount, 0),
          next_follow_up: iso(l.nextFollowUpAt),
          updated: iso(l.updatedAt),
        }));
    },
  },
  {
    name: "get_lead",
    description: "Détail d'une demande : informations, historique (notes, appels, emails, changements d'étape) et encaissements.",
    inputSchema: obj({ lead_id: str("Identifiant de la demande") }, ["lead_id"]),
    annotations: { readOnlyHint: true },
    handler: async (args) => {
      const lead = await findLead(args.lead_id);
      const db = getDb();
      const [activities, payments] = await Promise.all([
        db.query.leadActivities.findMany({ where: eq(schema.leadActivities.leadId, lead.id), orderBy: desc(schema.leadActivities.createdAt), limit: 50 }),
        db.query.leadPayments.findMany({ where: eq(schema.leadPayments.leadId, lead.id), orderBy: desc(schema.leadPayments.paidAt) }),
      ]);
      return {
        ...lead,
        createdAt: iso(lead.createdAt),
        updatedAt: iso(lead.updatedAt),
        nextFollowUpAt: iso(lead.nextFollowUpAt),
        activities: activities.map((a) => ({ date: iso(a.createdAt), kind: a.kind, body: a.body, author: a.author })),
        payments: payments.map((p) => ({ id: p.id, date: iso(p.paidAt), amount: p.amount, method: p.method, reference: p.reference })),
      };
    },
  },
  {
    name: "create_lead",
    description: "Ajoute au CRM une demande de plans complets reçue hors ligne (WhatsApp, téléphone, rencontre…).",
    inputSchema: obj(
      {
        name: str("Nom du client"),
        phone: str("Téléphone / WhatsApp"),
        email: str("Email"),
        city: str("Ville du terrain"),
        country: str("Pays"),
        plan: str("Référence du modèle, ex. V3-037"),
        channel: str("Canal", { enum: ["site", "whatsapp", "telephone", "facebook", "bouche_a_oreille", "autre"] }),
        details: str("Description du projet"),
        next_follow_up: str("Date de relance AAAA-MM-JJ"),
      },
      ["name"],
    ),
    handler: async (args) => {
      const name = asString(args.name);
      if (!name) throw new Error("Nom requis");
      const db = getDb();
      const email = asString(args.email)?.toLowerCase() ?? null;
      const member = email ? await db.query.members.findFirst({ where: eq(schema.members.email, email) }) : null;
      const channels = ["site", "whatsapp", "telephone", "facebook", "bouche_a_oreille", "autre"] as const;
      const channel = channels.find((c) => c === asString(args.channel)) ?? "whatsapp";
      const id = randomId();
      await db.insert(schema.leads).values({
        id,
        name,
        phone: asString(args.phone) ?? null,
        email,
        city: asString(args.city) ?? null,
        country: asString(args.country) ?? null,
        planLabel: asString(args.plan)?.toUpperCase() ?? null,
        channel,
        projectDetails: asString(args.details) ?? "",
        memberId: member?.id ?? null,
        catalogueCredit: member ? cataloguePrice() : 0,
        nextFollowUpAt: asDate(args.next_follow_up) ?? null,
      });
      await logLead(id, "note", `Demande créée par l'agent (canal : ${channel}).`);
      return { lead_id: id, is_premium_member: Boolean(member) };
    },
  },
  {
    name: "update_lead",
    description:
      "Met à jour une demande : étape du pipeline, prochaine relance, honoraires convenus, crédit catalogue, et/ou ajoute une note ou un compte rendu d'appel.",
    inputSchema: obj(
      {
        lead_id: str("Identifiant de la demande"),
        stage: str("Nouvelle étape", { enum: [...LEAD_STAGES] }),
        next_follow_up: str("Date de relance AAAA-MM-JJ"),
        agreed_price: num("Honoraires convenus (FCFA)"),
        catalogue_credit: num("Crédit catalogue déduit (FCFA)"),
        note: str("Note à ajouter à l'historique"),
        note_kind: str("note | call", { enum: ["note", "call"] }),
        lost_reason: str("Motif si l'étape est « perdu »"),
      },
      ["lead_id"],
    ),
    handler: async (args) => {
      const lead = await findLead(args.lead_id);
      const updates: Partial<typeof schema.leads.$inferInsert> = { updatedAt: new Date() };
      const stage = asString(args.stage);
      if (stage && (LEAD_STAGES as readonly string[]).includes(stage) && stage !== lead.stage) {
        updates.stage = stage as LeadStage;
        await logLead(lead.id, "stage", `${lead.stage} → ${stage}`);
      }
      const follow = asDate(args.next_follow_up);
      if (follow) updates.nextFollowUpAt = follow;
      const price = asNumber(args.agreed_price);
      if (price !== undefined) updates.agreedPrice = Math.round(price);
      const credit = asNumber(args.catalogue_credit);
      if (credit !== undefined) updates.catalogueCredit = Math.round(credit);
      const lost = asString(args.lost_reason);
      if (lost) updates.lostReason = lost;
      await getDb().update(schema.leads).set(updates).where(eq(schema.leads.id, lead.id));
      const note = asString(args.note);
      if (note) await logLead(lead.id, args.note_kind === "call" ? "call" : "note", note);
      return { lead_id: lead.id, updated: Object.keys(updates).filter((k) => k !== "updatedAt"), note_added: Boolean(note) };
    },
  },
  {
    name: "record_lead_payment",
    description: "Enregistre un encaissement pour des plans complets (séparé du revenu du catalogue).",
    inputSchema: obj(
      {
        lead_id: str("Identifiant de la demande"),
        amount: num("Montant en FCFA"),
        method: str("mobile_money | virement | especes | chariow"),
        reference: str("Référence de transaction"),
        paid_at: str("Date AAAA-MM-JJ (défaut aujourd'hui)"),
      },
      ["lead_id", "amount"],
    ),
    handler: async (args) => {
      const lead = await findLead(args.lead_id);
      const amount = Math.round(asNumber(args.amount) ?? 0);
      if (amount <= 0) throw new Error("Montant invalide");
      const method = asString(args.method) ?? "mobile_money";
      await getDb()
        .insert(schema.leadPayments)
        .values({ id: randomId(), leadId: lead.id, amount, method, reference: asString(args.reference) ?? null, paidAt: asDate(args.paid_at) ?? new Date() });
      await logLead(lead.id, "payment", `Encaissement de ${amount.toLocaleString("fr-FR")} FCFA (${method}) enregistré par l'agent.`);
      return { lead_id: lead.id, amount, method };
    },
  },
  {
    name: "send_lead_email",
    description:
      "Envoie un email de relance au client d'une demande (via Resend) et l'ajoute à l'historique. Montrer le texte au propriétaire avant l'envoi.",
    inputSchema: obj(
      { lead_id: str("Identifiant de la demande"), subject: str("Objet"), message: str("Corps du message (texte, paragraphes séparés par une ligne vide)"), next_follow_up: str("Prochaine relance AAAA-MM-JJ") },
      ["lead_id", "subject", "message"],
    ),
    handler: async (args) => {
      const lead = await findLead(args.lead_id);
      if (!lead.email) throw new Error("Cette demande n'a pas d'adresse email.");
      const subject = asString(args.subject)!;
      const message = asString(args.message);
      if (!message) throw new Error("Message vide");
      const mail = leadFollowUpEmail({ name: lead.name, subject, message });
      const result = await sendEmail({ to: lead.email, ...mail, template: "lead_follow_up", leadId: lead.id });
      await logLead(lead.id, "email", result.ok ? `Email envoyé par l'agent : « ${subject} »` : `Échec email « ${subject} » : ${result.error}`);
      const follow = asDate(args.next_follow_up);
      if (follow) await getDb().update(schema.leads).set({ nextFollowUpAt: follow }).where(eq(schema.leads.id, lead.id));
      return { sent: result.ok, error: result.ok ? undefined : result.error };
    },
  },

  /* ─────────── Catalogue ─────────── */
  {
    name: "list_plans",
    description: "Liste les modèles du catalogue avec leur statut et l'état de leur contenu Premium (distributions, devis).",
    inputSchema: obj({ status: str("draft | published | archived", { enum: ["draft", "published", "archived"] }) }),
    annotations: { readOnlyHint: true },
    handler: async (args) => {
      const status = asString(args.status);
      const rows = await getDb().query.plans.findMany({
        where: status === "draft" || status === "published" || status === "archived" ? eq(schema.plans.status, status) : undefined,
        orderBy: [asc(schema.plans.category), asc(schema.plans.code)],
      });
      return rows.map((p) => ({
        code: p.code,
        slug: p.slug,
        name: p.name,
        category: p.category,
        status: p.status,
        bedrooms: p.bedrooms,
        levels: p.levels,
        surface_total: p.surfaceTotal,
        footprint: p.footprint,
        land_area: p.landArea,
        estimate_total: p.estimateTotal,
        budget_range: [p.budgetMin, p.budgetMax],
        has_floor_plans: p.floorPlans.length > 0,
        has_estimate_lots: p.estimateLots.length > 0,
        renders: p.renders.length,
        url: `/catalogue/${p.slug}`,
      }));
    },
  },
  {
    name: "get_plan",
    description:
      "Fiche complète d'un modèle (référence ou slug), y compris les champs Premium (distributions, pièces, devis par lots, hypothèses, points forts, points de vigilance, notes). À utiliser pour vérifier une fiche avant de la présenter au propriétaire.",
    inputSchema: obj({ code: str("Référence (ex. V4-001) ou slug (ex. villa-v4-001)") }, ["code"]),
    annotations: { readOnlyHint: true },
    handler: async (args) => planDetails(await findPlan(args.code)),
  },
  {
    name: "create_plan",
    description:
      "Crée une nouvelle fiche du catalogue, toujours en BROUILLON (invisible du public). Slug généré automatiquement : catégorie + référence (villa + V4-001 → villa-v4-001). Refus si la référence ou le slug existe déjà. Nombres en valeurs numériques (pas de texte ni d'unité) : surfaces en m², dimensions en m, montants entiers en FCFA. Villas et duplex : le devis (total et lots) et le budget indicatif sont calculés automatiquement (surface_total × prix au m² des réglages × coefficient de standing) ; les valeurs envoyées pour ces champs sont remplacées. Terrain : si building_width et building_depth sont fournis, land_width = largeur + 3, land_depth = profondeur + 7 et land_area = leur produit arrondi au multiple de 50 m² inférieur. Les images s'ajoutent ensuite avec upload_plan_image.",
    inputSchema: obj(
      {
        code: str("Référence commerciale en majuscules, ex. V4-001, D4-034"),
        name: str("Nom du modèle, ex. « Villa V4-001 »"),
        category: str("Catégorie", { enum: [...PLAN_CATEGORIES] }),
        summary: str("Accroche publique (300 caractères max)"),
        description: str("Description publique"),
        seo_title: str("Titre SEO (≈ 60 caractères)"),
        seo_description: str("Méta-description SEO (≈ 155 caractères)"),
        bedrooms: { type: "integer", minimum: 0, maximum: 50, description: "Chambres" },
        bathrooms: { type: "integer", minimum: 0, maximum: 50, description: "Salles de bain / d'eau" },
        levels: { type: "integer", minimum: 1, maximum: 30, description: "Niveaux (1 = plain-pied, 2 = R+1…)" },
        surface_total: { type: "integer", minimum: 10, maximum: 100000, description: "Surface totale habitable (m²)" },
        footprint: { type: "integer", minimum: 1, description: "Emprise au sol (m²)" },
        building_width: { type: "number", minimum: 1, maximum: 500, description: "Largeur du bâtiment (m)" },
        building_depth: { type: "number", minimum: 1, maximum: 500, description: "Profondeur du bâtiment (m)" },
        land_area: { type: "integer", minimum: 1, description: "Terrain minimum conseillé (m²)" },
        land_width: { type: "number", minimum: 1, description: "Largeur du terrain (m)" },
        land_depth: { type: "number", minimum: 1, description: "Profondeur du terrain (m)" },
        budget_min: { type: "integer", minimum: 0, description: "Budget de construction indicatif min (FCFA)" },
        budget_max: { type: "integer", minimum: 0, description: "Budget de construction indicatif max (FCFA)" },
        standing: str("Standing : bas | standard | eleve (défaut standard) ; coefficient appliqué au devis", { enum: ["bas", "standard", "eleve"] }),
        rooms: { type: "array", maxItems: 150, items: roomSchema, description: "Premium : pièces avec surfaces" },
        estimate_lots: { type: "array", maxItems: 80, items: lotSchema, description: "Premium : devis par lots" },
        estimate_total: { type: "integer", minimum: 0, description: "Premium : total du devis (FCFA, défaut = somme des lots)" },
        cost_assumptions: str("Premium : hypothèses de coût (prix au m², ville, finitions…)"),
        strengths: { type: "array", maxItems: 30, items: { type: "string" }, description: "Premium : points forts" },
        watchouts: { type: "array", maxItems: 30, items: { type: "string" }, description: "Premium : points de vigilance" },
        premium_notes: str("Premium : notes réservées aux membres"),
        featured: { type: "boolean", description: "Mis en avant sur l'accueil (défaut false)" },
        sort_order: { type: "integer", description: "Ordre d'affichage (défaut 0)" },
      },
      ["code", "name", "category", "surface_total"],
    ),
    handler: async (args) => {
      const { values, warnings } = parseCreatePlanInput(args);
      const db = getDb();
      const existing = await db.query.plans.findFirst({
        where: or(eq(schema.plans.code, values.code), eq(schema.plans.slug, values.slug)),
        columns: { code: true, slug: true, status: true },
      });
      if (existing) throw new Error(`Déjà au catalogue : ${existing.code} (${existing.slug}, ${existing.status}). Utilisez update_plan_content ou une autre référence.`);
      const id = randomId();
      Object.assign(values, derivedPlanFields(values, await getCostSettings()));
      await db.insert(schema.plans).values({ id, ...values, coverImage: "", renders: [], floorPlans: [], publishedAt: null });
      return {
        id,
        code: values.code,
        slug: values.slug,
        status: "draft",
        warnings,
        next_steps: "Ajouter les rendus (upload_plan_image role=render) puis les distributions (role=floor_plan), vérifier avec get_plan, présenter un résumé au propriétaire et ne publier qu'après son accord.",
        admin_url: `/admin/plans/${id}`,
      };
    },
  },
  {
    name: "upload_plan_image",
    description:
      "Ajoute un fichier à la galerie d'un modèle, depuis une URL https (téléchargée par le serveur) OU un contenu base64 (8 Mo max). role « render » : rendu 3D public (png, jpeg, webp), ajouté à la fin des rendus ; le premier devient la couverture s'il n'y en a pas. role « floor_plan » : distribution cotée PRIVÉE, visible des seuls membres Premium (png, jpeg, webp ou PDF). Le type réel du fichier est contrôlé. Pour des fichiers qui sont sur l'ordinateur du propriétaire, utiliser plutôt create_upload_link.",
    inputSchema: obj(
      {
        code: str("Référence du modèle"),
        role: str("render | floor_plan", { enum: ["render", "floor_plan"] }),
        url: str("URL https du fichier (au lieu de content_base64)"),
        content_base64: str("Contenu du fichier en base64, préfixe data: accepté (au lieu de url)"),
        filename: str("Nom lisible du fichier, ex. « V4-001 rendu façade.jpg »"),
        set_as_cover: { type: "boolean", description: "render uniquement : en faire la couverture" },
      },
      ["code", "role"],
    ),
    handler: async (args) => {
      const plan = await findPlan(args.code);
      const role = asRole(args.role);
      const url = asString(args.url);
      const base64 = asString(args.content_base64);
      if (Boolean(url) === Boolean(base64)) throw new Error("Fournir soit url, soit content_base64 (un seul des deux).");
      if (args.set_as_cover === true && role !== "render") throw new Error("set_as_cover ne s'applique qu'aux rendus (role=render).");

      let file: IncomingFile;
      if (base64) {
        const bytes = decodeBase64File(base64, PLAN_IMAGE_MAX_BYTES);
        file = { body: bytes, size: bytes.byteLength, type: sniffFileType(bytes.subarray(0, 16)) };
      } else {
        file = await downloadFile(url!, PLAN_IMAGE_MAX_BYTES);
      }
      const label = asString(args.filename) ?? (url ? new URL(url).pathname.split("/").pop() : undefined);
      return attachFileToPlan({ planId: plan.id, role, file, label, setAsCover: args.set_as_cover === true });
    },
  },
  {
    name: "create_upload_link",
    description:
      "Crée un lien d'envoi temporaire pour ajouter à un modèle des fichiers qui sont sur l'ordinateur du propriétaire (rendus 3D et distributions). " +
      "Sur claude.ai : donner le lien « page » au propriétaire, qui y dépose ses fichiers depuis son navigateur. " +
      "Avec Claude Code (accès aux fichiers locaux) : envoyer chaque fichier avec la commande curl fournie, sans passer son contenu dans la conversation. " +
      "Le lien ne permet que d'ajouter des fichiers à ce modèle et expire (2 h par défaut). Ensuite, vérifier avec get_plan.",
    inputSchema: obj(
      {
        code: str("Référence du modèle"),
        hours: { type: "number", minimum: 0.25, maximum: 24, description: "Durée de validité en heures (défaut 2, max 24)" },
      },
      ["code"],
    ),
    handler: async (args) => {
      const plan = await findPlan(args.code);
      const hours = Math.min(24, Math.max(0.25, asNumber(args.hours) ?? 2));
      const expiresAt = Date.now() + Math.round(hours * 3600_000);
      const token = await signUploadToken(requireSecret("AUTH_SECRET"), { planId: plan.id, code: plan.code, expiresAt });
      const endpoint = siteUrl("/api/televersement");
      return {
        code: plan.code,
        expires_at: new Date(expiresAt).toISOString(),
        page: siteUrl(`/televersement#${token}`),
        curl_render: `curl -fsS -T "<chemin/rendu.jpg>" -H "Authorization: Bearer ${token}" "${endpoint}?role=render"`,
        curl_floor_plan: `curl -fsS -T "<chemin/distribution.pdf>" -H "Authorization: Bearer ${token}" "${endpoint}?role=floor_plan"`,
        notes:
          "Un fichier par commande curl ; l'ordre d'envoi est l'ordre d'affichage. Ajouter &cover=1 pour faire d'un rendu la couverture. Taille max " +
          `${UPLOAD_LINK_MAX_BYTES / 1048576} Mo par fichier ; png, jpeg, webp (et PDF pour les distributions). Ne pas publier ce lien.`,
      };
    },
  },
  {
    name: "set_plan_cover",
    description: "Choisit l'image de couverture d'un modèle parmi ses rendus (valeur renvoyée par get_plan, clé R2, ou position à partir de 1).",
    inputSchema: obj({ code: str("Référence du modèle"), image: str("Rendu choisi : « /media/… », clé R2, ou position (« 1 » = premier)") }, ["code", "image"]),
    annotations: { idempotentHint: true },
    handler: async (args) => {
      const plan = await findPlan(args.code);
      const cover = matchImage(plan.renders, args.image);
      await getDb().update(schema.plans).set({ coverImage: cover, updatedAt: new Date() }).where(eq(schema.plans.id, plan.id));
      return { code: plan.code, cover_image: cover };
    },
  },
  {
    name: "reorder_plan_images",
    description:
      "Réordonne les rendus (role=render) ou les distributions (role=floor_plan) d'un modèle. order doit reprendre exactement toutes les valeurs actuelles (voir get_plan), dans le nouvel ordre. La couverture ne change pas (voir set_plan_cover).",
    inputSchema: obj(
      {
        code: str("Référence du modèle"),
        role: str("render | floor_plan", { enum: ["render", "floor_plan"] }),
        order: { type: "array", items: { type: "string" }, description: "Toutes les valeurs actuelles, dans le nouvel ordre" },
      },
      ["code", "role", "order"],
    ),
    annotations: { idempotentHint: true },
    handler: async (args) => {
      const plan = await findPlan(args.code);
      const role = asRole(args.role);
      if (!Array.isArray(args.order) || !args.order.every((x) => typeof x === "string")) throw new Error("order : liste de textes attendue");
      const current = role === "render" ? plan.renders : plan.floorPlans;
      const next = reorderList(current, args.order.map((x) => matchImage(current, x)));
      await getDb()
        .update(schema.plans)
        .set(role === "render" ? { renders: next, updatedAt: new Date() } : { floorPlans: next, updatedAt: new Date() })
        .where(eq(schema.plans.id, plan.id));
      return { code: plan.code, role, order: next };
    },
  },
  {
    name: "remove_plan_image",
    description:
      "Retire un rendu ou une distribution d'un modèle. Le fichier est aussi supprimé de R2 s'il appartient au dossier de ce modèle et n'est utilisé par aucun autre modèle. Si c'était la couverture, le premier rendu restant la remplace. Action irréversible : confirmer avec le propriétaire si la fiche est publiée.",
    inputSchema: obj(
      {
        code: str("Référence du modèle"),
        role: str("render | floor_plan", { enum: ["render", "floor_plan"] }),
        image: str("Valeur renvoyée par get_plan, clé R2, ou position (« 1 » = premier)"),
      },
      ["code", "role", "image"],
    ),
    annotations: { destructiveHint: true },
    handler: async (args) => {
      const plan = await findPlan(args.code);
      const role = asRole(args.role);
      const current = role === "render" ? plan.renders : plan.floorPlans;
      const target = matchImage(current, args.image);
      const remaining = current.filter((item) => item !== target);
      const update: Partial<typeof schema.plans.$inferInsert> = { updatedAt: new Date() };
      if (role === "render") {
        update.renders = remaining;
        if (plan.coverImage === target) update.coverImage = remaining[0] ?? "";
      } else {
        update.floorPlans = remaining;
      }
      const db = getDb();
      await db.update(schema.plans).set(update).where(eq(schema.plans.id, plan.id));

      const key = mediaKeyOf(target);
      const visibility = role === "render" ? "public" : "private";
      let fileDeleted = false;
      if (key.startsWith(`${visibility}/${planMediaFolder(plan.code)}/`)) {
        const others = await db.query.plans.findFirst({
          where: and(
            or(like(schema.plans.renders, `%${key}%`), like(schema.plans.floorPlans, `%${key}%`), like(schema.plans.coverImage, `%${key}%`)),
            sql`${schema.plans.id} <> ${plan.id}`,
          ),
          columns: { id: true },
        });
        if (!others) {
          await deleteMedia(key);
          fileDeleted = true;
        }
      }
      return { code: plan.code, role, removed: target, file_deleted: fileDeleted, cover_image: update.coverImage ?? plan.coverImage, remaining };
    },
  },
  {
    name: "update_plan_content",
    description:
      "Met à jour les textes et caractéristiques d'un modèle (identifié par sa référence) : accroche, description, SEO, chambres, niveaux, surfaces, terrain, budget, pièces, devis par lots, atouts, points d'attention, notes, statut de publication. Les listes fournies (pièces, lots, atouts…) remplacent les anciennes. Publier (status « published ») rend la fiche visible de tous : ne le faire qu'après l'accord explicite du propriétaire. Villas et duplex : devis, lots et budget indicatif sont recalculés automatiquement (surface × prix au m² × coefficient de standing) ; le terrain l'est aussi dès que les dimensions du bâtiment sont connues. Les images se gèrent avec upload_plan_image, set_plan_cover, reorder_plan_images et remove_plan_image.",
    inputSchema: obj(
      {
        code: str("Référence du modèle, ex. V3-037"),
        status: str("draft | published | archived", { enum: ["draft", "published", "archived"] }),
        summary: str("Accroche"),
        description: str("Description publique"),
        seo_title: str("Titre SEO"),
        seo_description: str("Méta-description SEO"),
        footprint: num("Emprise au sol (m²)"),
        land_area: num("Terrain nécessaire (m²)"),
        land_width: num("Largeur terrain (m)"),
        land_depth: num("Profondeur terrain (m)"),
        building_width: num("Largeur bâtiment (m)"),
        building_depth: num("Profondeur bâtiment (m)"),
        budget_min: num("Budget indicatif min (FCFA)"),
        budget_max: num("Budget indicatif max (FCFA)"),
        standing: str("Standing : bas | standard | eleve (coefficient du devis)", { enum: ["bas", "standard", "eleve"] }),
        strengths: { type: "array", items: { type: "string" }, description: "Atouts (remplace la liste)" },
        watchouts: { type: "array", items: { type: "string" }, description: "Points d'attention (remplace la liste)" },
        cost_assumptions: str("Hypothèses de coût"),
        bedrooms: { type: "integer", minimum: 0, maximum: 50, description: "Chambres" },
        bathrooms: { type: "integer", minimum: 0, maximum: 50, description: "Salles de bain / d'eau" },
        levels: { type: "integer", minimum: 1, maximum: 30, description: "Niveaux (1 = plain-pied)" },
        surface_total: { type: "integer", minimum: 10, maximum: 100000, description: "Surface totale habitable (m²)" },
        rooms: { type: "array", maxItems: 150, items: roomSchema, description: "Premium : pièces avec surfaces (remplace la liste)" },
        estimate_lots: { type: "array", maxItems: 80, items: lotSchema, description: "Premium : devis par lots (remplace la liste ; total = somme des lots si estimate_total absent)" },
        estimate_total: { type: "integer", minimum: 0, description: "Premium : total du devis (FCFA)" },
        premium_notes: str("Premium : notes"),
      },
      ["code"],
    ),
    handler: async (args) => {
      const premium = parsePremiumUpdate(args);
      const code = asString(args.code)?.toUpperCase();
      const db = getDb();
      const plan = code ? await db.query.plans.findFirst({ where: eq(schema.plans.code, code) }) : null;
      if (!plan) throw new Error(`Modèle introuvable : ${code}`);
      const u: Partial<typeof schema.plans.$inferInsert> = { updatedAt: new Date() };
      const status = asString(args.status);
      if (status === "draft" || status === "published" || status === "archived") {
        u.status = status;
        if (status === "published" && !plan.publishedAt) u.publishedAt = new Date();
      }
      const text: [keyof typeof args, keyof typeof u][] = [
        ["summary", "summary"],
        ["description", "description"],
        ["seo_title", "seoTitle"],
        ["seo_description", "seoDescription"],
        ["cost_assumptions", "costAssumptions"],
      ];
      for (const [from, to] of text) {
        const v = asString(args[from]);
        if (v !== undefined) (u as Record<string, unknown>)[to] = v;
      }
      const numbers: [string, string, boolean][] = [
        ["footprint", "footprint", true],
        ["land_area", "landArea", true],
        ["land_width", "landWidth", false],
        ["land_depth", "landDepth", false],
        ["building_width", "buildingWidth", false],
        ["building_depth", "buildingDepth", false],
        ["budget_min", "budgetMin", true],
        ["budget_max", "budgetMax", true],
      ];
      for (const [from, to, integer] of numbers) {
        const v = asNumber(args[from]);
        if (v !== undefined) (u as Record<string, unknown>)[to] = integer ? Math.round(v) : v;
      }
      for (const key of ["strengths", "watchouts"] as const) {
        const v = args[key];
        if (Array.isArray(v)) u[key] = v.filter((x): x is string => typeof x === "string" && x.trim() !== "").map((x) => x.trim());
      }
      Object.assign(u, premium.values);
      if (args.standing !== undefined) {
        if (!isStanding(args.standing)) throw new Error("standing : bas, standard ou eleve");
        u.standing = args.standing;
      }
      // Terrain et devis recalculés à partir des valeurs finales (les valeurs envoyées pour ces champs sont remplacées).
      Object.assign(
        u,
        derivedPlanFields(
          {
            category: plan.category,
            surfaceTotal: u.surfaceTotal ?? plan.surfaceTotal,
            standing: u.standing ?? plan.standing,
            buildingWidth: u.buildingWidth !== undefined ? u.buildingWidth : plan.buildingWidth,
            buildingDepth: u.buildingDepth !== undefined ? u.buildingDepth : plan.buildingDepth,
          },
          await getCostSettings(),
        ),
      );
      await db.update(schema.plans).set(u).where(eq(schema.plans.id, plan.id));
      return {
        code: plan.code,
        updated: Object.keys(u).filter((k) => k !== "updatedAt"),
        url: `/catalogue/${plan.slug}`,
        ...(premium.warnings.length ? { warnings: premium.warnings } : {}),
      };
    },
  },

  /* ─────────── Fichiers Premium ─────────── */
  {
    name: "list_premium_files",
    description:
      "Liste les fichiers réservés à l'espace Premium : distributions cotées de chaque modèle (images ou PDF, dans l'ordre d'affichage) et catalogue complet en PDF. Renvoie pour chacun la clé R2, le nom, le type et la taille ; lire un fichier avec get_premium_file.",
    inputSchema: obj({ code: str("Référence du modèle (vide = tous les modèles ayant des distributions)") }),
    annotations: { readOnlyHint: true },
    handler: async (args) => {
      const index = await premiumFileIndex();
      const code = asString(args.code);
      if (code) {
        const plan = await findPlan(code);
        return { plans: index.plans.filter((p) => p.code === plan.code), catalogue_files: index.catalogue_files };
      }
      return { plans: index.plans.filter((p) => p.floor_plans.length > 0), catalogue_files: index.catalogue_files };
    },
  },
  {
    name: "get_premium_file",
    description:
      "Ouvre un fichier réservé à l'espace Premium (fichier d'origine, sans filigrane) : une distribution d'un modèle (code + position, ou clé) ou le catalogue PDF (clé, voir list_premium_files). " +
      `Les images de moins de ${INLINE_IMAGE_MAX_BYTES / 1_000_000} Mo sont renvoyées pour être regardées directement, les PDF de moins de ${INLINE_PDF_MAX_BYTES / 1_000_000} Mo comme document joint. ` +
      "Renvoie aussi un lien de téléchargement temporaire (30 min par défaut) : avec Claude Code, le récupérer avec curl -fsSLo <fichier> \"<lien>\". Ce lien ouvre le fichier sans connexion : ne le donner qu'au propriétaire, jamais à un client.",
    inputSchema: obj({
      code: str("Référence du modèle (avec position)"),
      position: { type: "integer", minimum: 1, description: "Position de la distribution (1 = première, défaut 1)" },
      key: str("Clé R2 du fichier (au lieu de code + position), voir list_premium_files"),
      inline: { type: "boolean", description: "Joindre le contenu du fichier à la réponse (défaut true)" },
      minutes: { type: "number", minimum: 5, maximum: 1440, description: "Validité du lien de téléchargement en minutes (défaut 30, max 1440)" },
    }),
    annotations: { readOnlyHint: true },
    handler: async (args) => {
      const index = await premiumFileIndex();
      let key = asString(args.key);
      let plan: string | null = null;
      if (key) {
        key = mediaKeyOf(key.replace(/^\/api\/premium\/fichier\//, "").split("?")[0]).split("/").map(decodeURIComponent).join("/");
        const owner = index.plans.find((p) => p.floor_plans.some((f) => f.key === key));
        if (!owner && !index.catalogue_files.some((f) => f.key === key)) throw new Error(`Fichier Premium introuvable : ${key}. Voir list_premium_files.`);
        plan = owner?.code ?? null;
      } else {
        const found = await findPlan(args.code);
        const position = asNumber(args.position) ?? 1;
        if (found.floorPlans.length === 0) throw new Error(`${found.code} n'a aucune distribution.`);
        key = found.floorPlans[position - 1];
        if (!key) throw new Error(`Position ${position} invalide : ${found.code} a ${found.floorPlans.length} distribution(s).`);
        plan = found.code;
      }
      if (/^https?:\/\//.test(key) || key.startsWith("/")) return { plan, key, url: key, note: "Fichier externe : ouvrir l'URL directement." };

      const entry = await getDb().query.media.findFirst({ where: eq(schema.media.key, key) });
      const object = await getEnv().MEDIA.get(key);
      if (!entry || !object) throw new Error(`Fichier absent du stockage : ${key}`);
      const contentType = entry.contentType || object.httpMetadata?.contentType || "application/octet-stream";

      const minutes = Math.min(1440, Math.max(5, asNumber(args.minutes) ?? 30));
      const expiresAt = Date.now() + Math.round(minutes * 60_000);
      const token = await signFileToken(requireSecret("AUTH_SECRET"), { key, expiresAt });
      const info: Record<string, unknown> = {
        plan,
        key,
        label: entry.label,
        content_type: contentType,
        size: object.size,
        download_url: siteUrl(`${privateFileUrl(key, true)}&jeton=${encodeURIComponent(token)}`),
        download_expires_at: new Date(expiresAt).toISOString(),
      };

      const isImage = /^image\/(png|jpeg|webp|gif)$/.test(contentType);
      const isPdf = contentType === "application/pdf";
      const limit = isImage ? INLINE_IMAGE_MAX_BYTES : isPdf ? INLINE_PDF_MAX_BYTES : 0;
      if (args.inline === false || object.size > limit) {
        await object.body.cancel().catch(() => {});
        info.inline = false;
        if (args.inline !== false) info.note = limit ? "Fichier trop lourd pour être joint : utiliser download_url." : "Type non joignable : utiliser download_url.";
        return info;
      }
      const data = toBase64(new Uint8Array(await object.arrayBuffer()));
      info.inline = true;
      return new ToolContent(info, [
        isImage
          ? { type: "image", data, mimeType: contentType }
          : { type: "resource", resource: { uri: `wooplans://premium/${key}`, mimeType: contentType, blob: data } },
      ]);
    },
  },
];
