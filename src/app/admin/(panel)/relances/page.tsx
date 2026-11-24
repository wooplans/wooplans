import { deadlineLabel } from "@/lib/catalogue-offer-rules";
import { extraitLevel } from "@/lib/extrait-web-rules";
import Link from "next/link";
import { and, desc, eq, gte } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { Badge, PageTitle } from "@/components/admin/ui";
import { WhatsappSendButton } from "@/components/admin/WhatsappSendButton";
import { countPublishedPlans } from "@/lib/plans";
import { noWhatsappList, projectMessage, projectQueue, RELANCE_STEPS, relanceAttachment, relanceMessage, relanceQueue, relanceWhatsappUrl, type ProjectItem, type RelanceItem } from "@/lib/relances";
import { waManual } from "@/lib/whatsapp";
import { HEAT_LABEL } from "@/lib/lead-heat-rules";
import { phaseOneStats } from "@/lib/phase-one-stats";
import { PREMIUM_STEPS, premiumMessage, premiumQueue, type PremiumItem } from "@/lib/premium-relances";
import { announceExtraitWeb, fixWhatsappNumber, noWhatsapp, reopenOffer, undoRelance } from "./actions";
import { extraitAnnounceQueue } from "@/lib/extrait-web-announce";
import { automatedEmailAllowance } from "@/lib/email-budget";
import { siteUrl } from "@/lib/env";
import { VIDEOS } from "@/lib/videos";
import { catalogueReservedPrice } from "@/lib/site";
import { formatFcfa } from "@/lib/plans";

export const dynamic = "force-dynamic";

const AI_STAGE: Record<string, string> = { chaud: "🔥 chaud", tiede: "tiède", froid: "froid", perdu: "perdu" };

const HEAT_STYLE: Record<string, string> = {
  brulant: "bg-red-100 text-red-900",
  chaud: "bg-orange-100 text-orange-900",
  tiede: "bg-amber-50",
  froid: "bg-gray-100 text-foreground/70",
};

const COLUMN_STYLE = [
  "border-sky-300 bg-sky-50",
  "border-amber-300 bg-amber-50",
  "border-orange-300 bg-orange-50",
  "border-rose-300 bg-rose-50",
  "border-red-300 bg-red-50",
];

function ago(date: Date, now: Date) {
  const h = Math.floor((now.getTime() - date.getTime()) / 3_600_000);
  if (h < 1) return "à l'instant";
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

function when(date: Date, now: Date) {
  const h = Math.ceil((date.getTime() - now.getTime()) / 3_600_000);
  if (h <= 24) return `dans ${h} h`;
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Douala" });
}

/** Numéro incorrect : corriger (indicatif compris) ou signaler « pas de WhatsApp » (la carte sort des relances WhatsApp). */
function PhoneFix({ id }: { id: string }) {
  return (
    <details className="mt-2 text-xs">
      <summary className="cursor-pointer text-center text-muted">Numéro incorrect ?</summary>
      <form action={fixWhatsappNumber} className="mt-2 flex gap-1.5">
        <input type="hidden" name="id" value={id} />
        <input
          name="phone"
          id={`phone-${id}`}
          inputMode="tel"
          placeholder="Vrai WhatsApp, ex. 2250701020304"
          className="min-w-0 flex-1 rounded border border-outline px-2 py-1.5"
          required
        />
        <button className="rounded bg-primary px-2.5 py-1.5 font-semibold text-white">Corriger</button>
      </form>
      <form action={noWhatsapp} className="mt-1.5">
        <input type="hidden" name="id" value={id} />
        <button className="w-full rounded border border-red-200 px-2 py-1.5 text-red-700 hover:bg-red-50">Pas de WhatsApp : retirer des relances</button>
      </form>
    </details>
  );
}

function Card({ item, models, now }: { item: RelanceItem; models: number; now: Date }) {
  const file = relanceAttachment(item);
  const text = relanceMessage(item, models);
  const preview = text.split("\n").find((l) => l.trim()) ?? "";
  const recordUrl = `/admin/relances/envoyer?id=${encodeURIComponent(item.id)}&etape=${item.step}`;
  return (
    <article className="rounded-xl border border-outline bg-white p-3 text-sm shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{item.name || item.email}</p>
          <p className="text-xs text-muted">
            {item.country || "—"} · achat {ago(item.boughtAt, now)} · +{item.phone.replace(/\D/g, "")}
          </p>
          {item.step >= 1 && item.reservedUntil ? (
            <p className="text-xs text-muted">Prix réservé jusqu&apos;au {deadlineLabel(item.reservedUntil)}</p>
          ) : null}
        </div>
        <Badge tone={item.offer === "extrait" ? "good" : "info"}>{item.offer === "extrait" ? "Extrait" : "Guide"}</Badge>
      </div>
      <div className={`mt-1.5 rounded-md px-2 py-1 text-xs ${HEAT_STYLE[item.heat.level]}`}>
        <p>
          <strong>{HEAT_LABEL[item.heat.level]}</strong> · {item.heat.score}/100
        </p>
        <p className="text-foreground/80">{item.heat.reasons.join(" · ")}</p>
      </div>
      {item.extrait ? (
        <p className="mt-1.5 rounded-md bg-sky-50 px-2 py-1 text-xs">
          📱 Extrait en ligne : score <strong>{item.extrait.score}</strong> ({extraitLevel(item.extrait.score) === "chaud" ? "🔥 chaud" : extraitLevel(item.extrait.score) === "tiede" ? "tiède" : "froid"}) ·{" "}
          {item.extrait.opens} j · {item.extrait.viewed} maison{item.extrait.viewed > 1 ? "s" : ""} · {item.extrait.lockedClicks} 🔒
          {item.extrait.offerClick ? " · a cliqué sur l'offre" : ""}
        </p>
      ) : null}
      {item.ai ? (
        <div className="mt-1.5 rounded-md bg-emerald-50 px-2 py-1 text-xs">
          <p>
            🤖 IA : <strong>{AI_STAGE[item.ai.stage] ?? item.ai.stage}</strong>
            {item.ai.score !== null ? ` (${item.ai.score}/100)` : ""} ·{" "}
            <Link href={`/admin/conversation/${item.id}`} className="font-semibold text-primary">
              conversation
            </Link>
          </p>
          {item.ai.summary ? <p className="mt-0.5 text-foreground/80">{item.ai.summary}</p> : null}
          {item.ai.nextAction ? <p className="mt-0.5 font-semibold">➡ {item.ai.nextAction}</p> : null}
        </div>
      ) : null}
      {item.video ? (
        <p className="mt-1 rounded-md bg-violet-50 px-2 py-1 text-xs">
          🎥 Vidéo {item.video.video} :{" "}
          {{ open: "page ouverte", play: "lancée", half: "vue à moitié", end: "vue jusqu'au bout", cta: "a cliqué vers l'offre" }[item.video.event] ?? item.video.event}
        </p>
      ) : null}
      {item.read || item.clicked || item.replied ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {item.read ? <Badge>Lu</Badge> : null}
          {item.clicked ? <Badge tone="good">A cliqué</Badge> : null}
          {item.replied ? <Badge tone="good">A répondu</Badge> : null}
        </div>
      ) : null}
      <p className="mt-2 line-clamp-2 text-xs text-foreground/60">« {preview} »</p>
      {/* Le clic ouvre WhatsApp aussitôt (message déjà écrit) et note l'envoi en arrière-plan. */}
      {item.civilite ? (
        <WhatsappSendButton waUrl={relanceWhatsappUrl(item.phone, text)} recordUrl={recordUrl}>
          Envoyer le message {item.step + 1} sur WhatsApp
        </WhatsappSendButton>
      ) : (
        <>
          {/* Prénom inconnu : Tao choisit la civilité d'un clic. */}
          <p className="mt-2 text-center text-xs text-muted">Prénom non reconnu : choisissez</p>
          <div className="grid grid-cols-2 gap-2">
            {(["M.", "Mme"] as const).map((civilite) => (
              <WhatsappSendButton key={civilite} waUrl={relanceWhatsappUrl(item.phone, relanceMessage({ ...item, civilite }, models))} recordUrl={recordUrl}>
                {civilite === "M." ? "Monsieur" : "Madame"}
              </WhatsappSendButton>
            ))}
          </div>
        </>
      )}
      {file ? (
        <p className="mt-2 text-center text-xs text-muted">
          📎 Joindre : {file.url ? (
            <a href={file.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
              {file.label}
            </a>
          ) : (
            file.label
          )}
        </p>
      ) : (
        <p className="mt-2 text-center text-xs text-muted">Texte seul, sans pièce jointe</p>
      )}
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-center text-muted">Liens vidéo à partager (personnels, suivis)</summary>
        <ul className="mt-1 space-y-1 break-all">
          {Object.entries(VIDEOS).map(([key, v]) => (
            <li key={key}>
              {v.title} : <span className="font-mono">{siteUrl(`/r/${item.id}.v-${key}`)}</span>
            </li>
          ))}
        </ul>
      </details>
      <PhoneFix id={item.id} />
    </article>
  );
}

function ProjectCard({ item, now }: { item: ProjectItem; now: Date }) {
  const recordUrl = `/admin/relances/envoyer?id=${encodeURIComponent(item.id)}&etape=projet`;
  return (
    <article className="rounded-xl border border-outline bg-white p-3 text-sm shadow-sm">
      <p className="truncate font-semibold">{item.name || item.email}</p>
      <p className="text-xs text-muted">
        {item.country || "—"} · achat {ago(item.boughtAt, now)} · +{item.phone.replace(/\D/g, "")}
      </p>
      {item.civilite ? (
        <WhatsappSendButton waUrl={relanceWhatsappUrl(item.phone, projectMessage(item))} recordUrl={recordUrl}>
          Envoyer le formulaire sur WhatsApp
        </WhatsappSendButton>
      ) : (
        <>
          <p className="mt-2 text-center text-xs text-muted">Prénom non reconnu : choisissez</p>
          <div className="grid grid-cols-2 gap-2">
            {(["M.", "Mme"] as const).map((civilite) => (
              <WhatsappSendButton key={civilite} waUrl={relanceWhatsappUrl(item.phone, projectMessage({ ...item, civilite }))} recordUrl={recordUrl}>
                {civilite === "M." ? "Monsieur" : "Madame"}
              </WhatsappSendButton>
            ))}
          </div>
        </>
      )}
      <PhoneFix id={item.id} />
    </article>
  );
}

function PremiumCard({ item, now }: { item: PremiumItem; now: Date }) {
  const recordUrl = `/admin/relances/envoyer?id=${encodeURIComponent(item.id)}&etape=premium-${item.step}`;
  const login = item.lastLoginAt ? `connecté ${ago(item.lastLoginAt, now)}` : "jamais connecté";
  return (
    <article className="rounded-xl border border-outline bg-white p-3 text-sm shadow-sm">
      <p className="flex items-center justify-between gap-2">
        <span className="truncate font-semibold">{item.name || item.email}</span>
        <Badge tone={item.heat >= 60 ? "good" : item.heat >= 30 ? "warn" : "neutral"}>{item.heat >= 60 ? "🔥 actif" : item.heat >= 30 ? "tiède" : "froid"}</Badge>
      </p>
      <p className="text-xs text-muted">
        {item.country || "—"} · membre {ago(item.joinedAt, now)} · +{item.phone.replace(/\D/g, "")}
      </p>
      <p className="text-xs text-muted">
        {login} · {item.models} modèle{item.models > 1 ? "s" : ""} ouvert{item.models > 1 ? "s" : ""}
        {item.lastModel ? ` · dernier : ${item.lastModel}` : ""}
      </p>
      {item.civilite ? (
        <WhatsappSendButton waUrl={relanceWhatsappUrl(item.phone, premiumMessage(item, item.step, now))} recordUrl={recordUrl}>
          Envoyer sur WhatsApp
        </WhatsappSendButton>
      ) : (
        <>
          <p className="mt-2 text-center text-xs text-muted">Prénom non reconnu : choisissez</p>
          <div className="grid grid-cols-2 gap-2">
            {(["M.", "Mme"] as const).map((civilite) => (
              <WhatsappSendButton key={civilite} waUrl={relanceWhatsappUrl(item.phone, premiumMessage({ ...item, civilite }, item.step, now))} recordUrl={recordUrl}>
                {civilite === "M." ? "Monsieur" : "Madame"}
              </WhatsappSendButton>
            ))}
          </div>
        </>
      )}
    </article>
  );
}

/**
 * CRM des relances WhatsApp à la main (provisoire) : 5 colonnes = les 5 messages (22 nov. 2026). Une carte n'apparaît que le jour
 * où son message est dû. Un clic ouvre WhatsApp avec le message écrit et passe la personne à l'étape suivante.
 */
export default async function RelancesPage({ searchParams }: { searchParams: Promise<{ rouvrir?: string; annonce?: string }> }) {
  const now = new Date();
  const sp = await searchParams;
  const reopenedId = sp.rouvrir || null;
  const [announceQueue, emailAllowance] = await Promise.all([extraitAnnounceQueue().catch(() => []), automatedEmailAllowance().catch(() => 0)]);
  const announceMax = Math.min(announceQueue.length, emailAllowance, 80);
  const reopened =
    reopenedId && reopenedId !== "introuvable"
      ? await getDb().query.prospects.findFirst({ where: eq(schema.prospects.id, reopenedId), columns: { id: true, name: true, email: true, phone: true, offerReopenUntil: true } })
      : null;
  const startOfDay = new Date(now.getTime() - ((now.getTime() + 3_600_000) % 86_400_000));
  const [queue, models, recentClients, projects, noWa] = await Promise.all([
    relanceQueue(now),
    countPublishedPlans(),
    getDb().query.prospects.findMany({
      where: and(eq(schema.prospects.pipelineStage, "client"), gte(schema.prospects.pipelineUpdatedAt, new Date(now.getTime() - 7 * 86_400_000))),
      orderBy: [desc(schema.prospects.pipelineUpdatedAt)],
      limit: 20,
      columns: { id: true, name: true, email: true, pipelineUpdatedAt: true },
    }),
    projectQueue(now),
    noWhatsappList(),
  ]);
  const premium = await premiumQueue(now).catch((error) => {
    console.error("Relances Premium : file indisponible", error);
    return [] as PremiumItem[];
  });
  const premiumDue = premium.filter((i) => i.due);
  const phase1 = await phaseOneStats(30, now).catch((error) => {
    console.error("Passage au catalogue : calcul impossible", error);
    return null;
  });
  const heatCount = (["brulant", "chaud", "tiede", "froid"] as const).map((l) => ({ level: l, n: queue.filter((i) => i.heat.level === l).length }));
  const pct = (r: number | null) => (r === null ? "—" : `${Math.round(r * 100)} %`);
  // Les plus chauds en haut de chaque colonne (demande de Tao, 24 nov.).
  const due = queue.filter((i) => i.due).sort((a, b) => b.heat.score - a.heat.score || a.dueAt.getTime() - b.dueAt.getTime());
  const upcoming = queue.filter((i) => !i.due).sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
  const sentToday = queue
    .concat()
    .filter((i) => i.lastSentAt && i.lastSentAt.getTime() >= startOfDay.getTime())
    .sort((a, b) => b.lastSentAt!.getTime() - a.lastSentAt!.getTime());
  const n = models ?? 0;

  return (
    <div>
      <PageTitle
        title="Relances WhatsApp"
        subtitle={`À envoyer aujourd'hui : ${due.length} message${due.length > 1 ? "s" : ""} · ${upcoming.length} à venir · ${recentClients.length} passé${recentClients.length > 1 ? "s" : ""} au Catalogue Premium en 7 jours`}
      />

      {!waManual() ? (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm">
          Les envois automatiques sont actifs : cette page sert seulement de secours.
        </p>
      ) : null}

      <section className="mb-5 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-outline bg-white p-4 text-sm">
          <p className="font-semibold">Chaleur des leads en séquence (temps réel)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {heatCount.map((h) => (
              <span key={h.level} className={`rounded-full px-3 py-1 text-xs font-semibold ${HEAT_STYLE[h.level]}`}>
                {HEAT_LABEL[h.level]} : {h.n}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            Calculée sur ce que la personne fait : paiement du catalogue commencé, vidéo regardée, messages écrits, liens cliqués, extrait en ligne, note de l&apos;IA. Une
            action de plus d&apos;une semaine compte moitié.
          </p>
        </div>
        {phase1 ? (
          <div className="rounded-xl border border-outline bg-white p-4 text-sm">
            <p className="font-semibold">
              Passage au catalogue en fin de 1re séquence (30 j) : {pct(phase1.total.rate)}{" "}
              <span className="font-normal text-muted">
                ({phase1.total.converted}/{phase1.total.ended} séquences terminées · objectif 10 % · {phase1.total.running} en cours)
              </span>
            </p>
            <p className="mt-1 text-xs">
              {phase1.byOffer.map((g) => `${g.key === "extrait" ? "Extrait" : "Guide"} : ${pct(g.rate)} (${g.converted}/${g.ended})`).join(" · ")}
            </p>
            <p className="mt-1 text-xs text-muted">
              {phase1.byCountry
                .filter((g) => g.ended + g.running > 0)
                .map((g) => `${g.key} ${pct(g.rate)} (${g.converted}/${g.ended}${g.running ? `, ${g.running} en cours` : ""})`)
                .join(" · ")}
            </p>
          </div>
        ) : null}
      </section>

      <details className="mb-5 rounded-xl border border-outline bg-white p-4 text-sm">
        <summary className="cursor-pointer font-semibold">Mode d&apos;emploi (30 secondes)</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-foreground/80">
          <li>Ouvrez cette page sur le téléphone où WhatsApp Business (653 76 99 98) est installé.</li>
          <li>Touchez le bouton vert : WhatsApp s&apos;ouvre sur la conversation, avec le message déjà écrit.</li>
          <li>Joignez le fichier indiqué (📎) depuis la galerie ou les fichiers du téléphone, puis envoyez.</li>
          <li>Revenez ici : la carte a disparu, le message suivant reviendra tout seul le bon jour.</li>
        </ol>
        <p className="mt-2 text-xs text-muted">
          Une personne qui achète le Catalogue Premium sort toute seule de la liste. Vous n&apos;avez pas pu envoyer ? « Pas envoyé » en bas de page remet la carte.
        </p>
      </details>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {RELANCE_STEPS.map((s, step) => {
          const cards = due.filter((i) => i.step === step);
          const later = upcoming.filter((i) => i.step === step);
          return (
            <section key={s.title} className={`rounded-2xl border p-3 ${COLUMN_STYLE[step]}`}>
              <h2 className="flex items-center justify-between px-1 font-semibold">
                {s.title}
                <span className="rounded-full bg-white px-2.5 py-0.5 text-sm">{cards.length}</span>
              </h2>
              <p className="mb-3 px-1 text-xs text-muted">
                À envoyer {s.when}
                {s.file ? ` · 📎 ${s.file}` : " · texte seul"}

              </p>
              <div className="space-y-2">
                {cards.length === 0 ? <p className="rounded-xl bg-white/70 p-3 text-center text-sm text-muted">Rien à envoyer pour l&apos;instant ✅</p> : null}
                {cards.map((item) => (
                  <Card key={item.id} item={item} models={n} now={now} />
                ))}
              </div>
              {later.length ? (
                <details className="mt-3 px-1 text-xs">
                  <summary className="cursor-pointer text-muted">
                    À venir : {later.length} (prochain {when(later[0].dueAt, now)})
                  </summary>
                  <ul className="mt-1 space-y-0.5">
                    {later.map((i) => (
                      <li key={i.id}>
                        {i.name || i.email} · {when(i.dueAt, now)}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </section>
          );
        })}
      </div>

      <section className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-3">
        <h2 className="flex items-center justify-between px-1 font-semibold">
          Accompagnement · Formulaire « Mon projet » (J10)
          <span className="rounded-full bg-white px-2.5 py-0.5 text-sm">{projects.length}</span>
        </h2>
        <p className="mb-3 px-1 text-xs text-muted">
          10 jours après l&apos;achat, une fois la phase de l&apos;offre terminée. Le lien est personnel : les réponses vont sur la fiche, puis la personne arrive sur le
          catalogue des villas ou des duplex. Rien à joindre.
        </p>
        {projects.length === 0 ? <p className="rounded-xl bg-white/70 p-3 text-center text-sm text-muted">Rien à envoyer pour l&apos;instant ✅</p> : null}
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((item) => (
            <ProjectCard key={item.id} item={item} now={now} />
          ))}
        </div>
      </section>

      <section id="premium" className="mt-6 rounded-2xl border border-violet-300 bg-violet-50 p-3">
        <h2 className="px-1 font-semibold">Membres Premium → plans complets ({premiumDue.length} à envoyer)</h2>
        <p className="mb-3 px-1 text-xs text-muted">
          3 messages pour amener les membres vers les plans complets. Les plus actifs (connexion récente, modèles ouverts) sont en haut. Quand un membre répond avec un code de
          modèle, créez sa demande dans le CRM.
        </p>
        <div className="grid gap-3 lg:grid-cols-3">
          {PREMIUM_STEPS.map((s, step) => {
            const cards = premiumDue.filter((i) => i.step === step);
            return (
              <div key={s.title} className="rounded-xl bg-white/60 p-2">
                <p className="flex items-center justify-between px-1 text-sm font-semibold">
                  {s.title}
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs">{cards.length}</span>
                </p>
                <p className="mb-2 px-1 text-xs text-muted">{s.when}</p>
                <div className="space-y-2">
                  {cards.length === 0 ? <p className="rounded-xl bg-white/70 p-3 text-center text-sm text-muted">Rien à envoyer ✅</p> : null}
                  {cards.slice(0, 40).map((item) => (
                    <PremiumCard key={item.id} item={item} now={now} />
                  ))}
                  {cards.length > 40 ? <p className="px-1 text-xs text-muted">+ {cards.length - 40} autres, à la suite.</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-outline bg-white p-4">
          <h2 className="font-semibold">Envoyés aujourd&apos;hui ({sentToday.length})</h2>
          {sentToday.length === 0 ? <p className="mt-2 text-sm text-muted">Aucun pour l&apos;instant.</p> : null}
          <ul className="mt-2 divide-y divide-outline/60 text-sm">
            {sentToday.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2 py-2">
                <span>
                  {i.name || i.email} · message {i.step} envoyé {ago(i.lastSentAt!, now)}
                </span>
                <form action={undoRelance}>
                  <input type="hidden" name="id" value={i.id} />
                  <button className="rounded border border-outline px-2 py-0.5 text-xs hover:bg-background">Pas envoyé</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4">
          <h2 className="font-semibold">Passés au Catalogue Premium (7 jours) 🎉</h2>
          {recentClients.length === 0 ? <p className="mt-2 text-sm text-muted">Pas encore cette semaine.</p> : null}
          <ul className="mt-2 space-y-1 text-sm">
            {recentClients.map((c) => (
              <li key={c.id}>{c.name || c.email}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            Toutes les étapes (chaud, tiède, froid…) : <Link href="/admin/pipeline" className="font-semibold text-primary">Pipeline</Link>
          </p>
        </section>
      </div>

      <section id="extrait-en-ligne" className="mt-6 rounded-2xl border border-sky-300 bg-sky-50 p-4">
        <h2 className="font-semibold">Extrait en ligne · prévenir les acheteurs déjà livrés</h2>
        <p className="mt-1 text-xs text-muted">
          Un email avec leur lien personnel (/mon-extrait/…), une seule fois par acheteur. Les nouveaux acheteurs le reçoivent déjà dans l&apos;email de livraison et le
          message WhatsApp 1. Clients du catalogue et désinscrits exclus.
        </p>
        <p className="mt-2 text-sm">
          À prévenir : <strong>{announceQueue.length}</strong> · emails disponibles aujourd&apos;hui : {emailAllowance}
        </p>
        {sp.annonce ? <p className="mt-1 text-sm text-emerald-700">Envoyés : {sp.annonce.split("-")[0]} · échecs : {sp.annonce.split("-")[1]}</p> : null}
        {announceMax > 0 ? (
          <form action={announceExtraitWeb} className="mt-2">
            <input type="hidden" name="max" value={announceMax} />
            <button className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-white">Envoyer à {announceMax} acheteur{announceMax > 1 ? "s" : ""}</button>
          </form>
        ) : null}
      </section>

      <section id="deuxieme-chance" className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-4">
        <h2 className="font-semibold">Deuxième chance · Rouvrir l&apos;offre 24 h</h2>
        <p className="mt-1 text-xs text-muted">
          Quelqu&apos;un vous demande le prix réservé après sa date : entrez son email ou son numéro WhatsApp. Son prix de{" "}
          {formatFcfa(catalogueReservedPrice())} redevient valable 24 h (la page affiche la nouvelle date), puis envoyez-lui son lien personnel.
        </p>
        <form action={reopenOffer} className="mt-2 flex max-w-lg gap-1.5 text-sm">
          <input name="q" placeholder="Email ou numéro WhatsApp" className="min-w-0 flex-1 rounded border border-outline bg-white px-2 py-1.5" required />
          <button className="rounded bg-secondary px-3 py-1.5 font-semibold text-white">Rouvrir 24 h</button>
        </form>
        {reopenedId === "introuvable" ? (
          <p className="mt-2 text-sm text-red-700">Aucune fiche trouvée (ou plusieurs avec ce numéro) : essayez avec l&apos;email.</p>
        ) : null}
        {reopened?.offerReopenUntil ? (
          <div className="mt-2 rounded-lg bg-white p-3 text-sm">
            <p>
              ✅ Offre rouverte pour <strong>{reopened.name || reopened.email}</strong> jusqu&apos;au {deadlineLabel(reopened.offerReopenUntil)} (heure d&apos;Abidjan).
            </p>
            <p className="mt-1 break-all text-xs">
              Lien personnel à envoyer : <span className="font-mono">{siteUrl(`/r/${reopened.id}.offre`)}</span>
            </p>
          </div>
        ) : null}
      </section>

      {noWa.length ? (
        <section className="mt-6 rounded-2xl border border-outline bg-white p-4">
          <h2 className="font-semibold">Sans WhatsApp ({noWa.length})</h2>
          <p className="mt-1 text-xs text-muted">Hors des relances WhatsApp ; les emails continuent. Corrigez le numéro pour les remettre dans la file.</p>
          <ul className="mt-2 divide-y divide-outline/60 text-sm">
            {noWa.map((p) => (
              <li key={p.id} className="py-2">
                <p>
                  {p.name || p.email} · <span className="text-muted">{p.phone || "—"}</span>
                </p>
                <form action={fixWhatsappNumber} className="mt-1.5 flex gap-1.5 text-xs">
                  <input type="hidden" name="id" value={p.id} />
                  <input name="phone" id={`phone-nowa-${p.id}`} inputMode="tel" placeholder="Vrai WhatsApp avec indicatif" className="min-w-0 flex-1 rounded border border-outline px-2 py-1.5" required />
                  <button className="rounded bg-primary px-2.5 py-1.5 font-semibold text-white">Corriger</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
