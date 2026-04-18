import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prisma: PrismaClient;

if (process.env.DATABASE_URL && process.env.DATABASE_AUTH_TOKEN) {
  const adapter = new PrismaLibSql({
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
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
