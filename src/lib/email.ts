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

type AccessEmailKind = "purchase" | "new_code" | "legacy";

const ACCESS_EMAIL: Record<AccessEmailKind, { subject: string; intro: string }> = {
  purchase: {
    subject: "Votre accès au Catalogue Premium WOOPLANS",
    intro: "Merci pour votre achat ! Votre Catalogue Premium est prêt : tout se passe dans votre espace Premium en ligne.",
  },
  new_code: {
    subject: "Votre nouveau code d'accès WOOPLANS Premium",
    intro: "Voici votre nouveau code d'accès à l'espace Premium. L'ancien code ne fonctionne plus.",
  },
  legacy: {
    subject: "Nouveau : votre Catalogue Premium WOOPLANS est en ligne",
    intro: "Vous avez acheté le Catalogue Premium WOOPLANS : il est désormais en ligne, dans un espace Premium qui vous est réservé. Voici vos accès personnels.",
  },
};

const PREMIUM_FEATURES = [
  "Tous les modèles de villas et duplex, avec rendus 3D, distributions cotées et devis détaillé par lot",
  "La fiche PDF de chaque modèle, à télécharger une par une : bouton « Fiche PDF » sur la page du modèle, ou rubrique « Téléchargements »",
  "Vos favoris et le comparateur de modèles",
  "Les nouveaux modèles, ajoutés automatiquement",
];

/**
 * Email des accès Premium. Le bouton ouvre la page de connexion déjà remplie :
 * email dans l'adresse, code dans le fragment (#code=…), qui n'est jamais envoyé au serveur.
 */
export function accessCodeEmail(params: { name?: string | null; email: string; code: string; kind?: AccessEmailKind }) {
  const { subject, intro } = ACCESS_EMAIL[params.kind ?? "purchase"];
  const hello = params.name ? `Bonjour ${escape(params.name)},` : "Bonjour,";
  const loginUrl = siteUrl(`/connexion?email=${encodeURIComponent(params.email)}#code=${encodeURIComponent(params.code)}`);
  const features = PREMIUM_FEATURES.map((f) => `<li style="margin:0 0 6px">${escape(f)}</li>`).join("");
  const html = layout(subject, `<p>${hello}</p><p>${escape(intro)}</p>
${button(loginUrl, "Ouvrir mon espace Premium")}
<p style="color:#6B7280;font-size:13px;margin-top:-8px">Le bouton ouvre la page de connexion avec vos identifiants déjà remplis : il suffit d'appuyer sur « Se connecter ».</p>
<p style="margin:20px 0 6px;color:#6B7280">Votre identifiant</p><p style="margin:0;font-weight:700">${escape(params.email)}</p>
<p style="margin:16px 0 6px;color:#6B7280">Votre code d'accès</p>
<p style="margin:0;font-size:28px;letter-spacing:6px;font-weight:800;color:#0F5B59">${escape(params.code)}</p>
<p style="margin:24px 0 8px;font-weight:700">Dans votre espace Premium</p>
<ul style="margin:0;padding-left:20px">${features}</ul>
<p style="color:#6B7280;font-size:13px;margin-top:24px">Ce code est personnel, gardez-le pour vous. Perdu ? Demandez-en un nouveau depuis la page de connexion.</p>`);
  const text = [
    `${hello}`,
    intro,
    `Ouvrir mon espace Premium (identifiants déjà remplis) : ${loginUrl}`,
    `Identifiant : ${params.email}\nCode d'accès : ${params.code}`,
    `Dans votre espace Premium :\n${PREMIUM_FEATURES.map((f) => `- ${f}`).join("\n")}`,
    "Ce code est personnel. Perdu ? Demandez-en un nouveau depuis la page de connexion.",
  ].join("\n\n");
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
