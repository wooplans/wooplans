import Link from "next/link";
import { PageTitle } from "@/components/admin/ui";
import { ChantierCardButtons } from "@/components/admin/ChantierCardButtons";
import { STEP_LABEL, type ChantierStep } from "@/lib/chantier-ai-rules";
import { chantierRelances } from "@/lib/chantier-relances";
import { GROUP_LABEL, ago, cameroonDay, suggestedMessageId, type RelanceGroup } from "@/lib/chantier-relances-rules";
import { adModelCode, chantierMessages } from "@/lib/chantier-rules";
import { whatsappLink } from "@/lib/site";
import { ProformaOneClick } from "@/components/admin/ProformaOneClick";
import { depositReceived, markLost, postpone, sendProformaOneClick } from "./actions";

export const dynamic = "force-dynamic";

const PILL: Record<RelanceGroup, string> = {
  repondre: "bg-red-600 text-white",
  engage: "bg-emerald-600 text-white",
  proforma: "bg-amber-500 text-white",
  terrain: "bg-primary text-white",
  chaud: "bg-orange-100 text-orange-800",
  attente: "bg-slate-200 text-slate-700",
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

  return (
    <>
      <PageTitle title="Plans complets" subtitle={todo.length ? `${todo.length} relance${todo.length > 1 ? "s" : ""} à faire, la plus urgente en premier` : "Aucune relance à faire pour l'instant 🎉"} />
      {counts.size ? (
        <div className="-mt-2 mb-4 flex flex-wrap gap-1.5 text-xs">
          {[...counts].map(([g, n]) => (
            <span key={g} className={`rounded-full px-2.5 py-1 font-semibold ${PILL[g]}`}>
              {n} · {SHORT[g]}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mx-auto grid max-w-2xl gap-3">
        {cards.map((c) => {
          const digits = (c.phone || "").replace(/\D/g, "");
          const messages = chantierMessages({ name: c.name, code: c.code, type: c.houseType, model: adModelCode(c.utmContent), city: c.city, start: c.start });
          const mid = suggestedMessageId(c);
          const msg = mid ? messages.find((m) => m.id === mid) : undefined;
          const place = [c.city, c.country && c.country !== "CM" ? COUNTRY[c.country] ?? c.country : null].filter(Boolean).join(", ");
          const house = `${TYPE[c.houseType] ?? c.houseType}${c.bedrooms !== "na" && c.houseType !== "immeuble" ? ` ${c.bedrooms === "5+" ? "5+" : c.bedrooms} ch.` : ""}`;
          const model = adModelCode(c.utmContent);
          const last =
            c.waiting && c.lastIn
              ? `Lui, ${ago(c.lastIn, now.getTime())} : « ${(lastTexts.get(c.id) ?? "").slice(0, 140)} »`
              : c.lastOut
                ? `Vous, ${ago(c.lastOut, now.getTime())}${c.lastIn ? ` · lui, ${ago(c.lastIn, now.getTime())}` : ""}`
                : "Pas encore de réponse de votre part";
          return (
            <article key={c.id} className={`card p-4 ${c.clicked ? "opacity-50" : ""}`}>
              <header className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate text-[17px] font-bold">{c.name}</h2>
                  <p className="text-xs text-muted">
                    {place || "Ville inconnue"} · <span className="font-mono">{c.code}</span>
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${PILL[c.group]}`}>
                  {c.clicked ? "Ouvert" : SHORT[c.group]}
                  {c.overdue && !c.clicked ? " · en retard" : ""}
                </span>
              </header>

              <ul className="mt-3 space-y-1.5 text-sm">
                <li>🏠 {house}{model ? ` · pub ${model}` : ""}</li>
                {c.projectNote ? <li className="italic text-foreground/80">📝 « {c.projectNote} »</li> : null}
                <li>{landText(c.aiLand, c.aiLandDetails, c.aiRelief)}</li>
                <li className={c.waiting ? "font-semibold text-red-700" : "text-foreground/80"}>💬 {last}</li>
                {c.aiNextAction ? <li className="text-primary">👉 {c.aiNextAction}</li> : null}
              </ul>

              {msg ? (
                <details className="mt-3 rounded-lg bg-primary/5 px-3 py-2 text-sm">
                  <summary className="cursor-pointer font-medium">Message proposé : {msg.title}</summary>
                  <p className="mt-1.5 whitespace-pre-line text-foreground/80">{msg.text}</p>
                </details>
              ) : c.waiting ? (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">L&apos;IA n&apos;a pas encore lu son dernier message : répondez librement ou par audio.</p>
              ) : null}

              {digits ? <ChantierCardButtons id={c.id} withText={msg ? whatsappLink(msg.text, digits) : null} withoutText={`https://wa.me/${digits}`} /> : null}
              {c.leadId && c.houseType !== "immeuble" && c.group !== "attente" ? (
                <ProformaOneClick action={sendProformaOneClick.bind(null, c.id)} pdfUrl={`/admin/crm/${c.leadId}/proforma`} primary={c.group === "terrain"} />
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-outline pt-3 text-xs">
                <form action={depositReceived.bind(null, c.id)}>
                  <button className="rounded-lg bg-emerald-50 px-2.5 py-1.5 font-semibold text-emerald-700">💰 Avance reçue</button>
                </form>
                <form action={postpone.bind(null, c.id)} className="flex items-center gap-1">
                  <input type="date" name="date" defaultValue={tomorrow} min={tomorrow} aria-label="Nouvelle date de relance" className="rounded-lg border border-outline px-1.5 py-1" />
                  <button className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-semibold">Reporter</button>
                </form>
                <form action={markLost.bind(null, c.id)}>
                  <button className="rounded-lg bg-red-50 px-2.5 py-1.5 font-semibold text-red-700">Perdu</button>
                </form>
                {c.leadId ? (
                  <Link href={`/admin/crm/${c.leadId}`} className="ml-auto font-semibold text-primary">
                    Fiche →
                  </Link>
                ) : null}
              </div>
              {c.aiStep && STEP_LABEL[c.aiStep as ChantierStep] ? <p className="mt-2 text-[11px] text-muted">{GROUP_LABEL[c.group]} · étape IA : {STEP_LABEL[c.aiStep as ChantierStep]}</p> : null}
            </article>
          );
        })}
      </div>
    </>
  );
}
