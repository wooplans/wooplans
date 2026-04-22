import { getOptionalRequestContext } from "@cloudflare/next-on-pages";

type CloudflareEnv = {
  DB?: D1Database;
};

const globalForD1 = globalThis as unknown as {
  d1SchemaReady?: Promise<void>;
};

function getD1Database() {
  const requestContext = getOptionalRequestContext();
  const env = requestContext?.env as CloudflareEnv | undefined;
  return env?.DB ?? null;
}

async function getTableColumns(db: D1Database, tableName: string) {
  const result = await db.prepare(`PRAGMA table_info("${tableName}")`).all<{
    name?: string;
  }>();

  const rows = (result.results ?? []) as Array<{ name?: string }>;
  return new Set(rows.map((row) => row.name).filter((name): name is string => Boolean(name)));
}

async function ensureColumns(
  db: D1Database,
  tableName: string,
  columns: Array<{ name: string; definition: string }>,
) {
  const existing = await getTableColumns(db, tableName);

  for (const column of columns) {
    if (existing.has(column.name)) {
      continue;
    }

    await db.exec(`ALTER TABLE "${tableName}" ADD COLUMN ${column.definition}`);
  }
}

export async function ensureD1Schema() {
  if (!globalForD1.d1SchemaReady) {
    globalForD1.d1SchemaReady = (async () => {
      const db = getD1Database();
      if (!db) {
        return;
      }

      await db.exec(`
        CREATE TABLE IF NOT EXISTS "Plan" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "slug" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "category" TEXT NOT NULL,
          "description" TEXT NOT NULL,
          "surface" INTEGER NOT NULL,
          "bedrooms" INTEGER NOT NULL,
          "bathrooms" INTEGER NOT NULL,
          "floors" INTEGER NOT NULL,
          "rooms" TEXT NOT NULL,
          "images" TEXT NOT NULL,
          "thumbnail" TEXT NOT NULL,
          "estimatedCost" INTEGER NOT NULL DEFAULT 0,
          "estimatedCostImage" TEXT NOT NULL DEFAULT '',
          "distributionPlans" TEXT NOT NULL DEFAULT '[]',
          "distributionPlanUrl" TEXT NOT NULL DEFAULT '',
          "featured" BOOLEAN NOT NULL DEFAULT false,
          "published" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
        );

        CREATE TABLE IF NOT EXISTS "Subscriber" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "email" TEXT NOT NULL,
          "chariowCustomerId" TEXT,
          "chariowLicenseKey" TEXT,
          "premiumCode" TEXT,
          "isActive" BOOLEAN NOT NULL DEFAULT false,
          "expiresAt" DATETIME,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS "Admin" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "email" TEXT NOT NULL,
          "passwordHash" TEXT NOT NULL
        );

        CREATE UNIQUE INDEX IF NOT EXISTS "Plan_slug_key" ON "Plan"("slug");
        CREATE INDEX IF NOT EXISTS "Plan_category_idx" ON "Plan"("category");
        CREATE INDEX IF NOT EXISTS "Plan_featured_idx" ON "Plan"("featured");
        CREATE INDEX IF NOT EXISTS "Plan_published_idx" ON "Plan"("published");
        CREATE UNIQUE INDEX IF NOT EXISTS "Subscriber_email_key" ON "Subscriber"("email");
        CREATE INDEX IF NOT EXISTS "Subscriber_email_idx" ON "Subscriber"("email");
        CREATE INDEX IF NOT EXISTS "Subscriber_isActive_idx" ON "Subscriber"("isActive");
        CREATE UNIQUE INDEX IF NOT EXISTS "Admin_email_key" ON "Admin"("email");
      `);

      await ensureColumns(db, "Plan", [
        { name: "estimatedCostImage", definition: '"estimatedCostImage" TEXT NOT NULL DEFAULT \'\' ' },
        { name: "distributionPlans", definition: '"distributionPlans" TEXT NOT NULL DEFAULT \'[]\' ' },
      ]);

      await ensureColumns(db, "Subscriber", [
        { name: "premiumCode", definition: '"premiumCode" TEXT' },
      ]);
    })();
  }

  return globalForD1.d1SchemaReady;
}
