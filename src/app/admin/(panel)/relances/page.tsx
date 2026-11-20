import Link from "next/link";
import { and, desc, eq, gte } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { Badge, PageTitle } from "@/components/admin/ui";
import { WhatsappSendButton } from "@/components/admin/WhatsappSendButton";
import { countPublishedPlans } from "@/lib/plans";
import { projectMessage, projectQueue, RELANCE_STEPS, relanceAttachment, relanceMessage, relanceQueue, relanceWhatsappUrl, type ProjectItem, type RelanceItem } from "@/lib/relances";
import { waManual } from "@/lib/whatsapp";
import { undoRelance } from "./actions";

export const dynamic = "force-dynamic";

const COLUMN_STYLE = ["border-sky-300 bg-sky-50", "border-amber-300 bg-amber-50", "border-orange-300 bg-orange-50"];

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
        </div>
        <Badge tone={item.offer === "extrait" ? "good" : "info"}>{item.offer === "extrait" ? "Extrait" : "Guide"}</Badge>
      </div>
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
      <p className="mt-2 text-center text-xs text-muted">
        📎 Joindre : {file.url ? (
          <a href={file.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
            {file.label}
          </a>
        ) : (
          file.label
        )}
      </p>
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
    </article>
  );
}

/**
 * CRM des relances WhatsApp à la main (provisoire) : 3 colonnes = les 3 messages. Une carte n'apparaît que le jour
 * où son message est dû. Un clic ouvre WhatsApp avec le message écrit et passe la personne à l'étape suivante.
 */
export default async function RelancesPage() {
  const now = new Date();
  const startOfDay = new Date(now.getTime() - ((now.getTime() + 3_600_000) % 86_400_000));
  const [queue, models, recentClients, projects] = await Promise.all([
    relanceQueue(now),
    countPublishedPlans(),
    getDb().query.prospects.findMany({
      where: and(eq(schema.prospects.pipelineStage, "client"), gte(schema.prospects.pipelineUpdatedAt, new Date(now.getTime() - 7 * 86_400_000))),
      orderBy: [desc(schema.prospects.pipelineUpdatedAt)],
      limit: 20,
      columns: { id: true, name: true, email: true, pipelineUpdatedAt: true },
    }),
    projectQueue(now),
  ]);
  const due = queue.filter((i) => i.due).sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
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

      <div className="grid gap-3 lg:grid-cols-3">
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
                À envoyer {s.when} · 📎 {s.file}
                {step === 1 ? (
                  <>
                    {" "}·{" "}
                    <a href="/assets/catalogue/catalogue-premium.mp4" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary">
                      télécharger
                    </a>
                  </>
                ) : step === 2 ? (
                  <>
                    {" "}·{" "}
                    <a href="/assets/whatsapp/temoignage-bassirou.mp4" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary">
                      télécharger
                    </a>
                  </>
                ) : null}
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
          10 jours après l&apos;achat, une fois les 3 messages envoyés. Le lien est personnel : les réponses vont sur la fiche, puis la personne arrive sur le
          catalogue des villas ou des duplex. Rien à joindre.
        </p>
        {projects.length === 0 ? <p className="rounded-xl bg-white/70 p-3 text-center text-sm text-muted">Rien à envoyer pour l&apos;instant ✅</p> : null}
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((item) => (
            <ProjectCard key={item.id} item={item} now={now} />
          ))}
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
    </div>
  );
}
