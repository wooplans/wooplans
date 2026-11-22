/** Secrets définis via `wrangler secret put` (absents de wrangler.jsonc). */
interface CloudflareEnv {
  AUTH_SECRET?: string;
  CHARIOW_PULSE_SECRET?: string;
  CHARIOW_API_KEY?: string;
  /** Clé secrète Wajub (sk_test.… en essai, sk.… en production). */
  WAJUB_SECRET_KEY?: string;
  /** Secret de l'endpoint de notifications Wajub (whsec_…). */
  WAJUB_WEBHOOK_SECRET?: string;
  RESEND_API_KEY?: string;
  /** Jeton de l'API de conversion Meta (Gestionnaire d'évènements → Paramètres → API Conversions). */
  FB_ACCESS_TOKEN?: string;
  /** Optionnel : code de test du Gestionnaire d'évènements (onglet « Tester les évènements »). À retirer ensuite. */
  FB_TEST_EVENT_CODE?: string;
  MCP_TOKEN?: string;
  CRON_SECRET?: string;
  ANTHROPIC_API_KEY?: string;
  /** WhatsApp (Genuka, API officielle) : clé API (pk_live_…) et secret de signature du webhook (whsec_…). */
  GENUKA_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
  ELEVENLABS_API_KEY?: string;
  GENUKA_WEBHOOK_SECRET?: string;
  /** Connexion du numéro +237 653 76 99 98 (variable publique, wrangler.jsonc). Vide = WhatsApp désactivé. */
  GENUKA_CONNECTION_ID?: string;
  /** « manuel » : les messages de la séquence sont envoyés à la main depuis /admin/relances (pas d'envoi par l'API). */
  WHATSAPP_MODE?: string;
}

interface Window {
  fbq?: (...args: unknown[]) => void;
}
