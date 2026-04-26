import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getOptionalRequestContext } from "@cloudflare/next-on-pages";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

type D1Binding = ConstructorParameters<typeof PrismaD1>[0];

type CloudflareEnv = {
  DB?: D1Binding;
};

function getD1Binding() {
  try {
    const requestContext = getOptionalRequestContext();
    const env = requestContext?.env as CloudflareEnv | undefined;
    return env?.DB;
  } catch {
    return undefined;
  }
}

function getLocalPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }

  return globalForPrisma.prisma;
}

export function getPrisma() {
  const d1 = getD1Binding();

  if (d1) {
    const adapter = new PrismaD1(d1);
    return new PrismaClient({ adapter });
  }

  return getLocalPrismaClient();
}
