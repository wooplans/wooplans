import { drizzle } from "drizzle-orm/d1";
import { getEnv, getEnvAsync } from "@/lib/env";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

export function getDb(): Db {
  return drizzle(getEnv().DB, { schema });
}

export async function getDbAsync(): Promise<Db> {
  return drizzle((await getEnvAsync()).DB, { schema });
}

export { schema };
