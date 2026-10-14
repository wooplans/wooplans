/**
 * Point d'entrée du Worker : l'application Next (OpenNext) + la tâche planifiée quotidienne.
 * Le cron appelle /api/cron en interne, protégé par CRON_SECRET.
 */
// @ts-expect-error — généré par `opennextjs-cloudflare build`
import nextWorker from "./.open-next/worker.js";

export default {
  fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext) {
    // Domaine nu → www (une seule adresse canonique pour le SEO)
    const url = new URL(request.url);
    if (url.hostname === "wooplans.com") {
      url.hostname = "www.wooplans.com";
      return Response.redirect(url.toString(), 301);
    }
    return nextWorker.fetch(request, env, ctx);
  },
  async scheduled(_event: ScheduledController, env: CloudflareEnv, ctx: ExecutionContext) {
    if (!env.CRON_SECRET) return;
    const request = new Request(`${env.SITE_URL}/api/cron`, {
      method: "POST",
      headers: { "x-cron-secret": env.CRON_SECRET },
    });
    ctx.waitUntil(nextWorker.fetch(request, env, ctx));
  },
} satisfies ExportedHandler<CloudflareEnv>;

// Durable Objects et classes exportées par OpenNext (cache, file d'attente) le cas échéant.
// @ts-expect-error — généré par `opennextjs-cloudflare build`
export * from "./.open-next/worker.js";
