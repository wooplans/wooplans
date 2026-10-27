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
  FB_ACCESS_TOKEN?: string;
  MCP_TOKEN?: string;
  CRON_SECRET?: string;
  ANTHROPIC_API_KEY?: string;
}

interface Window {
  fbq?: (...args: unknown[]) => void;
}
