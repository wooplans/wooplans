import Link from "next/link";
import { cookies } from "next/headers";
import { and, desc, eq, inArray, isNull, like, or, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { Badge, fmtDate, fmtDateTime, PageTitle, pct, Stat, Table } from "@/components/admin/ui";
import { whatsappUrl } from "@/lib/phone";
import { formatFcfa } from "@/lib/plans";
import { automatedEmailAllowance } from "@/lib/email-budget";
import { getProspectSettings } from "@/lib/prospects";
import { importProspects, markLost, saveSettings, startOne, startRecent, stopOne } from "./actions";

export const dynamic = "force-dynamic";

const VIEWS = [
  { id: "ouverts", label: "À convertir" },
  { id: "convertis", label: "Convertis" },
  { id: "arretes", label: "Désinscrits / perdus" },
  { id: "tous", label: "Tous" },
] as const;

const EVENTS = {
  abandoned: { label: "Abandonné", tone: "warn" },
  failed: { label: "Échoué", tone: "bad" },
  started: { label: "Email laissé", tone: "neutral" },
  gift: { label: "Plan et devis offert", tone: "neutral" },
} as const;

const SOURCES = { webhook: "Chariow (direct)", chariow_import: "Historique Chariow", site: "Site", gift: "Cadeau (fiche modèle)" } as const;

export default async function ProspectsPage({ searchParams }: { searchParams: Promise<{ vue?: string; q?: string }> }) {
  const { vue = "ouverts", q } = await searchParams;
  const notice = (await cookies()).get("wp_notice")?.value;
  const db = getDb();
  const [settings, allowance] = await Promise.all([getProspectSettings(), automatedEmailAllowance()]);
  const total = settings.delaysHours.length;

  const filters: SQL[] = [];
  if (vue === "ouverts") filters.push(eq(schema.prospects.status, "open"));
  else if (vue === "convertis") filters.push(eq(schema.prospects.status, "converted"));
  else if (vue === "arretes") filters.push(inArray(schema.prospects.status, ["unsubscribed", "lost"]));
  const term = (q || "").trim();
  if (term) {
    filters.push(or(like(schema.prospects.email, `%${term}%`), like(schema.prospects.name, `%${term}%`), like(schema.prospects.phone, `%${term}%`))!);
  }

  const [rows, all] = await Promise.all([
    db.query.prospects.findMany({
      where: filters.length ? and(...filters) : undefined,
      orderBy: desc(schema.prospects.lastEventAt),
      limit: 300,
    }),
    db.query.prospects.findMany({ columns: { status: true, nextEmailAt: true, sequenceStartedAt: true, lastEventAt: true } }),
  ]);
  const count = (fn: (p: (typeof all)[number]) => boolean) => all.filter(fn).length;
  const open = count((p) => p.status === "open");
  const running = count((p) => p.status === "open" && Boolean(p.nextEmailAt));
  const converted = count((p) => p.status === "converted");
  const stopped = count((p) => p.status === "unsubscribed" || p.status === "lost");
  const recentNeverStarted = count(
    (p) => p.status === "open" && !p.sequenceStartedAt && p.lastEventAt.getTime() > Date.now() - 30 * 86400_000,
  );
  const neverStarted = await db.query.prospects.findMany({
    where: and(eq(schema.prospects.status, "open"), isNull(schema.prospects.sequenceStartedAt)),
    columns: { id: true },
  });

  return (
    <>
      <PageTitle
        title="Prospects Catalogue Premium"
        subtitle="Paiements abandonnés ou échoués. Relance automatique par email, arrêtée dès que la personne paie ou se désinscrit."
        actions={
          <form action={importProspects}>
            <button className="btn-ghost py-2">Importer l&apos;historique Chariow</button>
          </form>
        }
      />
      {notice ? <p className="mb-4 rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary">{notice}</p> : null}
      {settings.enabled && allowance === 0 ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Quota d&apos;emails automatiques atteint pour aujourd&apos;hui : les relances dues partiront dès que le quota se libère (Réglages).
        </p>
      ) : null}
      {!settings.enabled ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Les emails de relance sont en pause (réglages en bas de page).
        </p>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="À convertir" value={String(open)} hint={`${running} en cours de relance`} />
        <Stat label="Convertis" value={String(converted)} hint={all.length ? `${pct(converted / all.length)} des prospects` : undefined} />
        <Stat label="Jamais relancés" value={String(neverStarted.length)} hint={`dont ${recentNeverStarted} de moins de 30 jours`} />
        <Stat label="Désinscrits / perdus" value={String(stopped)} />
      </div>

      {recentNeverStarted > 0 ? (
        <form action={startRecent} className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-outline bg-surface p-4 text-sm">
          <span>
            Lancer la séquence pour les prospects jamais relancés des
          </span>
          <input name="days" type="number" min={1} max={365} defaultValue={30} className="input w-20 py-1.5" />
          <span>derniers jours</span>
          <button className="btn-primary py-2">Lancer la relance</button>
        </form>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-full border border-outline bg-surface p-1 text-sm">
          {VIEWS.map((v) => (
            <Link
              key={v.id}
              href={`/admin/prospects?vue=${v.id}`}
              className={`rounded-full px-3 py-1 ${vue === v.id ? "bg-primary text-white" : "text-foreground/70 hover:text-primary"}`}
            >
              {v.label}
            </Link>
          ))}
        </div>
        <form className="flex gap-2">
          <input type="hidden" name="vue" value={vue} />
          <input name="q" defaultValue={term} placeholder="Email, nom, téléphone" className="input py-2" />
          <button className="btn-ghost py-2">Chercher</button>
        </form>
      </div>

      <Table head={["Prospect", "WhatsApp", "Paiement", "Relance email", "Provenance", "Actions"]} empty={rows.length === 0}>
        {rows.map((p) => {
          const ev = EVENTS[p.lastEvent];
          const firstName = (p.name || "").split(" ")[0];
          const wa = whatsappUrl(
            p.phone,
            p.lastEvent === "failed"
              ? `Bonjour ${firstName}, ici WOOPLANS. Votre paiement du Catalogue Premium n'a pas abouti : puis-je vous aider à le finaliser ?`
              : `Bonjour ${firstName}, ici WOOPLANS. Vous avez commencé à commander le Catalogue Premium : avez-vous rencontré un souci ? Je peux vous aider.`,
          );
          return (
            <tr key={p.id}>
              <td className="px-4 py-2.5">
                <p className="font-medium">{p.email}</p>
                <p className="text-xs text-muted">{[p.name, p.country].filter(Boolean).join(" · ") || "—"}</p>
              </td>
              <td className="px-4 py-2.5">
                {wa ? (
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-full bg-[#25D366] px-3 py-1 text-xs font-semibold text-white">
                    WhatsApp
                  </a>
                ) : (
                  <span className="text-xs text-muted">—</span>
                )}
              </td>
              <td className="px-4 py-2.5">
                <Badge tone={ev.tone}>{ev.label}</Badge>
                <p className="mt-1 text-xs text-muted">
                  {fmtDate(p.lastEventAt)}
                  {p.amount ? ` · ${formatFcfa(p.amount)}` : ""}
                </p>
              </td>
              <td className="px-4 py-2.5 text-xs">
                {p.status === "converted" ? (
                  <Badge tone="good">Payé le {fmtDate(p.convertedAt)}</Badge>
                ) : p.status === "unsubscribed" ? (
                  <Badge>Désinscrit</Badge>
                ) : p.status === "lost" ? (
                  <Badge>Perdu</Badge>
                ) : p.nextEmailAt ? (
                  <>
                    <p className="font-semibold">Email {Math.min(p.sequenceStep + 1, total)}/{total}</p>
                    <p className="text-muted">le {fmtDateTime(p.nextEmailAt)}</p>
                  </>
                ) : p.sequenceStartedAt ? (
                  <p className="text-muted">Terminée ({p.sequenceStep}/{total} envoyés)</p>
                ) : (
                  <p className="text-muted">Non démarrée</p>
                )}
              </td>
              <td className="px-4 py-2.5 text-xs">
                <p>{SOURCES[p.source]}</p>
                {p.utmSource ? <p className="text-muted">{[p.utmSource, p.utmCampaign].filter(Boolean).join(" / ")}</p> : null}
              </td>
              <td className="px-4 py-2.5">
                {p.status === "open" || p.status === "lost" ? (
                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    {p.nextEmailAt ? (
                      <form action={stopOne.bind(null, p.id)}><button className="text-secondary">Arrêter</button></form>
                    ) : (
                      <form action={startOne.bind(null, p.id)}>
                        <button className="text-primary">{p.sequenceStartedAt ? "Relancer" : "Démarrer la relance"}</button>
                      </form>
                    )}
                    {p.status === "open" ? (
                      <form action={markLost.bind(null, p.id)}><button className="text-muted">Perdu</button></form>
                    ) : null}
                  </div>
                ) : null}
              </td>
            </tr>
          );
        })}
      </Table>

      <section className="card mt-8 p-5">
        <h2 className="font-semibold">Relances automatiques</h2>
        <p className="mt-1 text-sm text-muted">
          Emails envoyés après un paiement abandonné ou échoué : 1) aide au paiement, 2) ce que contient le catalogue,
          3) offre avec le code de réduction, 4) dernier rappel. La séquence s&apos;arrête dès le paiement ou la désinscription.
        </p>
        <form action={saveSettings} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" name="enabled" defaultChecked={settings.enabled} /> Envois automatiques actifs
          </label>
          <label className="text-sm">
            <span className="label">Délais des emails (heures après l&apos;abandon)</span>
            <input name="delays" defaultValue={settings.delaysHours.join(", ")} className="input" />
            <span className="mt-1 block text-xs text-muted">Ex. 1, 24, 72, 168 = 1 h, 1 jour, 3 jours, 7 jours.</span>
          </label>
          <label className="text-sm">
            <span className="label">Emails maximum par passage (toutes les 15 min)</span>
            <input name="perRun" type="number" min={1} max={100} defaultValue={settings.perRun} className="input" />
          </label>
          <label className="text-sm">
            <span className="label">Code de réduction Chariow (vide = pas d&apos;offre)</span>
            <input name="discountCode" defaultValue={settings.discountCode} className="input font-mono uppercase" />
            <span className="mt-1 block text-xs text-muted">Le code doit exister et être actif dans Chariow.</span>
          </label>
          <label className="text-sm">
            <span className="label">Libellé de la réduction</span>
            <input name="discountLabel" defaultValue={settings.discountLabel} className="input" />
          </label>
          <div className="md:col-span-2">
            <button className="btn-primary">Enregistrer</button>
          </div>
        </form>
      </section>
    </>
  );
}
