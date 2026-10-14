import { getOptionalRequestContext } from "@cloudflare/next-on-pages";
export function serverEnv(name: string): string | undefined {
  try {
    const env = getOptionalRequestContext()?.env as
      | Record<string, unknown>
      | undefined;
    if (typeof env?.[name] === "string") return env[name] as string;
  } catch {
    /* Local Node runtime. */
  }
  return process.env[name];
}
