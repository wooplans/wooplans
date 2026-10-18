import Link from "next/link";
import { and, countDistinct, desc, eq, isNotNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { Badge, fmtDate, fmtDateTime, PageTitle, Stat, Table } from "@/components/admin/ui";
import { CopyButton } from "@/components/admin/CopyButton";
import { siteUrl } from "@/lib/env";
import { getSetting } from "@/lib/settings";
import { TESTIMONIAL_RELAUNCH_DAYS, testimonialBroadcastMessage } from "@/lib/testimonial-request";
import { deleteTestimonial, saveTestimonialReward, setTestimonialStatus } from "./actions";

const STATUS = {
  new: { label: "À regarder", tone: "warn" },
  kept: { label: "Retenu", tone: "good" },
  rejected: { label: "Écarté", tone: "neutral" },
} as const;

const VIEWS = [
  { id: "", label: "À solliciter" },
  { id: "relance", label: "À relancer" },
  { id: "tous", label: "Tous les membres" },
] as const;

const DAY = 86_400_000;

export default async function TestimonialsPage({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const { vue = "" } = await searchParams;
  const db = getDb();
  const [submissions, members, pdfCounts, reward] = await Promise.all([
    db.query.testimonialSubmissions.findMany({ orderBy: desc(schema.testimonialSubmissions.createdAt), limit: 200 }),
    db.query.members.findMany({ where: and(eq(schema.members.status, "active"), isNotNull(schema.members.phone)) }),
    db
      .select({ memberId: schema.pdfDownloads.memberId, n: countDistinct(schema.pdfDownloads.planSlug) })
      .from(schema.pdfDownloads)
      .groupBy(schema.pdfDownloads.memberId),
    getSetting<string>("testimonial_reward", ""),
  ]);
  const pdfByMember = new Map(pdfCounts.map((r) => [r.memberId, r.n]));
  const submitted = new Set(submissions.map((s) => s.memberId).filter(Boolean));
  const memberById = new Map(members.map((m) => [m.id, m]));
  const now = Date.now();
  const relaunchDue = (m: (typeof members)[number]) =>
    m.testimonialAskedAt !== null && m.testimonialAskCount < 3 && now - m.testimonialAskedAt.getTime() > TESTIMONIAL_RELAUNCH_DAYS * DAY;

  // Les clients qui ont vraiment utilisé le catalogue (fiches téléchargées, connexions) sont sollicités en premier :
  // ils ont le plus de choses à raconter et le plus de chances de répondre.
  const engagement = (m: (typeof members)[number]) => (pdfByMember.get(m.id) ?? 0) * 10 + (m.lastLoginAt ? 5 + Math.max(0, 30 - (now - m.lastLoginAt.getTime()) / DAY) / 6 : 0);
  const candidates = members
    .filter((m) => !submitted.has(m.id))
    .filter((m) => (vue === "tous" ? true : vue === "relance" ? relaunchDue(m) : m.testimonialAskCount === 0))
    .sort((a, b) => engagement(b) - engagement(a))
    .slice(0, 150);

  const counts = {
    received: submissions.length,
    kept: submissions.filter((s) => s.status === "kept").length,
    asked: members.filter((m) => m.testimonialAskCount > 0).length,
    answered: members.filter((m) => m.testimonialAskCount > 0 && submitted.has(m.id)).length,
  };
  const generalLink = siteUrl("/temoignage");

  return (
    <>
      <PageTitle
        title="Témoignages"
        subtitle="Demandez un témoignage vidéo ou audio par WhatsApp : chaque client reçoit un lien personnel vers une page où il s'enregistre en 30 secondes depuis son téléphone."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Témoignages reçus" value={String(counts.received)} />
        <Stat label="Retenus" value={String(counts.kept)} />
        <Stat label="Clients sollicités" value={String(counts.asked)} />
        <Stat label="Taux de réponse" value={counts.asked ? `${Math.round((counts.answered / counts.asked) * 100)} %` : "—"} hint="clients sollicités qui ont envoyé" />
      </div>

      <section className="mb-8">
        <h2 className="mb-3 font-semibold">Reçus</h2>
        {submissions.length === 0 ? (
          <p className="card p-6 text-center text-sm text-muted">Aucun témoignage reçu pour le moment.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {submissions.map((s) => {
              const member = s.memberId ? memberById.get(s.memberId) : null;
              const src = `/api/admin/temoignages/${s.id}`;
              return (
                <article key={s.id} className="card overflow-hidden">
                  {s.kind === "video" ? (
                    <video src={src} controls playsInline preload="metadata" className="aspect-[9/16] max-h-[420px] w-full bg-black object-contain" />
                  ) : (
                    <div className="bg-primary/5 p-4">
                      <p className="mb-2 text-xs font-semibold text-primary">🎙️ Témoignage audio</p>
                      <audio src={src} controls preload="metadata" className="w-full" />
                    </div>
                  )}
                  <div className="space-y-2 p-4 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{s.name}</p>
                        <p className="text-xs text-muted">
                          {[s.location, member?.email].filter(Boolean).join(" · ") || "Lien général"}
                        </p>
                      </div>
                      <Badge tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Badge>
                    </div>
                    {s.quote ? <p className="italic">« {s.quote} »</p> : null}
                    <p className="text-xs text-muted">
                      {fmtDateTime(s.createdAt)} · {(s.size / 1048576).toFixed(1)} Mo{s.durationSec ? ` · ${s.durationSec} s` : ""} · diffusion autorisée
                      {s.firstNameOnly ? " (prénom seulement)" : ""}
                    </p>
                    <div className="flex flex-wrap gap-3 pt-1">
                      <a href={`${src}?dl=1`} className="text-xs font-semibold text-primary">Télécharger</a>
                      {s.status !== "kept" ? (
                        <form action={setTestimonialStatus.bind(null, s.id, "kept")}><button className="text-xs font-semibold text-emerald-700">Retenir</button></form>
                      ) : null}
                      {s.status !== "rejected" ? (
                        <form action={setTestimonialStatus.bind(null, s.id, "rejected")}><button className="text-xs font-semibold text-muted">Écarter</button></form>
                      ) : null}
                      {member ? (
                        <a href={`/admin/membres?q=${encodeURIComponent(member.email)}`} className="text-xs font-semibold text-muted">Fiche membre</a>
                      ) : null}
                      <form action={deleteTestimonial.bind(null, s.id)}><button className="text-xs font-semibold text-secondary">Supprimer</button></form>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="font-semibold">Demander sur WhatsApp</h2>
        <p className="mb-3 mt-1 text-sm text-muted">
          Le bouton ouvre WhatsApp avec un message prérempli et le lien personnel du client (son prénom s&apos;affiche sur la page).
          Les clients les plus actifs (fiches PDF téléchargées, connexions récentes) sont en tête. Une relance est proposée après {TESTIMONIAL_RELAUNCH_DAYS} jours sans réponse (2 relances au plus).
        </p>
        <div className="mb-3 flex flex-wrap gap-1 rounded-full border border-outline bg-surface p-1 text-sm sm:w-fit">
          {VIEWS.map((v) => (
            <Link
              key={v.id}
              href={v.id ? `/admin/temoignages?vue=${v.id}` : "/admin/temoignages"}
              className={`rounded-full px-3 py-1 ${vue === v.id ? "bg-primary text-white" : "text-foreground/70 hover:text-primary"}`}
            >
              {v.label}
            </Link>
          ))}
        </div>
        <Table head={["Membre", "Activité", "Membre depuis", "Demandé", ""]} empty={candidates.length === 0}>
          {candidates.map((m) => (
            <tr key={m.id}>
              <td className="px-4 py-2.5">
                <p className="font-medium">{m.name || m.email}</p>
                <p className="text-xs text-muted">+{m.phone}</p>
              </td>
              <td className="px-4 py-2.5 text-xs">
                {pdfByMember.get(m.id) ?? 0} fiche(s) PDF
                <br />
                <span className="text-muted">connexion : {fmtDate(m.lastLoginAt)}</span>
              </td>
              <td className="px-4 py-2.5">{fmtDate(m.createdAt)}</td>
              <td className="px-4 py-2.5 text-xs">{m.testimonialAskedAt ? `${fmtDate(m.testimonialAskedAt)} (×${m.testimonialAskCount})` : "—"}</td>
              <td className="px-4 py-2.5">
                <a
                  href={`/api/admin/temoignages/demander?member=${encodeURIComponent(m.id)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex whitespace-nowrap rounded-full bg-[#25D366] px-3 py-1 text-xs font-semibold text-white"
                >
                  {m.testimonialAskCount > 0 ? "Relancer sur WhatsApp" : "Demander sur WhatsApp"}
                </a>
              </td>
            </tr>
          ))}
        </Table>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-semibold">Lien général (statut WhatsApp, groupes, listes de diffusion)</h2>
          <p className="mt-1 text-sm text-muted">Pour les clients sans numéro enregistré : la page leur demande simplement leur nom.</p>
          <p className="mt-3 break-all rounded-lg bg-background px-3 py-2 font-mono text-xs">{generalLink}</p>
          <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-background px-3 py-2 text-xs">{testimonialBroadcastMessage(generalLink)}</pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyButton text={generalLink} label="Copier le lien" />
            <CopyButton text={testimonialBroadcastMessage(generalLink)} label="Copier le message" />
          </div>
        </section>
        <section className="card p-5">
          <h2 className="font-semibold">Remerciement affiché après l&apos;envoi</h2>
          <p className="mt-1 text-sm text-muted">
            Facultatif, mais un petit cadeau augmente nettement le taux de réponse. Il est annoncé sur la page avant l&apos;enregistrement, puis
            confirmé après l&apos;envoi (vous l&apos;honorez vous-même). Exemples : « 10 000 FCFA de réduction sur vos plans complets »,
            « Une étude gratuite de votre terrain ». Laisser vide pour ne rien afficher.
          </p>
          <form action={saveTestimonialReward} className="mt-3 flex gap-2">
            <input name="reward" defaultValue={reward} maxLength={200} placeholder="Votre cadeau de remerciement" className="input" />
            <button className="btn-primary">Enregistrer</button>
          </form>
        </section>
      </div>
    </>
  );
}
