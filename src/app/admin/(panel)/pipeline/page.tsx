import Link from "next/link";
import { desc, isNotNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { PIPELINE_STAGES, type PipelineStage } from "@/db/schema";
import { Badge, fmtDate, PageTitle } from "@/components/admin/ui";
import { whatsappUrl } from "@/lib/phone";
import { STAGE_LABELS } from "@/lib/pipeline";
import { cookies } from "next/headers";
import campaigns from "@/config/wa-campaigns.json";
import { campaignAudience, type WaCampaign } from "@/lib/pipeline";
import { moveProspect, sendCampaign } from "./actions";

export const dynamic = "force-dynamic";

const STAGE_STYLE: Record<PipelineStage, string> = {
  sequence: "border-sky-300 bg-sky-50",
  chaud: "border-orange-300 bg-orange-50",
  tiede: "border-amber-200 bg-amber-50",
  froid: "border-slate-200 bg-slate-50",
  client: "border-emerald-300 bg-emerald-50",
  projet: "border-violet-300 bg-violet-50",
  desinscrit: "border-slate-200 bg-white",
};

/**
 * CRM des acheteurs du guide : pipeline par étape (séquence WhatsApp, chaud, tiède, froid, client, projet, désinscrit),
 * déplacement à la main, et liste des numéros d'une étape pour une campagne WhatsApp.
 */
export default async function PipelinePage({ searchParams }: { searchParams: Promise<{ numeros?: string }> }) {
  const { numeros } = await searchParams;
  const rows = await getDb().query.prospects.findMany({
    where: isNotNull(schema.prospects.pipelineStage),
    orderBy: [desc(schema.prospects.lastEventAt)],
    limit: 2000,
  });
  const byStage = Object.fromEntries(PIPELINE_STAGES.map((s) => [s, rows.filter((r) => r.pipelineStage === s)])) as Record<PipelineStage, typeof rows>;
  const total = rows.length;
  const clients = byStage.client.length;
  const listStage = PIPELINE_STAGES.includes(numeros as PipelineStage) ? (numeros as PipelineStage) : null;
  const notice = (await cookies()).get("wp_notice")?.value;
  const offers = await Promise.all(
    Object.entries(campaigns as Record<string, WaCampaign>).map(async ([key, c]) => ({ key, c, audience: (await campaignAudience(key, c)).length })),
  );

  return (
    <div>
      <PageTitle
        title="Pipeline des acheteurs du guide"
        subtitle={`${total} acheteurs du guide · ${clients} passés au Catalogue Premium (${total ? Math.round((clients / total) * 100) : 0} %) · séquence WhatsApp : J0 livraison, J1 vidéo, J3 témoignage + prix, classement à J4`}
      />

      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {PIPELINE_STAGES.map((s) => (
          <div key={s} className={`rounded-xl border p-3 ${STAGE_STYLE[s]}`}>
            <p className="text-xs text-muted">{STAGE_LABELS[s]}</p>
            <p className="text-2xl font-bold">{byStage[s].length}</p>
            {s !== "client" && s !== "desinscrit" && byStage[s].length > 0 ? (
              <Link href={`/admin/pipeline?numeros=${s}#numeros`} className="text-xs font-semibold text-primary hover:underline">
                Numéros pour une campagne
              </Link>
            ) : null}
          </div>
        ))}
      </div>

      {notice ? <p className="mb-4 rounded-lg bg-primary/10 p-3 text-sm">{notice}</p> : null}

      {offers.map(({ key, c, audience }) => (
        <section key={key} className="mb-6 rounded-xl border border-orange-300 bg-orange-50 p-4">
          <p className="font-semibold">Campagne WhatsApp : {c.label}</p>
          <p className="mt-1 text-sm text-foreground/75">
            Cible : {c.stages.map((s) => STAGE_LABELS[s]).join(" + ")} · <strong>{audience} destinataire(s)</strong> (désinscrits et personnes déjà touchées exclus) · code{" "}
            <strong>{c.code}</strong> pré-rempli sur la page de vente · modèle Meta « {c.template} ».
          </p>
          <form action={sendCampaign} className="mt-3 flex flex-wrap items-end gap-3 text-sm">
            <input type="hidden" name="campaign" value={key} />
            <label className="flex flex-col gap-1">
              Date limite de l&apos;offre (écrite dans le message)
              <input name="deadline" required placeholder="jeudi 20 novembre à minuit" className="w-64 rounded border border-outline px-2 py-1" />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="confirm" value="oui" required /> J&apos;ai créé le code {c.code} sur Chariow avec cette date de fin
            </label>
            <button disabled={audience === 0} className="rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white disabled:opacity-40">
              Envoyer à {audience} personne(s)
            </button>
          </form>
        </section>
      ))}

      {listStage ? (
        <section id="numeros" className="mb-6 rounded-xl border border-outline bg-white p-4">
          <p className="font-semibold">
            {STAGE_LABELS[listStage]} : {byStage[listStage].filter((p) => p.phone && !p.waOptOutAt).length} numéros (désinscrits exclus)
          </p>
          <textarea
            readOnly
            className="mt-2 h-32 w-full rounded-lg border border-outline p-2 font-mono text-xs"
            value={byStage[listStage]
              .filter((p) => p.phone && !p.waOptOutAt)
              .map((p) => `+${p.phone!.replace(/\D/g, "")},${(p.name || "").replace(/,/g, " ")}`)
              .join("\n")}
          />
        </section>
      ) : null}

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
        {PIPELINE_STAGES.map((s) => (
          <section key={s} className={`w-72 shrink-0 rounded-xl border p-2 ${STAGE_STYLE[s]}`}>
            <h2 className="mb-2 flex items-center justify-between px-1 text-sm font-semibold">
              {STAGE_LABELS[s]} <span className="rounded-full bg-white px-2 py-0.5 text-xs">{byStage[s].length}</span>
            </h2>
            <div className="space-y-2">
              {byStage[s].slice(0, 100).map((p) => {
                const wa = whatsappUrl(p.phone);
                return (
                  <article key={p.id} className="rounded-lg border border-outline bg-white p-2.5 text-sm shadow-sm">
                    <p className="font-semibold">{p.name || p.email}</p>
                    <p className="text-xs text-muted">
                      {p.email} · guide le {fmtDate(p.lastEventAt)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {s === "sequence" ? <Badge tone="info">Message {Math.min(p.waStep, 3)}/3</Badge> : null}
                      {p.waReadAt ? <Badge>Lu</Badge> : null}
                      {p.waClickedAt ? <Badge tone="good">A cliqué</Badge> : null}
                      {p.waRepliedAt ? <Badge tone="good">A répondu</Badge> : null}
                      {p.waOptOutAt ? <Badge tone="bad">STOP</Badge> : null}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      {wa ? (
                        <a href={wa} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#128C4B] hover:underline">
                          WhatsApp
                        </a>
                      ) : null}
                      <form action={moveProspect} className="ml-auto flex items-center gap-1">
                        <input type="hidden" name="id" value={p.id} />
                        <select name="stage" defaultValue={s} className="rounded border border-outline px-1 py-0.5 text-xs" aria-label="Déplacer vers">
                          {PIPELINE_STAGES.map((t) => (
                            <option key={t} value={t}>
                              {STAGE_LABELS[t]}
                            </option>
                          ))}
                        </select>
                        <button className="rounded bg-primary px-2 py-0.5 text-xs text-white">OK</button>
                      </form>
                    </div>
                  </article>
                );
              })}
              {byStage[s].length > 100 ? <p className="px-1 text-xs text-muted">+ {byStage[s].length - 100} autres</p> : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
