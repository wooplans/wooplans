import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const now = sql`(unixepoch() * 1000)`;
const createdAt = () => integer("created_at", { mode: "timestamp_ms" }).notNull().default(now);
const updatedAt = () => integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now);

export type PlanRoom = { name: string; area: number; level?: string };
export type EstimateLot = { label: string; amount: number };

/* ─────────────────────────── Catalogue ─────────────────────────── */

export const plans = sqliteTable(
  "plans",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    /** Référence commerciale, ex. "V3-037" */
    code: text("code").notNull(),
    name: text("name").notNull(),
    category: text("category", { enum: ["villa", "duplex", "immeuble", "autre"] }).notNull(),
    status: text("status", { enum: ["draft", "published", "archived"] }).notNull().default("draft"),

    /* Public */
    summary: text("summary").notNull().default(""),
    description: text("description").notNull().default(""),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    bedrooms: integer("bedrooms").notNull().default(0),
    bathrooms: integer("bathrooms").notNull().default(0),
    levels: integer("levels").notNull().default(1),
    /** Surface totale habitable (m²) */
    surfaceTotal: integer("surface_total").notNull().default(0),
    /** Emprise au sol (m²) */
    footprint: integer("footprint"),
    /** Dimensions principales du bâtiment (m) */
    buildingWidth: real("building_width"),
    buildingDepth: real("building_depth"),
    /** Terrain minimum conseillé (m²) et dimensions (m) */
    landArea: integer("land_area"),
    landWidth: real("land_width"),
    landDepth: real("land_depth"),
    /** Budget de construction indicatif (FCFA) */
    budgetMin: integer("budget_min"),
    budgetMax: integer("budget_max"),
    coverImage: text("cover_image").notNull().default(""),
    renders: text("renders", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    featured: integer("featured", { mode: "boolean" }).notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),

    /* Premium (jamais exposé côté public) */
    rooms: text("rooms", { mode: "json" }).$type<PlanRoom[]>().notNull().default(sql`'[]'`),
    floorPlans: text("floor_plans", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    estimateTotal: integer("estimate_total"),
    estimateLots: text("estimate_lots", { mode: "json" }).$type<EstimateLot[]>().notNull().default(sql`'[]'`),
    costAssumptions: text("cost_assumptions").notNull().default(""),
    strengths: text("strengths", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    watchouts: text("watchouts", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    premiumNotes: text("premium_notes").notNull().default(""),

    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("plans_slug_idx").on(t.slug),
    uniqueIndex("plans_code_idx").on(t.code),
    index("plans_status_idx").on(t.status),
    index("plans_category_idx").on(t.category),
  ],
);

/** Registre des fichiers R2 : la visibilité est contrôlée côté serveur. */
export const media = sqliteTable(
  "media",
  {
    key: text("key").primaryKey(),
    visibility: text("visibility", { enum: ["public", "private"] }).notNull(),
    contentType: text("content_type").notNull().default("application/octet-stream"),
    size: integer("size").notNull().default(0),
    label: text("label"),
    createdAt: createdAt(),
  },
  (t) => [index("media_visibility_idx").on(t.visibility)],
);

/* ─────────────────────────── Membres Premium ─────────────────────────── */

export const members = sqliteTable(
  "members",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull().default(""),
    phone: text("phone"),
    country: text("country"),
    status: text("status", { enum: ["active", "revoked"] }).notNull().default("active"),
    /** SHA-256(pepper + code) */
    codeHash: text("code_hash").notNull(),
    /** Incrémenté à chaque révocation / nouveau code : invalide les sessions ouvertes. */
    sessionVersion: integer("session_version").notNull().default(1),
    source: text("source", { enum: ["chariow", "legacy_import", "manual"] }).notNull(),
    chariowCustomerId: text("chariow_customer_id"),
    revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
    revokedReason: text("revoked_reason"),
    lastLoginAt: integer("last_login_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("members_email_idx").on(t.email), index("members_status_idx").on(t.status)],
);

export const favorites = sqliteTable(
  "favorites",
  {
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.memberId, t.planId] })],
);

/** Fiches PDF téléchargées : quota par membre et traçabilité des exemplaires (identifiant W-…). */
export const pdfDownloads = sqliteTable(
  "pdf_downloads",
  {
    id: text("id").primaryKey(),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    planSlug: text("plan_slug").notNull(),
    planCode: text("plan_code").notNull(),
    /** Identifiant imprimé sur l'exemplaire, pour retrouver le compte d'origine d'une copie. */
    markId: text("mark_id").notNull(),
    ip: text("ip"),
    country: text("country"),
    createdAt: createdAt(),
  },
  (t) => [index("pdf_downloads_member_idx").on(t.memberId, t.createdAt), index("pdf_downloads_mark_idx").on(t.markId)],
);

/* ─────────────────────────── Tunnel & ventes ─────────────────────────── */

export const visitors = sqliteTable(
  "visitors",
  {
    id: text("id").primaryKey(),
    source: text("source").notNull(),
    landingPath: text("landing_path").notNull(),
    referrer: text("referrer"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    utmContent: text("utm_content"),
    utmTerm: text("utm_term"),
    fbclid: integer("fbclid", { mode: "boolean" }).notNull().default(false),
    country: text("country"),
    device: text("device"),
    createdAt: createdAt(),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull().default(now),
  },
  (t) => [index("visitors_created_idx").on(t.createdAt), index("visitors_source_idx").on(t.source)],
);

export const FUNNEL_EVENTS = [
  "page_view",
  "plan_view",
  "cta_click",
  "sales_page_view",
  "checkout_start",
  "purchase",
  "whatsapp_click",
  "custom_plan_request",
  "widget_ready",
] as const;

export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    visitorId: text("visitor_id").notNull(),
    type: text("type").notNull(),
    path: text("path").notNull(),
    ctaId: text("cta_id"),
    planSlug: text("plan_slug"),
    createdAt: createdAt(),
  },
  (t) => [
    index("events_visitor_idx").on(t.visitorId),
    index("events_type_created_idx").on(t.type, t.createdAt),
  ],
);

/** Une intention d'achat : relie le visiteur (UTM) au paiement Chariow. */
export const checkoutIntents = sqliteTable(
  "checkout_intents",
  {
    id: text("id").primaryKey(),
    visitorId: text("visitor_id"),
    email: text("email"),
    ctaId: text("cta_id"),
    status: text("status", { enum: ["started", "paid", "failed", "abandoned"] }).notNull().default("started"),
    saleId: text("sale_id"),
    /** Code en clair, conservé quelques heures pour l'affichage sur /merci puis effacé. */
    revealCode: text("reveal_code"),
    revealUntil: integer("reveal_until", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("intents_email_idx").on(t.email), index("intents_created_idx").on(t.createdAt)],
);

/** Ventes du catalogue (Chariow). */
export const sales = sqliteTable(
  "sales",
  {
    id: text("id").primaryKey(),
    chariowSaleId: text("chariow_sale_id").notNull(),
    productId: text("product_id").notNull(),
    productName: text("product_name").notNull(),
    status: text("status", { enum: ["completed", "abandoned", "failed", "refunded"] }).notNull(),
    amount: integer("amount").notNull().default(0),
    currency: text("currency").notNull().default("XAF"),
    email: text("email"),
    name: text("name"),
    phone: text("phone"),
    country: text("country"),
    memberId: text("member_id"),
    intentId: text("intent_id"),
    visitorId: text("visitor_id"),
    utmSource: text("utm_source"),
    utmCampaign: text("utm_campaign"),
    source: text("source"),
    occurredAt: integer("occurred_at", { mode: "timestamp_ms" }).notNull().default(now),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("sales_chariow_idx").on(t.chariowSaleId),
    index("sales_status_idx").on(t.status, t.occurredAt),
    index("sales_email_idx").on(t.email),
  ],
);

/** Journal des notifications Chariow (déduplication sur x-pulse-delivery-id). */
export const webhookDeliveries = sqliteTable("webhook_deliveries", {
  deliveryId: text("delivery_id").primaryKey(),
  event: text("event").notNull(),
  saleId: text("sale_id"),
  outcome: text("outcome").notNull(),
  receivedAt: createdAt(),
});

/* ─────────────────────────── CRM prospects du catalogue ─────────────────────────── */

export const PROSPECT_STATUSES = ["open", "converted", "unsubscribed", "lost"] as const;
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

/**
 * Personnes qui ont commencé l'achat du Catalogue Premium sans le payer (paiement abandonné ou échoué,
 * ou email laissé sur le site). Une ligne par email ; passe à « converted » dès qu'un paiement arrive.
 */
export const prospects = sqliteTable(
  "prospects",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name"),
    phone: text("phone"),
    country: text("country"),
    status: text("status", { enum: PROSPECT_STATUSES }).notNull().default("open"),
    /** Dernier évènement connu : paiement abandonné, échoué, ou email laissé sur le site. */
    lastEvent: text("last_event", { enum: ["abandoned", "failed", "started"] }).notNull(),
    lastEventAt: integer("last_event_at", { mode: "timestamp_ms" }).notNull(),
    lastSaleId: text("last_sale_id"),
    amount: integer("amount"),
    source: text("source", { enum: ["webhook", "chariow_import", "site"] }).notNull(),
    utmSource: text("utm_source"),
    utmCampaign: text("utm_campaign"),
    /** Séquence de relance : nombre d'emails déjà envoyés, début et prochain envoi (null = arrêtée). */
    sequenceStep: integer("sequence_step").notNull().default(0),
    sequenceStartedAt: integer("sequence_started_at", { mode: "timestamp_ms" }),
    nextEmailAt: integer("next_email_at", { mode: "timestamp_ms" }),
    lastEmailAt: integer("last_email_at", { mode: "timestamp_ms" }),
    convertedAt: integer("converted_at", { mode: "timestamp_ms" }),
    notes: text("notes").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("prospects_email_idx").on(t.email),
    index("prospects_status_idx").on(t.status, t.lastEventAt),
    index("prospects_next_email_idx").on(t.nextEmailAt),
  ],
);

/** Désinscriptions des emails automatiques (relances prospects, actualités membres). */
export const EMAIL_OPTOUT_SCOPES = ["prospects", "members"] as const;
export type EmailOptoutScope = (typeof EMAIL_OPTOUT_SCOPES)[number];

export const emailOptouts = sqliteTable(
  "email_optouts",
  {
    email: text("email").notNull(),
    scope: text("scope", { enum: EMAIL_OPTOUT_SCOPES }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.email, t.scope] })],
);

/* ─────────────────────────── CRM plans complets ─────────────────────────── */

export const LEAD_STAGES = [
  "demande",
  "qualification",
  "devis",
  "commande",
  "production",
  "livraison",
  "termine",
  "perdu",
] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const leads = sqliteTable(
  "leads",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    country: text("country"),
    city: text("city"),
    memberId: text("member_id"),
    planId: text("plan_id"),
    planLabel: text("plan_label"),
    channel: text("channel", { enum: ["site", "whatsapp", "telephone", "facebook", "bouche_a_oreille", "autre"] })
      .notNull()
      .default("site"),
    stage: text("stage", { enum: LEAD_STAGES }).notNull().default("demande"),
    projectDetails: text("project_details").notNull().default(""),
    landDetails: text("land_details").notNull().default(""),
    budget: integer("budget"),
    /** Honoraires convenus pour les plans personnalisés (FCFA) */
    agreedPrice: integer("agreed_price"),
    /** Crédit catalogue déduit (FCFA) */
    catalogueCredit: integer("catalogue_credit").notNull().default(0),
    nextFollowUpAt: integer("next_follow_up_at", { mode: "timestamp_ms" }),
    lostReason: text("lost_reason"),
    utmSource: text("utm_source"),
    utmCampaign: text("utm_campaign"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("leads_stage_idx").on(t.stage), index("leads_follow_idx").on(t.nextFollowUpAt)],
);

export const leadActivities = sqliteTable(
  "lead_activities",
  {
    id: text("id").primaryKey(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["note", "stage", "email", "payment", "call"] }).notNull(),
    body: text("body").notNull(),
    author: text("author").notNull().default("admin"),
    createdAt: createdAt(),
  },
  (t) => [index("lead_activities_lead_idx").on(t.leadId, t.createdAt)],
);

/** Encaissements des plans complets — séparés des ventes du catalogue. */
export const leadPayments = sqliteTable(
  "lead_payments",
  {
    id: text("id").primaryKey(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    method: text("method").notNull().default("mobile_money"),
    reference: text("reference"),
    paidAt: integer("paid_at", { mode: "timestamp_ms" }).notNull().default(now),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("lead_payments_lead_idx").on(t.leadId), index("lead_payments_paid_idx").on(t.paidAt)],
);

/* ─────────────────────────── Système ─────────────────────────── */

export const admins = sqliteTable(
  "admins",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull().default(""),
    passwordHash: text("password_hash").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("admins_email_idx").on(t.email)],
);

export const emailLog = sqliteTable(
  "email_log",
  {
    id: text("id").primaryKey(),
    to: text("to").notNull(),
    template: text("template").notNull(),
    subject: text("subject").notNull(),
    status: text("status", { enum: ["sent", "failed", "skipped"] }).notNull(),
    providerId: text("provider_id"),
    error: text("error"),
    memberId: text("member_id"),
    leadId: text("lead_id"),
    createdAt: createdAt(),
  },
  (t) => [index("email_log_created_idx").on(t.createdAt), index("email_log_member_idx").on(t.memberId, t.template)],
);

/** Réglages modifiables depuis l'admin (ex. textes, grille de prix des plans complets). */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
  updatedAt: updatedAt(),
});

/** Limitation de débit simple (connexion, renvoi de code). */
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: integer("window_start", { mode: "timestamp_ms" }).notNull(),
});
