import { BehaviorAnalytics } from "@/components/BehaviorAnalytics";
import { POSTHOG_DEFAULT_HOST } from "@/lib/behavior";

/**
 * Mesure du site public : Pixel Meta et PostHog (identifiants dans wrangler.jsonc).
 * Rendu uniquement dans la mise en page du site public : jamais sur /admin, /espace-premium ni /televersement ;
 * /connexion et /merci sont exclus côté navigateur (voir isPrivatePath).
 */
export function Analytics() {
  return (
    <BehaviorAnalytics
      posthogKey={process.env.POSTHOG_KEY || undefined}
      posthogHost={process.env.POSTHOG_HOST || POSTHOG_DEFAULT_HOST}
      pixelId={process.env.FB_PIXEL_ID || undefined}
    />
  );
}
