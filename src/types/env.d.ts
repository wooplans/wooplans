/** Secrets définis via `wrangler secret put` (absents de wrangler.jsonc). */
interface CloudflareEnv {
  AUTH_SECRET?: string;
  CHARIOW_PULSE_SECRET?: string;
  CHARIOW_API_KEY?: string;
  RESEND_API_KEY?: string;
  FB_ACCESS_TOKEN?: string;
  MCP_TOKEN?: string;
  CRON_SECRET?: string;
  ANTHROPIC_API_KEY?: string;
}

interface Window {
  fbq?: (...args: unknown[]) => void;
  clarity?: (...args: unknown[]) => void;
}
