/**
 * Point d'entrée du Worker : l'application Next (OpenNext) + la tâche planifiée quotidienne.
 * Le cron appelle /api/cron en interne, protégé par CRON_SECRET.
 */
// @ts-expect-error — généré par `opennextjs-cloudflare build`
import nextWorker from "./.open-next/worker.js";
import { isCacheablePageRequest, isCacheablePageResponse, PAGE_CACHE_TTL_SECONDS, pageCacheKey } from "./src/lib/page-cache";

export default {
  async fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext) {
    // Domaine nu → www (une seule adresse canonique pour le SEO)
    const url = new URL(request.url);
    // (sauf /api/* : une 301 transformerait les POST en GET — MCP, webhooks)
    if (url.hostname === "wooplans.com" && !url.pathname.startsWith("/api/")) {
      url.hostname = "www.wooplans.com";
      return Response.redirect(url.toString(), 301);
    }
    // Images publiques (immuables) : servies depuis le cache Cloudflare, sans repasser par Next ni D1.
    if (request.method === "GET" && url.pathname.startsWith("/media/") && !request.headers.has("range")) {
      const cache = (caches as unknown as { default: Cache }).default;
      const hit = await cache.match(request);
      if (hit) return hit;
      const response = await nextWorker.fetch(request, env, ctx);
      if (response.status === 200) ctx.waitUntil(cache.put(request, response.clone()));
      return response;
    }
    // Pages publiques (accueil, catalogue, fiches) : copie de 5 min par centre de données Cloudflare.
    if (isCacheablePageRequest(request.method, url, request.headers)) {
      const cache = (caches as unknown as { default: Cache }).default;
      const key = new Request(pageCacheKey(url));
      const hit = await cache.match(key);
      if (hit) {
        const response = new Response(hit.body, hit);
        response.headers.set("Cache-Control", "private, no-cache");
        response.headers.set("X-Page-Cache", "HIT");
        return response;
      }
      const response = await nextWorker.fetch(request, env, ctx);
      if (isCacheablePageResponse(response.status, response.headers)) {
        const copy = new Response(response.clone().body, response);
        copy.headers.set("Cache-Control", `public, max-age=${PAGE_CACHE_TTL_SECONDS}`);
        copy.headers.delete("Vary");
        ctx.waitUntil(cache.put(key, copy));
      }
      return response;
    }
    return nextWorker.fetch(request, env, ctx);
  },
  async scheduled(event: ScheduledController, env: CloudflareEnv, ctx: ExecutionContext) {
    if (!env.CRON_SECRET) return;
    // « 0 6 * * * » : récapitulatif quotidien ; les autres déclenchements (toutes les 15 min) : relances prospects.
    const path = event.cron === "0 6 * * *" ? "/api/cron" : "/api/cron/relances";
    const request = new Request(`${env.SITE_URL}${path}`, {
      method: "POST",
      headers: { "x-cron-secret": env.CRON_SECRET },
    });
    ctx.waitUntil(nextWorker.fetch(request, env, ctx));
  },
} satisfies ExportedHandler<CloudflareEnv>;

// Durable Objects et classes exportées par OpenNext (cache, file d'attente) le cas échéant.
// @ts-expect-error — généré par `opennextjs-cloudflare build`
export * from "./.open-next/worker.js";
