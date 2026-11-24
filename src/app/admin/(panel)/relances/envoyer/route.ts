import { getCurrentAdmin, requireAdmin } from "@/lib/auth";
import { countPublishedPlans } from "@/lib/plans";
import { RELANCE_STEP_COUNT } from "@/lib/relance-schedule";
import { PREMIUM_STEP_COUNT, premiumItem, premiumMessage, recordPremiumSend } from "@/lib/premium-relances";
import { type RelanceStep, projectMessage, recordManualSend, recordProjectSent, relanceItem, relanceMessage, relanceWhatsappUrl } from "@/lib/relances";

export const dynamic = "force-dynamic";

function parse(url: URL) {
  const id = url.searchParams.get("id") || "";
  const step = Number(url.searchParams.get("etape"));
  return { id, step, valid: Boolean(id) && Number.isInteger(step) && step >= 0 && step < RELANCE_STEP_COUNT };
}

function premiumStep(url: URL) {
  const m = /^premium-(\d)$/.exec(url.searchParams.get("etape") || "");
  if (!m) return null;
  const step = Number(m[1]);
  return step < PREMIUM_STEP_COUNT ? { id: url.searchParams.get("id") || "", step } : null;
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
  // Relances Premium → plans complets (etape=premium-0, premium-1, premium-2).
  const premium = premiumStep(url);
  if (premium) {
    if (!premium.id) return Response.json({ ok: false }, { status: 400 });
    return Response.json({ ok: true, recorded: await recordPremiumSend(premium.id, premium.step) }, { headers: { "Cache-Control": "no-store" } });
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
  const premium = premiumStep(url);
  if (premium) {
    const m = premium.id ? await premiumItem(premium.id) : null;
    if (!m || m.step !== premium.step) return Response.redirect(new URL("/admin/relances", url), 303);
    await recordPremiumSend(m.id, m.step);
    const civ = url.searchParams.get("civ");
    const civilite = civ === "M." || civ === "Mme" ? civ : m.civilite;
    return new Response(null, { status: 302, headers: { Location: relanceWhatsappUrl(m.phone, premiumMessage({ ...m, civilite }, m.step)), "Cache-Control": "no-store" } });
  }
  const { id, step, valid } = parse(url);
  const [item, models] = await Promise.all([valid ? relanceItem(id) : null, countPublishedPlans()]);
  if (!item?.phone || !valid) return Response.redirect(new URL("/admin/relances", url), 303);
  const civ = url.searchParams.get("civ");
  const civilite = civ === "M." || civ === "Mme" ? civ : item.civilite;
  const text = relanceMessage({ id, name: item.name, civilite, offer: item.offer, intentId: item.intentId, reservedUntil: item.reservedUntil, country: item.country, step: step as RelanceStep }, models ?? 0);
  await recordManualSend(id, step);
  return new Response(null, { status: 302, headers: { Location: relanceWhatsappUrl(item.phone, text), "Cache-Control": "no-store" } });
}
