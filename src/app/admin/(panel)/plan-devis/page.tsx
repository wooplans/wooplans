import { inArray } from "drizzle-orm";
import Link from "next/link";
import { getDb, schema } from "@/db";
import { DailyBars } from "@/components/admin/DailyBars";
import { Badge, DayPicker, fmtDateTime, PageTitle, PeriodTabs, pct, Stat, Table } from "@/components/admin/ui";
import { getPlanDevisSeries, getPlanDevisStats } from "@/lib/analytics";
import { localDay, parseRange } from "@/lib/date-range";
import { formatFcfa } from "@/lib/plans";
import { UPSELL } from "@/lib/upsell";
import { UPSELL_CAMPAIGN_BATCH, upsellCampaignRecipients } from "@/lib/upsell-campaign";
import { sendUpsellCampaign } from "./actions";

const STATUS = {
  started: { label: "En cours / sans suite", tone: "neutral" },
  paid: { label: "Payé", tone: "good" },
  failed: { label: "Échoué", tone: "bad" },
  abandoned: { label: "Abandonné", tone: "warn" },
  gift: { label: "Offert", tone: "info" },
} as const;

/** Tableau de bord du plan et devis d'un modèle (14 900 FCFA), à part du Catalogue Premium. */
export default async function PlanDevisDashboard({
  searchParams,
}: {
  searchParams: Promise<{ jours?: string; jour?: string; offre?: string; envoyes?: string; echecs?: string; restants?: string }>;
}) {
  const params = await searchParams;
  const range = parseRange(params);
  const [k, series, campaign] = await Promise.all([getPlanDevisStats(range), getPlanDevisSeries(range), upsellCampaignRecipients()]);
  const slugs = [...new Set([...k.models.map((m) => m.slug), ...k.recent.map((r) => r.slug).filter((s): s is string => Boolean(s))])];
  const plans = slugs.length ? await getDb().query.plans.findMany({ where: inArray(schema.plans.slug, slugs), columns: { slug: true, code: true } }) : [];
  const code = (slug: string | null) => (slug ? (plans.find((p) => p.slug === slug)?.code ?? slug) : "—");
  const n = (v: number) => v.toLocaleString("fr-FR");
  const rate = (a: number, b: number) => (b ? pct(a / b) : "—");
  const periodLabel = range.day
    ? new Date(range.day).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    : range.days === 365
      ? "Les 12 derniers mois"
      : `Les ${range.days} derniers jours`;
  const perLabel = range.day ? "par heure" : "par jour";
  const funnel = [
    { label: "Visiteurs des fiches", value: k.ficheVisitors },
    { label: "Ont cliqué « Recevoir mon plan et devis »", value: k.buyClickVisitors },
    { label: "Paiements démarrés", value: k.checkouts },
    { label: "Payés", value: k.paid },
  ];

  return (
    <>
      <PageTitle
        title="Plan et devis"
        subtitle={`${periodLabel} · heure du Cameroun · essais du propriétaire et plans offerts exclus des paiements`}
        actions={
          <>
            <PeriodTabs current={range.day ? null : range.days} base="/admin/plan-devis" />
            <DayPicker day={range.day ?? null} today={localDay(new Date())} base="/admin/plan-devis" />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Revenu" value={formatFcfa(k.revenue)} hint={`${n(k.purchases)} achats`} />
        <Stat label="Paiements démarrés" value={n(k.checkouts)} hint={`${n(k.pending)} sans suite pour l'instant`} />
        <Stat label="Payés" value={n(k.paid)} hint={`${rate(k.paid, k.checkouts)} des paiements démarrés`} />
        <Stat label="Abandonnés" value={n(k.abandoned)} hint="à relancer sur WhatsApp" />
        <Stat label="Échoués" value={n(k.failed)} hint="refus Mobile Money ou carte" />
        <Stat label="Conversion des fiches" value={pct(k.conversion)} hint="achats / visiteurs des fiches" />
      </div>

      <section className="mt-6 card border-2 border-secondary/40 p-5">
        <h2 className="text-sm font-semibold">Offre {UPSELL.code} aux anciens clients</h2>
        <p className="mt-1 text-sm text-muted">
          Email à ceux qui ont déjà payé un plan et devis : code {UPSELL.code} (−{formatFcfa(UPSELL.discount)} par plan), valable 24 h à partir de
          l&apos;envoi, modèles du même type que celui acheté et capture des étapes. Un seul envoi par client ; essais du propriétaire et désinscrits
          exclus.
        </p>
        <p className="mt-3 text-sm">
          <strong>{n(campaign.pending.length)}</strong> client(s) à qui l&apos;envoyer · <strong>{n(campaign.alreadySent)}</strong> déjà servi(s)
        </p>
        {params.offre === "ok" ? (
          <p className="mt-2 rounded-xl bg-primary/10 px-3 py-2 text-sm">
            Envoyés : {params.envoyes ?? 0} · échecs : {params.echecs ?? 0} · restants : {params.restants ?? 0}
          </p>
        ) : params.offre === "confirmer" ? (
          <p className="mt-2 rounded-xl bg-secondary/10 px-3 py-2 text-sm text-secondary">Cochez la case de confirmation avant d&apos;envoyer.</p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <a href="/api/admin/offre-clients" target="_blank" className="rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary">
            Voir l&apos;email
          </a>
          {campaign.pending.length > 0 ? (
            <form action={sendUpsellCampaign} className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="confirm" value="1" required /> J&apos;ai relu l&apos;email
              </label>
              <button type="submit" className="rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-white">
                Envoyer à {n(Math.min(campaign.pending.length, UPSELL_CAMPAIGN_BATCH))} client(s)
              </button>
            </form>
          ) : null}
        </div>
        {campaign.pending.length > UPSELL_CAMPAIGN_BATCH ? (
          <p className="mt-2 text-xs text-muted">Envoi par lots de {UPSELL_CAMPAIGN_BATCH} : cliquez à nouveau pour le lot suivant.</p>
        ) : null}
      </section>

      <section className="mt-6 card p-5">
        <h2 className="text-sm font-semibold">Tunnel</h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-4">
          {funnel.map((step, i) => {
            const prev = i > 0 ? funnel[i - 1].value : null;
            return (
              <li key={step.label} className="rounded-xl bg-background p-4">
                <p className="text-xs text-muted">{step.label}</p>
                <p className="mt-1 text-2xl font-bold">{n(step.value)}</p>
                {prev ? <p className="text-xs text-muted">{pct(step.value / prev)} de l&apos;étape précédente</p> : null}
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-sm">
          <span className="text-muted">Ont ouvert l&apos;aperçu du plan et devis :</span> <strong>{n(k.previewVisitors)}</strong>
          <span className="text-muted"> · Vues des fiches :</span> <strong>{n(k.ficheViews)}</strong>
        </p>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <DailyBars title={`Paiements démarrés ${perLabel}`} data={series.map((s) => ({ day: s.day, value: s.checkouts }))} format={n} />
        <DailyBars title={`Revenu plan et devis ${perLabel}`} data={series.map((s) => ({ day: s.day, value: s.revenue }))} format={formatFcfa} />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Par modèle</h2>
        <Table head={["Modèle", "Visiteurs", "Paiements démarrés", "Payés", "Conversion"]} empty={k.models.length === 0}>
          {k.models.map((m) => (
            <tr key={m.slug}>
              <td className="px-4 py-2.5 font-medium">
                <Link href={`/catalogue/${m.slug}`} target="_blank" className="hover:text-primary">{code(m.slug)}</Link>
              </td>
              <td className="px-4 py-2.5">{n(m.visitors)}</td>
              <td className="px-4 py-2.5">{n(m.checkouts)}</td>
              <td className="px-4 py-2.5">{n(m.paid)}</td>
              <td className="px-4 py-2.5">{rate(m.paid, m.visitors)}</td>
            </tr>
          ))}
        </Table>
      </section>

      <section className="mt-8">
        <h2 className="mb-1 text-lg font-semibold">Par campagne</h2>
        <p className="mb-3 text-sm text-muted">Campagne UTM de la première visite (« — » : sans campagne).</p>
        <Table head={["Campagne", "Source", "Visiteurs des fiches", "Paiements démarrés", "Payés", "Conversion"]} empty={k.campaigns.length === 0}>
          {k.campaigns.map((c) => (
            <tr key={`${c.campaign}|${c.source ?? ""}`}>
              <td className="px-4 py-2.5 font-medium">{c.campaign || "—"}</td>
              <td className="px-4 py-2.5">{c.source || "—"}</td>
              <td className="px-4 py-2.5">{n(c.visitors)}</td>
              <td className="px-4 py-2.5">{n(c.checkouts)}</td>
              <td className="px-4 py-2.5">{n(c.paid)}</td>
              <td className="px-4 py-2.5">{rate(c.paid, c.visitors)}</td>
            </tr>
          ))}
        </Table>
      </section>

      <section className="mt-8">
        <h2 className="mb-1 text-lg font-semibold">Derniers paiements</h2>
        <p className="mb-3 text-sm text-muted">
          Pour renvoyer un plan et devis payé (email non reçu), utilisez les boutons WhatsApp et PDF de la page{" "}
          <Link href="/admin/ventes" className="font-medium text-primary hover:underline">Ventes</Link>.
        </p>
        <Table head={["Date", "Modèle", "Email saisi", "Statut", "Téléchargements"]} empty={k.recent.length === 0}>
          {k.recent.map((r) => {
            const s = STATUS[r.status];
            return (
              <tr key={r.id}>
                <td className="px-4 py-2.5 whitespace-nowrap">{fmtDateTime(r.createdAt)}</td>
                <td className="px-4 py-2.5 font-medium">{code(r.slug)}</td>
                <td className="px-4 py-2.5 text-xs">{r.email || "—"}</td>
                <td className="px-4 py-2.5"><Badge tone={s.tone}>{s.label}</Badge></td>
                <td className="px-4 py-2.5">{r.status === "paid" ? (r.downloads ? n(r.downloads) : <span className="font-semibold text-secondary">0</span>) : "—"}</td>
              </tr>
            );
          })}
        </Table>
      </section>
    </>
  );
}
