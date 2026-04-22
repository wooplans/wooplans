import { getOptionalRequestContext } from "@cloudflare/next-on-pages";
import { createClient, type Client as LibsqlClient, type InStatement } from "@libsql/client/web";

type CloudflareEnv = {
  DATABASE_URL?: string;
  DATABASE_AUTH_TOKEN?: string;
};

type SqlRow = Record<string, unknown>;

function getDatabaseEnv() {
  const requestContext = getOptionalRequestContext();
  const env = requestContext?.env as CloudflareEnv | undefined;

  return {
    url: env?.DATABASE_URL || process.env.DATABASE_URL || "",
    authToken: env?.DATABASE_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN || "",
  };
}

function isLibsqlUrl(url: string) {
  return url.startsWith("libsql://") || url.startsWith("https://") || url.startsWith("wss://");
}

function createLibsqlClient() {
  const { url, authToken } = getDatabaseEnv();

  if (!url || !isLibsqlUrl(url)) {
    return null;
  }

  return createClient({
    url,
    authToken: authToken || undefined,
  });
}

function rowValue<T>(row: SqlRow, key: string, fallback?: T): T {
  const value = row[key];
  return (value === undefined ? fallback : value) as T;
}

function toBoolean(value: unknown) {
  return value === true || value === 1 || value === "1";
}

function toNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toDate(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return new Date(0);
}

export type PlanRecord = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  surface: number;
  bedrooms: number;
  bathrooms: number;
  floors: number;
  rooms: string;
  images: string;
  thumbnail: string;
  estimatedCost: number;
  estimatedCostImage: string;
  distributionPlans: string;
  distributionPlanUrl: string;
  featured: boolean;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type DashboardStats = {
  totalPlans: number;
  publishedPlans: number;
  featuredPlans: number;
  totalSubscribers: number;
  activeSubscribers: number;
};

function mapPlanRow(row: SqlRow): PlanRecord {
  return {
    id: String(rowValue(row, "id", "")),
    slug: String(rowValue(row, "slug", "")),
    name: String(rowValue(row, "name", "")),
    category: String(rowValue(row, "category", "villa")),
    description: String(rowValue(row, "description", "")),
    surface: toNumber(rowValue(row, "surface", 0)),
    bedrooms: toNumber(rowValue(row, "bedrooms", 0)),
    bathrooms: toNumber(rowValue(row, "bathrooms", 0)),
    floors: toNumber(rowValue(row, "floors", 1), 1),
    rooms: String(rowValue(row, "rooms", "[]")),
    images: String(rowValue(row, "images", "[]")),
    thumbnail: String(rowValue(row, "thumbnail", "")),
    estimatedCost: toNumber(rowValue(row, "estimatedCost", 0)),
    estimatedCostImage: String(rowValue(row, "estimatedCostImage", "")),
    distributionPlans: String(rowValue(row, "distributionPlans", "[]")),
    distributionPlanUrl: String(rowValue(row, "distributionPlanUrl", "")),
    featured: toBoolean(rowValue(row, "featured", false)),
    published: toBoolean(rowValue(row, "published", false)),
    createdAt: toDate(rowValue(row, "createdAt", null)),
    updatedAt: toDate(rowValue(row, "updatedAt", null)),
  };
}

async function queryRows(statement: InStatement) {
  const client = createLibsqlClient();
  if (!client) {
    throw new Error("libSQL is not configured for Edge access");
  }

  const result = await client.execute(statement);
  return result.rows as SqlRow[];
}

async function executeStatement(statement: InStatement) {
  const client = createLibsqlClient();
  if (!client) {
    throw new Error("libSQL is not configured for Edge access");
  }

  return client.execute(statement);
}

export async function listEdgePlans() {
  const rows = await queryRows(`
    SELECT *
    FROM Plan
    ORDER BY updatedAt DESC
  `);

  return rows.map(mapPlanRow);
}

export async function listRecentEdgePlans(limit = 8) {
  const rows = await queryRows({
    sql: `
      SELECT id, name, category, surface, bedrooms, bathrooms, floors, thumbnail, published, featured, estimatedCost, updatedAt
      FROM Plan
      ORDER BY updatedAt DESC
      LIMIT ?
    `,
    args: [limit],
  });

  return rows.map((row) => ({
    id: String(rowValue(row, "id", "")),
    name: String(rowValue(row, "name", "")),
    category: String(rowValue(row, "category", "villa")),
    surface: toNumber(rowValue(row, "surface", 0)),
    bedrooms: toNumber(rowValue(row, "bedrooms", 0)),
    bathrooms: toNumber(rowValue(row, "bathrooms", 0)),
    floors: toNumber(rowValue(row, "floors", 1), 1),
    thumbnail: String(rowValue(row, "thumbnail", "")),
    published: toBoolean(rowValue(row, "published", false)),
    featured: toBoolean(rowValue(row, "featured", false)),
    estimatedCost: toNumber(rowValue(row, "estimatedCost", 0)),
    updatedAt: toDate(rowValue(row, "updatedAt", null)),
  }));
}

export async function getEdgePlanById(id: string) {
  const rows = await queryRows({
    sql: `
      SELECT *
      FROM Plan
      WHERE id = ?
      LIMIT 1
    `,
    args: [id],
  });

  return rows[0] ? mapPlanRow(rows[0]) : null;
}

export async function getEdgePlanBySlug(slug: string) {
  const rows = await queryRows({
    sql: `
      SELECT *
      FROM Plan
      WHERE slug = ?
      LIMIT 1
    `,
    args: [slug],
  });

  return rows[0] ? mapPlanRow(rows[0]) : null;
}

export async function createEdgePlan(plan: Omit<PlanRecord, "createdAt" | "updatedAt">) {
  await executeStatement({
    sql: `
      INSERT INTO Plan (
        id, slug, name, category, description, surface, bedrooms, bathrooms, floors,
        rooms, images, thumbnail, estimatedCost, estimatedCostImage, distributionPlans,
        distributionPlanUrl, featured, published, createdAt, updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    args: [
      plan.id,
      plan.slug,
      plan.name,
      plan.category,
      plan.description,
      plan.surface,
      plan.bedrooms,
      plan.bathrooms,
      plan.floors,
      plan.rooms,
      plan.images,
      plan.thumbnail,
      plan.estimatedCost,
      plan.estimatedCostImage,
      plan.distributionPlans,
      plan.distributionPlanUrl,
      plan.featured ? 1 : 0,
      plan.published ? 1 : 0,
    ],
  });

  return getEdgePlanById(plan.id);
}

export async function updateEdgePlan(id: string, updates: Partial<Omit<PlanRecord, "id" | "createdAt" | "updatedAt">>) {
  const entries = Object.entries(updates).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return getEdgePlanById(id);
  }

  const assignments = entries.map(([key]) => `${key} = ?`);
  const args = entries.map(([, value]) => {
    if (typeof value === "boolean") return value ? 1 : 0;
    return value as string | number | null;
  });

  await executeStatement({
    sql: `
      UPDATE Plan
      SET ${assignments.join(", ")}, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    args: [...args, id],
  });

  return getEdgePlanById(id);
}

export async function deleteEdgePlan(id: string) {
  await executeStatement({
    sql: `DELETE FROM Plan WHERE id = ?`,
    args: [id],
  });
}

async function countScalar(
  client: LibsqlClient,
  sql: string,
  args: Array<string | number> = [],
) {
  const result = await client.execute({ sql, args });
  const row = result.rows[0] as SqlRow | undefined;
  if (!row) return 0;
  return toNumber(rowValue(row, "count", Object.values(row)[0] ?? 0));
}

export async function getEdgeDashboardStats(): Promise<DashboardStats> {
  const client = createLibsqlClient();
  if (!client) {
    throw new Error("libSQL is not configured for Edge access");
  }

  const [totalPlans, publishedPlans, featuredPlans, totalSubscribers, activeSubscribers] =
    await Promise.all([
      countScalar(client, `SELECT COUNT(*) AS count FROM Plan`),
      countScalar(client, `SELECT COUNT(*) AS count FROM Plan WHERE published = 1`),
      countScalar(client, `SELECT COUNT(*) AS count FROM Plan WHERE featured = 1`),
      countScalar(client, `SELECT COUNT(*) AS count FROM Subscriber`),
      countScalar(client, `SELECT COUNT(*) AS count FROM Subscriber WHERE isActive = 1`),
    ]);

  return {
    totalPlans,
    publishedPlans,
    featuredPlans,
    totalSubscribers,
    activeSubscribers,
  };
}
