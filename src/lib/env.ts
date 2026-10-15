import { getCloudflareContext } from "@opennextjs/cloudflare";

export function getEnv(): CloudflareEnv {
  return getCloudflareContext().env as CloudflareEnv;
}

/** Variante asynchrone utilisable pendant le rendu statique (SSG). */
export async function getEnvAsync(): Promise<CloudflareEnv> {
  const ctx = await getCloudflareContext({ async: true });
  return ctx.env as CloudflareEnv;
}

export function siteUrl(path = "") {
  const base = (process.env.SITE_URL || "https://www.wooplans.com").replace(/\/$/, "");
  return `${base}${path}`;
}

export function requireSecret(name: keyof CloudflareEnv): string {
  const value = getEnv()[name];
  if (typeof value !== "string" || !value) {
    throw new Error(`Secret manquant : ${String(name)}`);
  }
  return value;
}

/** Waits for background work without blocking the response. */
export function runInBackground(promise: Promise<unknown>) {
  try {
    getCloudflareContext().ctx.waitUntil(promise.catch((error) => console.error(error)));
  } catch {
    void promise.catch((error) => console.error(error));
  }
}
