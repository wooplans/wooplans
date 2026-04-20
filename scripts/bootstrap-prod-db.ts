import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@libsql/client";

function getDatabaseConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  if (!databaseUrl || !databaseUrl.startsWith("libsql://")) {
    throw new Error("DATABASE_URL must point to a libSQL/Turso database");
  }

  if (!authToken) {
    throw new Error("DATABASE_AUTH_TOKEN is required for production migrations");
  }

  return { databaseUrl, authToken };
}

function splitSqlStatements(sql: string) {
  const statements: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const next = sql[i + 1];

    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }

    if (!inSingle && !inDouble && char === "-" && next === "-") {
      inLineComment = true;
      i++;
      continue;
    }

    if (!inSingle && !inDouble && char === "/" && next === "*") {
      inBlockComment = true;
      i++;
      continue;
    }

    if (char === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (char === '"' && !inSingle) {
      inDouble = !inDouble;
    }

    if (char === ";" && !inSingle && !inDouble) {
      const statement = current.trim();
      if (statement) {
        statements.push(statement);
      }
      current = "";
      continue;
    }

    current += char;
  }

  const tail = current.trim();
  if (tail) {
    statements.push(tail);
  }

  return statements;
}

async function loadMigrationStatements() {
  const migrationsRoot = path.resolve(process.cwd(), "prisma", "migrations");
  const migrationDirs = (await fs.readdir(migrationsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const statements: { migration: string; sql: string }[] = [];

  for (const migrationDir of migrationDirs) {
    const migrationPath = path.join(migrationsRoot, migrationDir, "migration.sql");
    const sql = await fs.readFile(migrationPath, "utf8");
    for (const statement of splitSqlStatements(sql)) {
      statements.push({ migration: migrationDir, sql: statement });
    }
  }

  return statements;
}

async function detectAppliedMigrations(client: ReturnType<typeof createClient>) {
  const applied = new Set<string>();

  const trackingResult = await client.execute(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = '__prod_migrations'`,
  );
  if (trackingResult.rows.length > 0) {
    const tracked = await client.execute(`SELECT name FROM "__prod_migrations"`);
    for (const row of tracked.rows) {
      applied.add(String(row.name));
    }
  }

  const tablesResult = await client.execute(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('Plan', 'Subscriber', 'Admin')`,
  );

  if (tablesResult.rows.length === 3) {
    applied.add("20260417222701_init");
  }

  if (tablesResult.rows.length > 0) {
    const planColumns = await client.execute(`PRAGMA table_info("Plan")`);
    const columnNames = new Set(planColumns.rows.map((row) => String(row.name)));

    if (columnNames.has("estimatedCostImage") && columnNames.has("distributionPlans")) {
      applied.add("20260418033450_add_image_fields");
    }
  }

  return applied;
}

async function main() {
  const { databaseUrl, authToken } = getDatabaseConfig();
  const client = createClient({ url: databaseUrl, authToken });

  await client.execute(`
    CREATE TABLE IF NOT EXISTS "__prod_migrations" (
      "name" TEXT NOT NULL PRIMARY KEY,
      "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const applied = await detectAppliedMigrations(client);
  const statements = await loadMigrationStatements();
  const statementsByMigration = new Map<string, string[]>();

  for (const { migration, sql } of statements) {
    const bucket = statementsByMigration.get(migration) || [];
    bucket.push(sql);
    statementsByMigration.set(migration, bucket);
  }

  for (const [migration, migrationStatements] of Array.from(statementsByMigration.entries())) {
    if (applied.has(migration)) {
      console.log(`Skipping already applied migration ${migration}`);
      continue;
    }

    for (const sql of migrationStatements) {
      await client.execute(sql);
      console.log(`Applied statement from ${migration}`);
    }

    await client.execute({
      sql: `INSERT INTO "__prod_migrations" ("name") VALUES (?)`,
      args: [migration],
    });
  }

  await client.close();
  console.log("Production migrations applied successfully");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
