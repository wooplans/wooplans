import { recordWhatsappClick } from "@/lib/pipeline";
import { siteUrl } from "@/lib/env";

/**
 * Lien des boutons WhatsApp : /r/<prospect>.<étape> (j1, j3, ou c<campagne>). Enregistre le clic dans le pipeline
 * puis renvoie vers la page du Catalogue Premium avec le suivi UTM. Un lien inconnu mène quand même au catalogue.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [id, step = "wa"] = decodeURIComponent(token).slice(0, 80).split(".");
  const campaign = /^[a-z0-9_-]{1,30}$/i.test(step) ? step : "wa";
  if (id) await recordWhatsappClick(id).catch((error) => console.error("Clic WhatsApp non enregistré", error));
  const target = siteUrl(`/catalogue-premium?utm_source=whatsapp&utm_medium=sequence&utm_campaign=guide_${campaign}`);
  return new Response(null, { status: 302, headers: { Location: target, "Cache-Control": "no-store" } });
}
