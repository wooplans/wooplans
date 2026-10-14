import { and, asc, desc, eq, gte, like, lte, or } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { LEAD_STAGES, type LeadStage } from "@/db/schema";
import { getFunnelKpis, getSourceBreakdown, type Period } from "@/lib/analytics";
import { randomId } from "@/lib/crypto";
import { accessCodeEmail, leadFollowUpEmail, sendEmail } from "@/lib/email";
import { grantAccess, normalizeEmail, revokeAccess, rotateAccessCode } from "@/lib/members";

type JsonSchema = Record<string, unknown>;
export type McpTool = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean; idempotentHint?: boolean };
  handler: (args: Record<string, unknown>) => Promise<unknown>;
};

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

/** Outils exposés à un agent IA pour piloter l'activité WooPlans. */
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
      const mail = accessCodeEmail({ name: member.name, email: member.email, code, isNewCode: true });
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
        catalogueCredit: member ? 39000 : 0,
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
        url: `/plans/${p.slug}`,
      }));
    },
  },
  {
    name: "update_plan_content",
    description:
      "Met à jour les textes et caractéristiques d'un modèle (identifié par sa référence) : accroche, description, SEO, surfaces, terrain, budget, atouts, points d'attention, statut de publication. Les images se gèrent dans l'admin.",
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
        strengths: { type: "array", items: { type: "string" }, description: "Atouts (remplace la liste)" },
        watchouts: { type: "array", items: { type: "string" }, description: "Points d'attention (remplace la liste)" },
        cost_assumptions: str("Hypothèses de coût"),
      },
      ["code"],
    ),
    handler: async (args) => {
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
      await db.update(schema.plans).set(u).where(eq(schema.plans.id, plan.id));
      return { code: plan.code, updated: Object.keys(u).filter((k) => k !== "updatedAt"), url: `/plans/${plan.slug}` };
    },
  },
];
