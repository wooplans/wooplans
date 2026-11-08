import { getCurrentAdmin } from "@/lib/auth";
import { upsellCampaignEmail } from "@/lib/email";
import { upsellCampaignRecipients } from "@/lib/upsell-campaign";
import { buildUpsellEmail } from "@/lib/upsell-server";
import { siteUrl } from "@/lib/env";

/** Aperçu de l'email de l'offre aux clients, tel que le recevra le prochain client de la liste. */
export async function GET() {
  if (!(await getCurrentAdmin())) return new Response("Non autorisé.", { status: 401 });
  const { pending } = await upsellCampaignRecipients();
  const r = pending[0] ?? { name: "Kouame", planSlug: "", planCode: "V4-001", country: "CM" };
  const upsell = r.planSlug ? await buildUpsellEmail({ planSlug: r.planSlug, paidAt: new Date(), country: r.country }) : null;
  if (!upsell) return new Response("Aucun client à qui envoyer l'offre pour l'instant.", { status: 404 });
  const mail = upsellCampaignEmail({ name: (r.name || "").split(/\s+/)[0] || null, planCode: r.planCode, upsell, unsubscribe: siteUrl("/desinscription") });
  return new Response(`<p style="font-family:Arial;padding:8px;background:#FFF7EF"><strong>Objet :</strong> ${mail.subject}</p>${mail.html}`, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
