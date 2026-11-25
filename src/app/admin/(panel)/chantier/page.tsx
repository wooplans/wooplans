import Link from "next/link";
import { PageTitle } from "@/components/admin/ui";
import { ChantierCardButtons } from "@/components/admin/ChantierCardButtons";
import { STEP_LABEL, type ChantierStep } from "@/lib/chantier-ai-rules";
import { chantierRelances } from "@/lib/chantier-relances";
import { GROUP_LABEL, ago, cameroonDay, suggestedMessageId, type RelanceGroup } from "@/lib/chantier-relances-rules";
import { adModelCode, chantierMessages } from "@/lib/chantier-rules";
import { whatsappLink } from "@/lib/site";
import { depositReceived, markLost, postpone } from "./actions";

export const dynamic = "force-dynamic";

const PILL: Record<RelanceGroup, string> = {
  repondre: "bg-red-600 text-white",
  engage: "bg-emerald-600 text-white",
  proforma: "bg-amber-500 text-white",
  terrain: "bg-primary text-white",
  chaud: "bg-orange-100 text-orange-800",
  attente: "bg-slate-200 text-slate-700",
};
const DOT: Record<RelanceGroup, string> = {
  repondre: "bg-red-600",
  engage: "bg-emerald-600",
  proforma: "bg-amber-500",
  terrain: "bg-primary",
  chaud: "bg-orange-400",
  attente: "bg-slate-400",
};
const SHORT: Record<RelanceGroup, string> = {
  repondre: "Répondre",
  engage: "Engagé",
  proforma: "Proforma",
  terrain: "Proforma à faire",
  chaud: "Chaud",
  attente: "Tiède/froid",
};
const TYPE: Record<string, string> = { villa: "Villa", duplex: "Duplex", immeuble: "Immeuble", indecis: "Type à définir" };
const COUNTRY: Record<string, string> = { CM: "Cameroun", CI: "Côte d'Ivoire", GN: "Guinée", SN: "Sénégal", TD: "Tchad", GA: "Gabon" };

function landText(land: string | null, details: string | null, relief: string | null) {
  const base = land === "dossier" ? "✅ Dossier technique" : land === "dimensions" ? "📐 Dimensions" : "❔ Ni dossier ni dimensions";
  return [base, details, relief && relief !== "inconnu" ? `terrain ${relief}` : null].filter(Boolean).join(" · ");
}

/**
 * Onglet « Plans complets » (décisions de Tao du 25 nov. 2026) : les relances du jour, une carte par prospect, triées
 * par priorité. Un clic ouvre WhatsApp avec le message proposé par l'IA (ou sans message, pour un audio).
 */
export default async function ChantierRelancesPage() {
  const now = new Date();
  const { cards, lastTexts } = await chantierRelances(now);
  const todo = cards.filter((c) => !c.clicked);
  const counts = new Map<RelanceGroup, number>();
  for (const c of todo) counts.set(c.group, (counts.get(c.group) ?? 0) + 1);
  const tomorrow = cameroonDay(now.getTime() + 86_400_000);
  // Par groupe, dans l'ordre de priorité ; les cartes déjà ouvertes à la fin de leur groupe.
  const groups: [RelanceGroup, typeof cards][] = [];
  for (const c of [...todo, ...cards.filter((x) => x.clicked)]) {
    const found = groups.find(([g]) => g === c.group);
    if (found) found[1].push(c);
    else groups.push([c.group, [c]]);
  }

  return (
    <>
      <PageTitle title="Plans complets" subtitle={todo.length ? `${todo.length} relance${todo.length > 1 ? "s" : ""} à faire, la plus urgente en haut` : "Aucune relance à faire pour l'instant 🎉"} />
      {counts.size ? (
        <div className="-mx-4 -mt-2 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1 text-xs md:mx-0 md:flex-wrap md:px-0">
          {[...counts].map(([g, n]) => (
            <a key={g} href={`#g-${g}`} className={`shrink-0 rounded-full px-3 py-1.5 font-semibold ${PILL[g]}`}>
              {n} · {SHORT[g]}
            </a>
          ))}
        </div>
      ) : null}

      <div className="mx-auto max-w-xl space-y-5">
        {groups.map(([g, list]) => (
          <section key={g} id={`g-${g}`} className="scroll-mt-16">
            <h2 className="mb-2 flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-muted">
              <span className={`h-2.5 w-2.5 rounded-full ${DOT[g]}`} aria-hidden />
              {GROUP_LABEL[g]} · {list.length}
            </h2>
            <div className="space-y-3">
              {list.map((c) => {
                const digits = (c.phone || "").replace(/\D/g, "");
                const messages = chantierMessages({ name: c.name, code: c.code, type: c.houseType, model: adModelCode(c.utmContent), city: c.city, start: c.start });
                const mid = suggestedMessageId(c);
                const msg = mid ? messages.find((m) => m.id === mid) : undefined;
                const place = [c.city, c.country && c.country !== "CM" ? COUNTRY[c.country] ?? c.country : null].filter(Boolean).join(", ");
                const house = `${TYPE[c.houseType] ?? c.houseType}${c.bedrooms !== "na" && c.houseType !== "immeuble" ? ` ${c.bedrooms === "5+" ? "5+" : c.bedrooms} ch.` : ""}`;
                const model = adModelCode(c.utmContent);
                const last =
                  c.waiting && c.lastIn
                    ? `Lui, ${ago(c.lastIn, now.getTime())} : « ${(lastTexts.get(c.id) ?? "").slice(0, 160)} »`
                    : c.lastOut
                      ? `Vous, ${ago(c.lastOut, now.getTime())}${c.lastIn ? ` · lui, ${ago(c.lastIn, now.getTime())}` : ""}`
                      : "Pas encore de réponse de votre part";
                const proforma = c.leadId && c.group !== "attente" ? `/admin/crm/${c.leadId}/proforma` : null;
                return (
                  <article key={c.id} className={`overflow-hidden rounded-2xl border border-outline bg-white shadow-sm ${c.clicked ? "opacity-50" : ""}`}>
                    <div className={`h-1 ${DOT[c.group]}`} aria-hidden />
                    <div className="p-4">
                      <header className="flex items-start justify-between gap-2">
                        <h3 className="min-w-0 truncate text-[17px] font-bold leading-tight">{c.name}</h3>
                        {c.clicked ? (
                          <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700">Ouvert</span>
                        ) : c.overdue ? (
                          <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">En retard</span>
                        ) : null}
                      </header>
                      <p className="mt-0.5 text-[13px] text-muted">
                        📍 {place || "Ville inconnue"} · 🏠 {house}
                        {model ? ` · pub ${model}` : ""}
                      </p>

                      <div className="mt-3 space-y-1.5 text-[14px] leading-snug">
                        <p>{landText(c.aiLand, c.aiLandDetails, c.aiRelief)}</p>
                        {c.projectNote ? <p className="line-clamp-2 italic text-foreground/75">📝 « {c.projectNote} »</p> : null}
                        <p className={`line-clamp-3 ${c.waiting ? "font-semibold text-red-700" : "text-foreground/75"}`}>💬 {last}</p>
                        {c.aiNextAction ? <p className="line-clamp-3 font-medium text-primary">👉 {c.aiNextAction}</p> : null}
                      </div>

                      {digits ? <ChantierCardButtons id={c.id} withText={msg ? whatsappLink(msg.text, digits) : null} withoutText={`https://wa.me/${digits}`} proformaUrl={proforma} /> : null}

                      <details className="group mt-3 rounded-xl bg-slate-50">
                        <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-[13px] font-semibold text-foreground/70">
                          <span>{msg ? `Message proposé · ${msg.title}` : "Plus d'options"}</span>
                          <span className="transition group-open:rotate-180" aria-hidden>
                            ▾
                          </span>
                        </summary>
                        <div className="space-y-3 border-t border-outline px-3 pb-3 pt-2">
                          {msg ? <p className="whitespace-pre-line text-[13px] text-foreground/80">{msg.text}</p> : null}
                          {!msg && c.waiting ? <p className="text-[13px] text-amber-800">L&apos;IA n&apos;a pas encore lu son dernier message : répondez librement ou par audio.</p> : null}
                          <div className="grid grid-cols-2 gap-2 text-[13px]">
                            <form action={depositReceived.bind(null, c.id)}>
                              <button className="w-full rounded-xl bg-emerald-100 px-3 py-2.5 font-semibold text-emerald-800">💰 Avance reçue</button>
                            </form>
                            <form action={markLost.bind(null, c.id)}>
                              <button className="w-full rounded-xl bg-red-50 px-3 py-2.5 font-semibold text-red-700">✕ Perdu</button>
                            </form>
                          </div>
                          <form action={postpone.bind(null, c.id)} className="flex gap-2 text-[13px]">
                            <input type="date" name="date" defaultValue={tomorrow} min={tomorrow} aria-label="Nouvelle date de relance" className="min-w-0 flex-1 rounded-xl border border-outline bg-white px-3 py-2" />
                            <button className="shrink-0 rounded-xl bg-slate-200 px-3 py-2.5 font-semibold">Reporter</button>
                          </form>
                          <p className="flex items-center justify-between text-[12px] text-muted">
                            <span className="font-mono">{c.code}</span>
                            {c.leadId ? (
                              <Link href={`/admin/crm/${c.leadId}`} className="font-semibold text-primary">
                                Ouvrir la fiche →
                              </Link>
                            ) : null}
                          </p>
                          {c.aiStep && STEP_LABEL[c.aiStep as ChantierStep] ? <p className="text-[11px] text-muted">Étape IA : {STEP_LABEL[c.aiStep as ChantierStep]}</p> : null}
                        </div>
                      </details>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
