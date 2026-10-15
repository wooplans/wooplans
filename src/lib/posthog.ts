import { POSTHOG_DEFAULT_HOST, buildBatch, type ServerEvent } from "@/lib/behavior";
import { getEnv, runInBackground } from "@/lib/env";

/** Envoie des événements serveur à PostHog en tâche de fond (sans effet si POSTHOG_KEY est vide). */
export function captureServerEvents(events: ServerEvent[]) {
  const env = getEnv();
  const key = env.POSTHOG_KEY;
  if (!key || !events.length) return;
  const host = (env.POSTHOG_HOST || POSTHOG_DEFAULT_HOST).replace(/\/$/, "");
  runInBackground(
    fetch(`${host}/batch/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildBatch(key, events)),
    }).then((res) => {
      if (!res.ok) console.error(`PostHog : ${res.status}`);
    }),
  );
}
