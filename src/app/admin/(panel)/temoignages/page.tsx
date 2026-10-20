import Link from "next/link";
import { and, countDistinct, eq, isNotNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { fmtDate, PageTitle, Stat, Table } from "@/components/admin/ui";
import { CopyButton } from "@/components/admin/CopyButton";
import { IntroAudioField } from "@/components/admin/IntroAudioField";
import { siteUrl } from "@/lib/env";
import { getSetting } from "@/lib/settings";
import { TESTIMONIAL_RELAUNCH_DAYS, testimonialBroadcastMessage } from "@/lib/testimonial-request";
import { saveIntroAudio } from "./actions";

const VIEWS = [
  { id: "", label: "À solliciter" },
  { id: "relance", label: "À relancer" },
  { id: "tous", label: "Tous les membres" },
] as const;

const DAY = 86_400_000;

export default async function TestimonialsPage({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const { vue = "" } = await searchParams;
  const db = getDb();
  const [members, pdfCounts, introAudio] = await Promise.all([
    db.query.members.findMany({ where: and(eq(schema.members.status, "active"), isNotNull(schema.members.phone)) }),
    db
      .select({ memberId: schema.pdfDownloads.memberId, n: countDistinct(schema.pdfDownloads.planSlug) })
      .from(schema.pdfDownloads)
      .groupBy(schema.pdfDownloads.memberId),
    getSetting<string>("testimonial_intro_audio", ""),
  ]);
  const pdfByMember = new Map(pdfCounts.map((r) => [r.memberId, r.n]));
  const now = Date.now();
  const relaunchDue = (m: (typeof members)[number]) =>
    m.testimonialAskedAt !== null && m.testimonialAskCount < 3 && now - m.testimonialAskedAt.getTime() > TESTIMONIAL_RELAUNCH_DAYS * DAY;

  // Les clients qui ont vraiment utilisé le catalogue (fiches téléchargées, connexions) sont sollicités en premier :
  // ils ont le plus de choses à raconter et le plus de chances de répondre.
  const engagement = (m: (typeof members)[number]) =>
    (pdfByMember.get(m.id) ?? 0) * 10 + (m.lastLoginAt ? 5 + Math.max(0, 30 - (now - m.lastLoginAt.getTime()) / DAY) / 6 : 0);
  const candidates = members
    .filter((m) => (vue === "tous" ? true : vue === "relance" ? relaunchDue(m) : m.testimonialAskCount === 0))
    .sort((a, b) => engagement(b) - engagement(a))
    .slice(0, 150);
  const asked = members.filter((m) => m.testimonialAskCount > 0).length;
  const link = siteUrl("/temoignage");

  return (
    <>
      <PageTitle
        title="Avis clients"
        subtitle="Demandez un avis par WhatsApp : le client ouvre une page courte, écoute votre message et vous laisse un vocal en suivant 3 questions."
        actions={<Link href="/temoignage" target="_blank" className="btn-ghost py-2">Voir la page ↗</Link>}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="Clients sollicités" value={String(asked)} />
        <Stat label="À solliciter" value={String(members.length - asked)} hint="membres actifs avec WhatsApp" />
        <Stat label="À relancer" value={String(members.filter(relaunchDue).length)} hint={`sans relance depuis ${TESTIMONIAL_RELAUNCH_DAYS} jours`} />
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-semibold">Votre message audio</h2>
          <p className="mb-3 mt-1 text-sm text-muted">Affiché en haut de la page : 30 à 45 secondes pour remercier le client et lui dire quoi faire (mp3 ou m4a).</p>
          <IntroAudioField initial={introAudio} save={saveIntroAudio} />
        </section>
        <section className="card p-5">
          <h2 className="font-semibold">Statut WhatsApp, groupes, listes de diffusion</h2>
          <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-background px-3 py-2 text-xs">{testimonialBroadcastMessage(link)}</pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyButton text={testimonialBroadcastMessage(link)} label="Copier le message" />
            <CopyButton text={link} label="Copier le lien" />
          </div>
        </section>
      </div>

      <section>
        <h2 className="font-semibold">Demander sur WhatsApp</h2>
        <p className="mb-3 mt-1 text-sm text-muted">
          Le bouton ouvre WhatsApp avec un message prérempli au prénom du client. Les clients les plus actifs (fiches PDF, connexions récentes) sont en tête.
          Relance proposée après {TESTIMONIAL_RELAUNCH_DAYS} jours (2 relances au plus). Les avis arrivent en vocal dans votre WhatsApp.
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
    </>
  );
}
