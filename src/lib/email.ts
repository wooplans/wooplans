import { getDb, schema } from "@/db";
import { randomId } from "@/lib/crypto";
import { getEnv, siteUrl } from "@/lib/env";

type SendInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  template: string;
  memberId?: string | null;
  leadId?: string | null;
  replyTo?: string;
};

export async function sendEmail(input: SendInput) {
  const env = getEnv();
  const log = (status: "sent" | "failed" | "skipped", providerId?: string, error?: string) =>
    getDb()
      .insert(schema.emailLog)
      .values({
        id: randomId(),
        to: input.to,
        template: input.template,
        subject: input.subject,
        status,
        providerId: providerId ?? null,
        error: error ?? null,
        memberId: input.memberId ?? null,
        leadId: input.leadId ?? null,
      })
      .catch((e) => console.error("email_log insert failed", e));

  if (!env.RESEND_API_KEY) {
    console.warn(`RESEND_API_KEY absent : email "${input.template}" non envoyé à ${input.to}`);
    await log("skipped", undefined, "RESEND_API_KEY absent");
    return { ok: false as const, error: "RESEND_API_KEY absent" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: input.replyTo ?? (env.EMAIL_REPLY_TO || undefined),
      }),
    });
    const data = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!response.ok) {
      await log("failed", undefined, data.message || `HTTP ${response.status}`);
      return { ok: false as const, error: data.message || `HTTP ${response.status}` };
    }
    await log("sent", data.id);
    return { ok: true as const, id: data.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await log("failed", undefined, message);
    return { ok: false as const, error: message };
  }
}

/* ─────────────── Gabarits ─────────────── */

const escape = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, bodyHtml: string) {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#F5F7F9;font-family:Segoe UI,Arial,sans-serif;color:#1E2933">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:#0F5B59;padding:20px 28px;color:#fff;font-size:20px;font-weight:700">WOOPLANS</td></tr>
<tr><td style="padding:28px">
<h1 style="font-size:20px;margin:0 0 16px">${escape(title)}</h1>
${bodyHtml}
</td></tr>
<tr><td style="padding:16px 28px;background:#F5F7F9;color:#6B7280;font-size:12px">WOOPLANS · Plans de villas et duplex pour l'Afrique · <a href="${siteUrl()}" style="color:#0F5B59">wooplans.com</a></td></tr>
</table></td></tr></table></body></html>`;
}

function button(href: string, label: string) {
  return `<p style="margin:24px 0"><a href="${href}" style="background:#F08A2E;color:#fff;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:700;display:inline-block">${escape(label)}</a></p>`;
}

/** Phrase d'accueil de l'email d'accès (réutilisée par l'import des anciens acheteurs). */
export const ACCESS_EMAIL_INTRO =
  "Merci pour votre achat ! Votre Catalogue Premium est prêt : connectez-vous à votre espace Premium pour consulter tous les modèles, les comparer et télécharger la fiche PDF de chacun (rendus, distributions cotées, devis). Les nouveaux modèles y sont ajoutés automatiquement.";

export function accessCodeEmail(params: { name?: string | null; email: string; code: string; isNewCode?: boolean }) {
  const hello = params.name ? `Bonjour ${escape(params.name)},` : "Bonjour,";
  const loginUrl = siteUrl(`/connexion?email=${encodeURIComponent(params.email)}`);
  const subject = params.isNewCode
    ? "Votre nouveau code d'accès WOOPLANS Premium"
    : "Votre accès au Catalogue Premium WOOPLANS";
  const intro = params.isNewCode
    ? "Voici votre nouveau code d'accès. L'ancien code ne fonctionne plus."
    : ACCESS_EMAIL_INTRO;
  const html = layout(subject, `<p>${hello}</p><p>${intro}</p>
<p style="margin:20px 0 6px;color:#6B7280">Votre identifiant</p><p style="margin:0;font-weight:700">${escape(params.email)}</p>
<p style="margin:16px 0 6px;color:#6B7280">Votre code d'accès</p>
<p style="margin:0;font-size:28px;letter-spacing:4px;font-weight:800;color:#0F5B59">${escape(params.code)}</p>
${button(loginUrl, "Accéder à mon espace Premium")}
<p style="color:#6B7280;font-size:13px">Gardez ce code pour vous : il est personnel. Si vous le perdez, demandez-en un nouveau depuis la page de connexion.</p>`);
  const text = `${hello}\n\n${intro}\n\nIdentifiant : ${params.email}\nCode d'accès : ${params.code}\n\nConnexion : ${loginUrl}`;
  return { subject, html, text };
}

export function adminSaleEmail(params: { email: string; name?: string | null; amount: number; product: string }) {
  const subject = `Nouvelle vente : ${params.product} (${params.amount.toLocaleString("fr-FR")} FCFA)`;
  const html = layout(subject, `<p>${escape(params.name || "Client")} — ${escape(params.email)}</p>${button(siteUrl("/admin/ventes"), "Voir les ventes")}`);
  return { subject, html, text: `${subject}\n${params.name || ""} ${params.email}` };
}

export function leadFollowUpEmail(params: { name: string; subject: string; message: string }) {
  const paragraphs = params.message
    .split(/\n{2,}/)
    .map((p) => `<p>${escape(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const whatsapp = `https://wa.me/${getEnv().WHATSAPP_NUMBER}`;
  const html = layout(params.subject, `<p>Bonjour ${escape(params.name)},</p>${paragraphs}${button(whatsapp, "Répondre sur WhatsApp")}`);
  return { subject: params.subject, html, text: `Bonjour ${params.name},\n\n${params.message}\n\nWhatsApp : ${whatsapp}` };
}
