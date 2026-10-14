import { build } from "esbuild";
import { PrismaClient } from "@prisma/client";
import { readdir, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
const path = resolve("tests/.platform-test.db");
await rm(path, { force: true });
process.env.DATABASE_URL = `file:${path}`;
const db = new PrismaClient();
try {
  for (const name of (await readdir("prisma/migrations")).sort()) {
    if (name === "migration_lock.toml") continue;
    const sql = await readFile(
      `prisma/migrations/${name}/migration.sql`,
      "utf8",
    );
    for (const statement of sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean))
      await db.$executeRawUnsafe(statement);
  }
} finally {
  await db.$disconnect();
}
await build({
  entryPoints: ["tests/platform.test.mts"],
  bundle: true,
  jsx: "automatic",
  platform: "node",
  format: "cjs",
  packages: "external",
  alias: {
    "@cloudflare/next-on-pages":
      "./node_modules/@cloudflare/next-on-pages/dist/api/index.js",
    "server-only": "./tests/server-only-shim.ts",
    "next/headers": "./tests/headers-shim.ts",
  },
  outfile: "tests/.platform-test.cjs",
});
const result = spawnSync(
  process.execPath,
  ["--test", "tests/.platform-test.cjs"],
  { stdio: "inherit", env: process.env },
);
await rm(path, { force: true });
await rm("tests/.platform-test.cjs", { force: true });
process.exit(result.status ?? 1);
