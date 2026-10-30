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
  /** En-têtes supplémentaires (ex. List-Unsubscribe pour les emails automatiques). */
  headers?: Record<string, string>;
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
        headers: input.headers,
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

function layout(title: string, bodyHtml: string, unsubscribe?: string) {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#F5F7F9;font-family:Segoe UI,Arial,sans-serif;color:#1E2933">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:#0F5B59;padding:20px 28px;color:#fff;font-size:20px;font-weight:700">WOOPLANS</td></tr>
<tr><td style="padding:28px">
<h1 style="font-size:20px;margin:0 0 16px">${escape(title)}</h1>
${bodyHtml}
</td></tr>
<tr><td style="padding:16px 28px;background:#F5F7F9;color:#6B7280;font-size:12px">WOOPLANS · Plans de villas et duplex pour l'Afrique · <a href="${siteUrl()}" style="color:#0F5B59">wooplans.com</a>${
    unsubscribe ? `<br><a href="${unsubscribe}" style="color:#6B7280">Ne plus recevoir ces emails</a>` : ""
  }</td></tr>
</table></td></tr></table></body></html>`;
}

function button(href: string, label: string) {
  return `<p style="margin:24px 0"><a href="${href}" style="background:#F08A2E;color:#fff;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:700;display:inline-block">${escape(label)}</a></p>`;
}

type AccessEmailKind = "purchase" | "new_code" | "legacy" | "legacy_reminder";

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
  legacy_reminder: {
    subject: "Rappel : votre espace Premium WOOPLANS vous attend",
    intro: "Vous n'avez pas encore ouvert votre espace Premium WOOPLANS, où se trouve désormais le Catalogue Premium que vous avez acheté. Voici un nouveau code d'accès (il remplace le précédent) : un clic sur le bouton suffit pour entrer.",
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

/** Livraison du plan et devis d'un modèle : lien de téléchargement personnel et WhatsApp des architectes. */
export function planDevisEmail(params: { name?: string | null; planName: string; planCode: string; downloadUrl: string }) {
  const subject = `Votre plan et devis du modèle ${params.planCode}`;
  const hello = params.name ? `Bonjour ${escape(params.name)},` : "Bonjour,";
  const whatsapp = `https://wa.me/${getEnv().WHATSAPP_NUMBER}?text=${encodeURIComponent(`Bonjour WOOPLANS, j'ai téléchargé le plan et devis du modèle ${params.planCode} et je souhaite parler de mon projet.`)}`;
  const html = layout(subject, `<p>${hello}</p><p>Merci pour votre achat. Le plan et devis du modèle <strong>${escape(params.planName)}</strong> (réf. ${escape(params.planCode)}) est prêt : plan de distribution avec les dimensions, surfaces des pièces et devis détaillé.</p>
${button(params.downloadUrl, "Télécharger mon plan et devis")}
<p style="color:#6B7280;font-size:13px;margin-top:-8px">Ce lien est personnel. Le document est marqué à votre nom.</p>
<p style="margin-top:24px;font-weight:700">Des modifications à faire ?</p>
<p>Écrivez à nos architectes sur WhatsApp : une chambre en plus, un garage, la taille de votre terrain… Ils vous accompagnent jusqu'aux plans complets personnalisés, dont le prix de ce plan et devis est déduit.</p>
${button(whatsapp, "Discuter sur WhatsApp")}`);
  const text = [
    hello,
    `Merci pour votre achat. Le plan et devis du modèle ${params.planName} (réf. ${params.planCode}) est prêt.`,
    `Télécharger : ${params.downloadUrl}`,
    "Ce lien est personnel. Le document est marqué à votre nom.",
    `Des modifications à faire ? Écrivez à nos architectes sur WhatsApp : ${whatsapp}`,
    "Le prix de ce plan et devis est déduit de vos plans complets personnalisés.",
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

/* ─────────────── Relances prospects du catalogue ─────────────── */

export type ProspectEmailParams = {
  kind: "help" | "value" | "offer" | "last";
  name?: string | null;
  lastEvent: "abandoned" | "failed" | "started";
  checkoutUrl: string;
  whatsappUrl: string;
  price: string;
  planCount: number;
  discountCode?: string;
  discountLabel?: string;
  unsubscribe: string;
};

/** Les 4 emails de la séquence. Aucune fausse urgence : pas de date d'expiration inventée. */
export function prospectEmail(p: ProspectEmailParams) {
  const hello = p.name ? `Bonjour ${escape(p.name)},` : "Bonjour,";
  const helloText = p.name ? `Bonjour ${p.name},` : "Bonjour,";
  const offer = p.discountCode
    ? `<div style="margin:20px 0;padding:16px;border:2px dashed #F08A2E;border-radius:12px;text-align:center"><p style="margin:0;color:#6B7280">${escape(p.discountLabel || "Votre réduction")}</p><p style="margin:6px 0 0;font-size:26px;font-weight:800;letter-spacing:4px;color:#0F5B59">${escape(p.discountCode)}</p><p style="margin:6px 0 0;font-size:13px;color:#6B7280">À saisir dans le champ « code promo » au moment du paiement.</p></div>`
    : "";
  const offerText = p.discountCode ? `${p.discountLabel || "Réduction"} : code ${p.discountCode}, à saisir au moment du paiement.` : "";
  const help = `<p style="color:#6B7280;font-size:14px">Une question ou un souci de paiement ? <a href="${p.whatsappUrl}" style="color:#0F5B59;font-weight:600">Écrivez-nous sur WhatsApp</a>, nous répondons rapidement.</p>`;
  const benefits = [
    `${p.planCount > 0 ? `${p.planCount} modèles` : "Tous les modèles"} de villas et duplex, avec rendus 3D`,
    "Les distributions cotées de chaque niveau",
    "Le devis détaillé par lot pour estimer votre budget",
    "La fiche PDF de chaque modèle à télécharger",
    "Les nouveaux modèles ajoutés automatiquement",
  ];
  const list = `<ul style="padding-left:20px">${benefits.map((b) => `<li style="margin:0 0 6px">${escape(b)}</li>`).join("")}</ul>`;

  let subject: string;
  let body: string;
  let text: string;
  if (p.kind === "help") {
    const failed = p.lastEvent === "failed";
    subject = failed ? "Votre paiement n'a pas abouti : on vous aide" : "Votre Catalogue Premium vous attend";
    const intro = failed
      ? "Votre paiement du Catalogue Premium WOOPLANS n'a pas abouti. Cela arrive souvent avec le Mobile Money : solde insuffisant, validation non confirmée sur le téléphone ou réseau lent."
      : "Vous avez commencé à commander le Catalogue Premium WOOPLANS, mais le paiement n'a pas été finalisé.";
    const tips = failed
      ? `<p>Pour réessayer :</p><ul style="padding-left:20px"><li>vérifiez votre solde Mobile Money et gardez votre téléphone à portée pour valider ;</li><li>ou choisissez un autre moyen de paiement (autre opérateur, carte bancaire).</li></ul>`
      : "<p>Vous pouvez reprendre votre commande en un clic :</p>";
    body = `<p>${hello}</p><p>${escape(intro)}</p>${tips}${button(p.checkoutUrl, "Reprendre mon paiement")}<p>Prix : <strong>${escape(p.price)}</strong>, paiement unique, accès à vie.</p>${help}`;
    text = `${helloText}\n\n${intro}\n\nReprendre mon paiement : ${p.checkoutUrl}\n\nPrix : ${p.price}, paiement unique, accès à vie.\nWhatsApp : ${p.whatsappUrl}`;
  } else if (p.kind === "value") {
    subject = "Ce que vous débloquez avec le Catalogue Premium";
    body = `<p>${hello}</p><p>Choisir le bon plan, c'est la première étape de votre construction. Le Catalogue Premium WOOPLANS vous donne accès à :</p>${list}${button(p.checkoutUrl, "Obtenir le Catalogue Premium")}<p>Prix : <strong>${escape(p.price)}</strong>, paiement unique, accès à vie.</p>${help}`;
    text = `${helloText}\n\nLe Catalogue Premium WOOPLANS vous donne accès à :\n${benefits.map((b) => `- ${b}`).join("\n")}\n\n${p.checkoutUrl}\nPrix : ${p.price}.`;
  } else if (p.kind === "offer") {
    subject = p.discountLabel ? `Un geste pour vous : ${p.discountLabel}` : "Votre Catalogue Premium vous attend toujours";
    body = `<p>${hello}</p><p>Vous n'avez pas encore finalisé votre Catalogue Premium. Pour vous aider à faire le pas, voici un code de réduction :</p>${offer}${button(p.checkoutUrl, "Profiter de la réduction")}${list}${help}`;
    text = `${helloText}\n\nVous n'avez pas encore finalisé votre Catalogue Premium. ${offerText}\n\n${p.checkoutUrl}`;
  } else {
    subject = "Dernier rappel pour votre Catalogue Premium";
    body = `<p>${hello}</p><p>C'est notre dernier message à ce sujet. Si vous préparez la construction de votre maison, le Catalogue Premium vous fera gagner du temps pour choisir votre plan et estimer votre budget.</p>${offer}${button(p.checkoutUrl, "Obtenir le Catalogue Premium")}${help}`;
    text = `${helloText}\n\nC'est notre dernier message à ce sujet. ${offerText}\n\n${p.checkoutUrl}`;
  }
  return { subject, html: layout(subject, body, p.unsubscribe), text: `${text}\n\nNe plus recevoir ces emails : ${p.unsubscribe}` };
}

/* ─────────────── Relance du plan et devis abandonné ─────────────── */

/** Les 2 emails de la relance du plan et devis : aide au paiement, puis contenu du document. Aucune fausse urgence. */
export function planDevisRelanceEmail(p: {
  step: number;
  name?: string | null;
  lastEvent: "abandoned" | "failed";
  planName: string;
  planCode: string;
  planUrl: string;
  whatsappUrl: string;
  price: string;
  unsubscribe: string;
}) {
  const hello = p.name ? `Bonjour ${escape(p.name)},` : "Bonjour,";
  const helloText = p.name ? `Bonjour ${p.name},` : "Bonjour,";
  const model = `le modèle ${p.planName} (réf. ${p.planCode})`;
  const help = `<p style="color:#6B7280;font-size:14px">Une question ou un souci de paiement ? <a href="${p.whatsappUrl}" style="color:#0F5B59;font-weight:600">Écrivez-nous sur WhatsApp</a>, nous répondons rapidement.</p>`;
  const priceLine = `Prix : ${p.price}, déduit des plans complets de ce modèle.`;

  let subject: string;
  let body: string;
  let text: string;
  if (p.step === 0) {
    const failed = p.lastEvent === "failed";
    subject = failed ? "Votre paiement n'a pas abouti : on vous aide" : `Votre plan et devis du modèle ${p.planCode} vous attend`;
    const intro = failed
      ? `Votre paiement du plan et devis pour ${model} n'a pas abouti. Cela arrive souvent avec le Mobile Money : solde insuffisant, validation non confirmée sur le téléphone ou réseau lent.`
      : `Vous avez commencé à commander le plan et devis pour ${model}, mais le paiement n'a pas été finalisé.`;
    const tips = failed
      ? `<p>Pour réessayer :</p><ul style="padding-left:20px"><li>vérifiez votre solde Mobile Money et gardez votre téléphone à portée pour valider ;</li><li>ou choisissez un autre moyen de paiement (autre opérateur, carte bancaire).</li></ul>`
      : "<p>Vous pouvez reprendre votre commande depuis la fiche du modèle :</p>";
    body = `<p>${hello}</p><p>${escape(intro)}</p>${tips}${button(p.planUrl, "Reprendre ma commande")}<p>${escape(priceLine)}</p>${help}`;
    text = `${helloText}\n\n${intro}\n\nReprendre ma commande : ${p.planUrl}\n\n${priceLine}\nWhatsApp : ${p.whatsappUrl}`;
  } else {
    subject = `Ce que contient le plan et devis du modèle ${p.planCode}`;
    const items = [
      "Le plan de distribution avec les dimensions",
      "Les surfaces de chaque pièce",
      "Le devis détaillé pour estimer votre budget",
      "L'échange avec nos architectes sur WhatsApp pour adapter le modèle à votre terrain",
    ];
    const list = `<ul style="padding-left:20px">${items.map((b) => `<li style="margin:0 0 6px">${escape(b)}</li>`).join("")}</ul>`;
    body = `<p>${hello}</p><p>Vous vous intéressez à ${escape(model)}. Avec son plan et devis, vous recevez :</p>${list}${button(p.planUrl, "Obtenir le plan et devis")}<p>${escape(priceLine)}</p>${help}`;
    text = `${helloText}\n\nAvec le plan et devis de ${model}, vous recevez :\n${items.map((b) => `- ${b}`).join("\n")}\n\n${p.planUrl}\n${priceLine}`;
  }
  return { subject, html: layout(subject, body, p.unsubscribe), text: `${text}\n\nNe plus recevoir ces emails : ${p.unsubscribe}` };
}

/* ─────────────── Actualités mensuelles des membres ─────────────── */

export type DigestPlan = { name: string; url: string; image: string | null; details: string; budget: string | null };

export function memberDigestEmail(p: { name?: string | null; email: string; plans: DigestPlan[]; loginUrl: string; customPlansUrl: string; unsubscribe: string }) {
  const n = p.plans.length;
  const subject = n > 1 ? `${n} nouveaux modèles dans votre Catalogue Premium` : "Un nouveau modèle dans votre Catalogue Premium";
  const hello = p.name ? `Bonjour ${escape(p.name)},` : "Bonjour,";
  const cards = p.plans
    .slice(0, 6)
    .map(
      (pl) => `<tr><td style="padding:0 0 18px">
<a href="${pl.url}" style="text-decoration:none;color:#1E2933">${
        pl.image ? `<img src="${pl.image}" alt="" width="504" style="display:block;width:100%;max-width:504px;height:auto;border-radius:12px">` : ""
      }<p style="margin:10px 0 2px;font-weight:700;font-size:16px">${escape(pl.name)}</p><p style="margin:0;color:#6B7280;font-size:14px">${escape(pl.details)}${pl.budget ? ` · ${escape(pl.budget)}` : ""}</p></a></td></tr>`,
    )
    .join("");
  const more = n > 6 ? `<p style="color:#6B7280">…et ${n - 6} autre(s) dans votre espace.</p>` : "";
  const body = `<p>${hello}</p><p>${n > 1 ? `${n} nouveaux modèles ont été ajoutés` : "Un nouveau modèle a été ajouté"} à votre Catalogue Premium ce mois-ci, avec leurs distributions cotées et leur devis détaillé.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cards}</table>${more}
${button(p.loginUrl, "Voir les nouveaux modèles")}
<p style="color:#6B7280;font-size:13px">Connectez-vous avec ${escape(p.email)} et votre code d'accès. Code perdu ? Demandez-en un nouveau sur la page de connexion.</p>
<div style="margin-top:24px;padding:16px;background:#F5F7F9;border-radius:12px"><p style="margin:0;font-weight:700">Un modèle vous plaît ?</p><p style="margin:6px 0 0;font-size:14px">Nos architectes l'adaptent à votre terrain et réalisent le dossier complet, à prix fixe : 149 000 FCFA pour une villa, 249 000 FCFA pour un duplex, prix du catalogue déduit. <a href="${p.customPlansUrl}" style="color:#0F5B59;font-weight:600">En savoir plus</a></p></div>`;
  const text = `${p.name ? `Bonjour ${p.name},` : "Bonjour,"}\n\nNouveaux modèles dans votre Catalogue Premium :\n${p.plans
    .map((pl) => `- ${pl.name} (${pl.details}) : ${pl.url}`)
    .join("\n")}\n\nConnexion : ${p.loginUrl}\n\nNe plus recevoir ces emails : ${p.unsubscribe}`;
  return { subject, html: layout(subject, body, p.unsubscribe), text };
}
