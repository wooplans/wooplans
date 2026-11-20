import { getCurrentAdmin, requireAdmin } from "@/lib/auth";
import { countPublishedPlans } from "@/lib/plans";
import { projectMessage, recordManualSend, recordProjectSent, relanceItem, relanceMessage, relanceWhatsappUrl } from "@/lib/relances";

export const dynamic = "force-dynamic";

function parse(url: URL) {
  const id = url.searchParams.get("id") || "";
  const step = Number(url.searchParams.get("etape"));
  return { id, step, valid: Boolean(id) && Number.isInteger(step) && step >= 0 && step <= 2 };
}

/**
 * Bouton vert de /admin/relances : la page ouvre WhatsApp directement (lien wa.me déjà écrit dans la page) et
 * envoie en même temps ce POST, en arrière-plan, pour noter le message comme envoyé. Aucune attente pour Tao.
 * Verrou sur l'étape : un second clic ne compte pas le message deux fois.
 */
export async function POST(request: Request) {
  if (!(await getCurrentAdmin())) return Response.json({ ok: false }, { status: 401 });
  const url = new URL(request.url);
  // Formulaire « Mon projet » (phase d'accompagnement, J10).
  if (url.searchParams.get("etape") === "projet") {
    const id = url.searchParams.get("id") || "";
    if (!id) return Response.json({ ok: false }, { status: 400 });
    return Response.json({ ok: true, recorded: await recordProjectSent(id) }, { headers: { "Cache-Control": "no-store" } });
  }
  const { id, step, valid } = parse(url);
  if (!valid) return Response.json({ ok: false }, { status: 400 });
  const recorded = await recordManualSend(id, step);
  return Response.json({ ok: true, recorded }, { headers: { "Cache-Control": "no-store" } });
}

/** Ancien lien (secours, sans JavaScript) : note l'envoi puis redirige vers WhatsApp. */
export async function GET(request: Request) {
  await requireAdmin();
  const url = new URL(request.url);
  if (url.searchParams.get("etape") === "projet") {
    const pid = url.searchParams.get("id") || "";
    const p = pid ? await relanceItem(pid) : null;
    if (!p?.phone) return Response.redirect(new URL("/admin/relances", url), 303);
    await recordProjectSent(pid);
    return new Response(null, { status: 302, headers: { Location: relanceWhatsappUrl(p.phone, projectMessage({ id: pid, name: p.name })), "Cache-Control": "no-store" } });
  }
  const { id, step, valid } = parse(url);
  const [item, models] = await Promise.all([valid ? relanceItem(id) : null, countPublishedPlans()]);
  if (!item?.phone || !valid) return Response.redirect(new URL("/admin/relances", url), 303);
  const civ = url.searchParams.get("civ");
  const civilite = civ === "M." || civ === "Mme" ? civ : item.civilite;
  const text = relanceMessage({ id, name: item.name, civilite, offer: item.offer, intentId: item.intentId, step: step as 0 | 1 | 2 }, models ?? 0);
  await recordManualSend(id, step);
  return new Response(null, { status: 302, headers: { Location: relanceWhatsappUrl(item.phone, text), "Cache-Control": "no-store" } });
}
