import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql/web";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prisma: PrismaClient;
const databaseUrl = process.env.DATABASE_URL;
const usesLibsql = Boolean(databaseUrl && databaseUrl.startsWith("libsql://"));

if (usesLibsql) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for libSQL/Turso connections");
  }

  const databaseAuthToken = process.env.DATABASE_AUTH_TOKEN;
  if (!databaseAuthToken) {
    throw new Error("DATABASE_AUTH_TOKEN is required for libSQL/Turso connections");
  }

  const adapter = new PrismaLibSql({
    url: databaseUrl,
    authToken: databaseAuthToken,
  });
  prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
} else {
  prisma = globalForPrisma.prisma ?? new PrismaClient();
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export const prismaClient = prisma;
export { prisma };
