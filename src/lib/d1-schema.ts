import { getOptionalRequestContext } from "@cloudflare/next-on-pages";

type CloudflareEnv = {
  DB?: D1Database;
};

const globalForD1 = globalThis as unknown as {
  d1SchemaReady?: Promise<void>;
};

function getD1Database() {
  try {
    const requestContext = getOptionalRequestContext();
    const env = requestContext?.env as CloudflareEnv | undefined;
    return env?.DB ?? null;
  } catch {
    return null;
  }
}

async function hasTable(db: D1Database, tableName: string) {
  const result = await db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .bind(tableName)
    .all<{ name?: string }>();

  return (result.results?.length ?? 0) > 0;
}

async function hasColumn(db: D1Database, tableName: string, columnName: string) {
  const result = await db.prepare(`PRAGMA table_info("${tableName}")`).all<{ name?: string }>();
  return ((result.results ?? []) as Array<{ name?: string }>).some((row) => row.name === columnName);
}

async function addColumnIfMissing(
  db: D1Database,
  tableName: string,
  columnName: string,
  definition: string,
) {
  if (await hasColumn(db, tableName, columnName)) {
    return;
  }

  await db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${definition};`);
}

export async function ensureD1Schema() {
  if (!globalForD1.d1SchemaReady) {
    globalForD1.d1SchemaReady = (async () => {
      const db = getD1Database();
      if (!db) {
        return;
      }

      if (!(await hasTable(db, "Plan"))) {
        await db.exec(
          `CREATE TABLE IF NOT EXISTS Plan (id TEXT NOT NULL PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL, surface INTEGER NOT NULL, bedrooms INTEGER NOT NULL, bathrooms INTEGER NOT NULL, floors INTEGER NOT NULL, rooms TEXT NOT NULL, images TEXT NOT NULL, thumbnail TEXT NOT NULL, estimatedCost INTEGER NOT NULL DEFAULT 0, estimatedCostImage TEXT NOT NULL DEFAULT '', distributionPlans TEXT NOT NULL DEFAULT '[]', distributionPlanUrl TEXT NOT NULL DEFAULT '', featured INTEGER NOT NULL DEFAULT 0, cataloguePreview INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 0, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL);`,
        );
      }

      if (!(await hasTable(db, "Subscriber"))) {
        await db.exec(
          `CREATE TABLE IF NOT EXISTS Subscriber (id TEXT NOT NULL PRIMARY KEY, email TEXT NOT NULL UNIQUE, chariowCustomerId TEXT, chariowLicenseKey TEXT, premiumCode TEXT, isActive INTEGER NOT NULL DEFAULT 0, expiresAt DATETIME, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
        );
      }

      if (!(await hasTable(db, "Admin"))) {
        await db.exec(
          `CREATE TABLE IF NOT EXISTS Admin (id TEXT NOT NULL PRIMARY KEY, email TEXT NOT NULL UNIQUE, passwordHash TEXT NOT NULL);`,
        );
      }

      if (!(await hasTable(db, "CostRate"))) {
        await db.exec(
          `CREATE TABLE IF NOT EXISTS CostRate (id TEXT NOT NULL PRIMARY KEY, category TEXT NOT NULL, region TEXT NOT NULL DEFAULT 'default', amountPerSquareMeter INTEGER NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL);`,
        );
      }

      if (!(await hasTable(db, "FunnelSession"))) {
        await db.exec(
          `CREATE TABLE IF NOT EXISTS FunnelSession (id TEXT NOT NULL PRIMARY KEY, source TEXT NOT NULL, landingPath TEXT NOT NULL, referrer TEXT, utmSource TEXT, utmMedium TEXT, utmCampaign TEXT, utmContent TEXT, utmTerm TEXT, fbclidPresent INTEGER NOT NULL DEFAULT 0, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL);`,
        );
      }

      if (!(await hasTable(db, "FunnelEvent"))) {
        await db.exec(
          `CREATE TABLE IF NOT EXISTS FunnelEvent (id TEXT NOT NULL PRIMARY KEY, sessionId TEXT NOT NULL, type TEXT NOT NULL, path TEXT NOT NULL, ctaId TEXT, metadataJson TEXT NOT NULL DEFAULT '{}', createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (sessionId) REFERENCES FunnelSession(id) ON DELETE CASCADE);`,
        );
      }

      if (!(await hasTable(db, "FunnelSale"))) {
        await db.exec(
          `CREATE TABLE IF NOT EXISTS FunnelSale (id TEXT NOT NULL PRIMARY KEY, sessionId TEXT, chariowSaleId TEXT NOT NULL UNIQUE, productId TEXT NOT NULL, productName TEXT NOT NULL, amount INTEGER NOT NULL, currency TEXT NOT NULL, status TEXT NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (sessionId) REFERENCES FunnelSession(id) ON DELETE SET NULL);`,
        );
      }

      await db.exec(`CREATE INDEX IF NOT EXISTS Plan_category_idx ON Plan(category);`);
      await db.exec(`CREATE INDEX IF NOT EXISTS Plan_featured_idx ON Plan(featured);`);
      await db.exec(`CREATE INDEX IF NOT EXISTS Plan_published_idx ON Plan(published);`);
      await db.exec(`CREATE INDEX IF NOT EXISTS Subscriber_email_idx ON Subscriber(email);`);
      await db.exec(`CREATE INDEX IF NOT EXISTS Subscriber_isActive_idx ON Subscriber(isActive);`);
      await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS CostRate_category_region_key ON CostRate(category, region);`);
      await db.exec(`CREATE INDEX IF NOT EXISTS CostRate_category_idx ON CostRate(category);`);
      await db.exec(`CREATE INDEX IF NOT EXISTS CostRate_region_idx ON CostRate(region);`);
      await db.exec(`CREATE INDEX IF NOT EXISTS FunnelSession_source_idx ON FunnelSession(source);`);
      await db.exec(`CREATE INDEX IF NOT EXISTS FunnelSession_landingPath_idx ON FunnelSession(landingPath);`);
      await db.exec(`CREATE INDEX IF NOT EXISTS FunnelSession_createdAt_idx ON FunnelSession(createdAt);`);
      await db.exec(`CREATE INDEX IF NOT EXISTS FunnelEvent_sessionId_idx ON FunnelEvent(sessionId);`);
      await db.exec(`CREATE INDEX IF NOT EXISTS FunnelEvent_type_idx ON FunnelEvent(type);`);
      await db.exec(`CREATE INDEX IF NOT EXISTS FunnelEvent_path_idx ON FunnelEvent(path);`);
      await db.exec(`CREATE INDEX IF NOT EXISTS FunnelEvent_ctaId_idx ON FunnelEvent(ctaId);`);
      await db.exec(`CREATE INDEX IF NOT EXISTS FunnelEvent_createdAt_idx ON FunnelEvent(createdAt);`);
      await db.exec(`CREATE INDEX IF NOT EXISTS FunnelSale_sessionId_idx ON FunnelSale(sessionId);`);
      await db.exec(`CREATE INDEX IF NOT EXISTS FunnelSale_chariowSaleId_idx ON FunnelSale(chariowSaleId);`);
      await db.exec(`CREATE INDEX IF NOT EXISTS FunnelSale_status_idx ON FunnelSale(status);`);
      await db.exec(`CREATE INDEX IF NOT EXISTS FunnelSale_createdAt_idx ON FunnelSale(createdAt);`);
      await db.exec(
        `INSERT OR IGNORE INTO CostRate (id, category, region, amountPerSquareMeter, createdAt, updatedAt) VALUES ('default-villa', 'villa', 'default', 150000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), ('default-duplex', 'duplex', 'default', 180000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
      );

      await addColumnIfMissing(db, "Plan", "estimatedCostImage", `"estimatedCostImage" TEXT NOT NULL DEFAULT ''`);
      await addColumnIfMissing(db, "Plan", "distributionPlans", `"distributionPlans" TEXT NOT NULL DEFAULT '[]'`);
      await addColumnIfMissing(db, "Plan", "cataloguePreview", `"cataloguePreview" INTEGER NOT NULL DEFAULT 0`);
      await addColumnIfMissing(db, "Subscriber", "premiumCode", `"premiumCode" TEXT`);
      await addColumnIfMissing(db, "FunnelSession", "utmSource", `"utmSource" TEXT`);
      await addColumnIfMissing(db, "FunnelSession", "utmMedium", `"utmMedium" TEXT`);
      await addColumnIfMissing(db, "FunnelSession", "utmCampaign", `"utmCampaign" TEXT`);
      await addColumnIfMissing(db, "FunnelSession", "utmContent", `"utmContent" TEXT`);
      await addColumnIfMissing(db, "FunnelSession", "utmTerm", `"utmTerm" TEXT`);
      await addColumnIfMissing(db, "FunnelEvent", "metadataJson", `"metadataJson" TEXT NOT NULL DEFAULT '{}'`);
      await db.exec(`CREATE INDEX IF NOT EXISTS Plan_cataloguePreview_idx ON Plan(cataloguePreview);`);
    })();
  }

  return globalForD1.d1SchemaReady;
}
