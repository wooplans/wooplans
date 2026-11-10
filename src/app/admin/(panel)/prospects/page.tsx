import Link from "next/link";
import { cookies } from "next/headers";
import { and, desc, eq, inArray, isNull, like, or, sql, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { Badge, fmtDate, fmtDateTime, PageTitle, pct, Stat, Table } from "@/components/admin/ui";
import { whatsappUrl } from "@/lib/phone";
import { formatFcfa } from "@/lib/plans";
import { automatedEmailAllowance } from "@/lib/email-budget";
import { getProspectSettings } from "@/lib/prospects";
import { OFFRE_DELAYS_HOURS, WELCOME_DELAYS_HOURS } from "@/lib/prospect-sequence";
import { offreById } from "@/lib/offres";
import { siteUrl } from "@/lib/env";
import { importProspects, markLost, saveSettings, startOne, startRecent, stopOne } from "./actions";

export const dynamic = "force-dynamic";

const VIEWS = [
  { id: "ouverts", label: "À convertir" },
  { id: "non_telecharges", label: "Plan non téléchargé" },
  { id: "convertis", label: "Convertis" },
  { id: "arretes", label: "Désinscrits / perdus / rejetés" },
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
  // Deux séquences : relance (paiement abandonné ou échoué, délais réglables) et bienvenue (plan et devis offert).
  const totals = { relance: settings.delaysHours.length, bienvenue: WELCOME_DELAYS_HOURS.length, offre: OFFRE_DELAYS_HOURS.length };
  const SEQUENCES = { relance: "Relance", bienvenue: "Bienvenue", offre: "Relance offre" } as const;

  const filters: SQL[] = [];
  if (vue === "ouverts") filters.push(eq(schema.prospects.status, "open"));
  else if (vue === "convertis") filters.push(eq(schema.prospects.status, "converted"));
  else if (vue === "arretes") filters.push(inArray(schema.prospects.status, ["unsubscribed", "lost", "bounced"]));
  const term = (q || "").trim();
  if (term) {
    filters.push(or(like(schema.prospects.email, `%${term}%`), like(schema.prospects.name, `%${term}%`), like(schema.prospects.phone, `%${term}%`))!);
  }

  if (vue === "non_telecharges") filters.push(eq(schema.prospects.status, "open"), eq(schema.prospects.source, "gift"));
  const [fetched, all] = await Promise.all([
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
  const stopped = count((p) => p.status === "unsubscribed" || p.status === "lost" || p.status === "bounced");
  const recentNeverStarted = count(
    (p) => p.status === "open" && !p.sequenceStartedAt && p.lastEventAt.getTime() > Date.now() - 30 * 86400_000,
  );
  // Plans et devis offerts à chaque prospect (modèle, téléchargé ou non) et son parcours de paiement du catalogue.
  const giftEmails = fetched.filter((p) => p.source === "gift" || p.lastEvent === "gift").map((p) => p.email);
  const [gifts, payments] = giftEmails.length
    ? await Promise.all([
        db
          .select({
            email: schema.checkoutIntents.email,
            slug: schema.checkoutIntents.planSlug,
            downloads: schema.checkoutIntents.downloads,
            code: schema.plans.code,
            name: schema.plans.name,
          })
          .from(schema.checkoutIntents)
          .leftJoin(schema.plans, eq(schema.plans.slug, schema.checkoutIntents.planSlug))
          .where(and(eq(schema.checkoutIntents.status, "gift"), inArray(schema.checkoutIntents.email, giftEmails)))
          .orderBy(desc(schema.checkoutIntents.createdAt)),
        db
          .select({ email: schema.checkoutIntents.email, status: schema.checkoutIntents.status })
          .from(schema.checkoutIntents)
          .where(
            and(
              isNull(schema.checkoutIntents.planSlug),
              inArray(schema.checkoutIntents.status, ["started", "abandoned", "failed", "paid"]),
              inArray(schema.checkoutIntents.email, giftEmails),
            ),
          ),
      ])
    : [[], []];
  const giftsByEmail = new Map<string, { slug: string; code: string; name: string; downloads: number }[]>();
  for (const g of gifts) {
    if (!g.email || !g.slug) continue;
    const list = giftsByEmail.get(g.email) ?? [];
    const known = list.find((x) => x.slug === g.slug);
    if (known) known.downloads += g.downloads;
    else list.push({ slug: g.slug, code: g.code ?? g.slug, name: g.name ?? "", downloads: g.downloads });
    giftsByEmail.set(g.email, list);
  }
  const paymentByEmail = new Map<string, "paid" | "started">();
  for (const pay of payments) {
    if (!pay.email) continue;
    if (pay.status === "paid") paymentByEmail.set(pay.email, "paid");
    else if (!paymentByEmail.has(pay.email)) paymentByEmail.set(pay.email, "started");
  }
  // Offres tentées sur les fiches (plan et devis + catalogue offert) : modèle et prix, pour le message WhatsApp.
  const fetchedEmails = fetched.map((p) => p.email);
  const offerIntents = fetchedEmails.length
    ? await db
        .select({ email: schema.checkoutIntents.email, offer: schema.checkoutIntents.offer, slug: schema.checkoutIntents.planSlug, code: schema.plans.code, name: schema.plans.name })
        .from(schema.checkoutIntents)
        .leftJoin(schema.plans, eq(schema.plans.slug, schema.checkoutIntents.planSlug))
        .where(and(inArray(schema.checkoutIntents.email, fetchedEmails), sql`${schema.checkoutIntents.offer} is not null`))
        .orderBy(desc(schema.checkoutIntents.createdAt))
    : [];
  const offerByEmail = new Map<string, { slug: string; code: string; name: string; offreId: string; price: number }>();
  for (const o of offerIntents) {
    const offre = offreById(o.offer);
    if (!o.email || !o.slug || !offre || offerByEmail.has(o.email)) continue;
    offerByEmail.set(o.email, { slug: o.slug, code: o.code ?? o.slug, name: o.name ?? o.slug, offreId: offre.id, price: offre.price });
  }
  const rows =
    vue === "non_telecharges" ? fetched.filter((p) => (giftsByEmail.get(p.email) ?? []).every((g) => g.downloads === 0)) : fetched;
  // Efficacité du cadeau : parmi les adresses qui l'ont demandé, combien ont téléchargé le document ?
  const giftStats = await db
    .select({ email: schema.checkoutIntents.email, downloads: sql<number>`sum(${schema.checkoutIntents.downloads})` })
    .from(schema.checkoutIntents)
    .where(and(eq(schema.checkoutIntents.status, "gift"), sql`${schema.checkoutIntents.email} is not null`))
    .groupBy(schema.checkoutIntents.email);
  const giftTotal = giftStats.length;
  const giftDownloaded = giftStats.filter((g) => Number(g.downloads) > 0).length;

  const neverStarted = await db.query.prospects.findMany({
    where: and(eq(schema.prospects.status, "open"), isNull(schema.prospects.sequenceStartedAt)),
    columns: { id: true },
  });

  return (
    <>
      <PageTitle
        title="Prospects Catalogue Premium"
        subtitle="Plans et devis offerts (séquence de bienvenue) et paiements abandonnés ou échoués (relance). Emails automatiques, arrêtés dès que la personne paie ou se désinscrit."
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
        <Stat label="Désinscrits / perdus / rejetés" value={String(stopped)} />
        <Stat
          label="Plans téléchargés"
          value={giftTotal ? pct(giftDownloaded / giftTotal) : "—"}
          hint={`${giftDownloaded} sur ${giftTotal} adresses ayant demandé le cadeau`}
        />
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

      <Table head={["Prospect", "WhatsApp", "Dernier évènement", "Plan et devis", "Emails automatiques", "Provenance", "Actions"]} empty={rows.length === 0}>
        {rows.map((p) => {
          const ev = EVENTS[p.lastEvent];
          const firstName = (p.name || "").split(" ")[0];
          const models = giftsByEmail.get(p.email) ?? [];
          const total = totals[p.sequenceKind];
          const tried = offerByEmail.get(p.email);
          const resume = tried ? siteUrl(`/catalogue/${tried.slug}?offre=${tried.offreId}&achat=1&utm_source=whatsapp&utm_medium=relance&utm_campaign=offre_whatsapp`) : "";
          const wa = whatsappUrl(
            p.phone,
            tried
              ? p.lastEvent === "failed"
                ? `Bonjour ${firstName}, ici WOOPLANS. Votre paiement du plan et devis de la ${tried.name} n'a pas abouti. Souvent c'est le solde ou la validation Mobile Money qui bloque : je peux vous aider à le finaliser. Pour réessayer : ${resume}\n\nAvec votre plan et devis, le Catalogue Premium vous est offert : tous nos autres modèles pour comparer avant de choisir.`
                : `Bonjour ${firstName}, ici WOOPLANS. Vous avez commencé à commander le plan et devis de la ${tried.name} (${formatFcfa(tried.price)}, avec le Catalogue Premium offert). Avez-vous une question avant de finaliser ? Je suis là pour vous aider.\n\nPour reprendre : ${resume}`
              : p.lastEvent === "failed"
              ? `Bonjour ${firstName}, ici WOOPLANS. Votre paiement du Catalogue Premium n'a pas abouti : puis-je vous aider à le finaliser ?`
              : p.lastEvent === "gift"
                ? `Bonjour ${firstName}, ici WOOPLANS. Avez-vous bien reçu le plan et devis${models[0] ? ` du modèle ${models[0].code}` : ""} ? Avez-vous des questions sur ce modèle ?`
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
                {tried ? (
                  <p className="mb-1">
                    <Link href={`/catalogue/${tried.slug}`} target="_blank" className="font-semibold text-primary hover:underline">{tried.code}</Link>{" "}
                    <Badge tone="info">Offre {tried.offreId}</Badge>
                  </p>
                ) : null}
                {models.length ? (
                  <ul className="space-y-1">
                    {models.map((m) => (
                      <li key={m.slug}>
                        <Link href={`/catalogue/${m.slug}`} target="_blank" className="font-semibold text-primary hover:underline" title={m.name}>
                          {m.code}
                        </Link>{" "}
                        {m.downloads > 0 ? <Badge tone="good">Téléchargé{m.downloads > 1 ? ` ×${m.downloads}` : ""}</Badge> : <Badge tone="warn">Pas ouvert</Badge>}
                      </li>
                    ))}
                  </ul>
                ) : tried ? null : (
                  <span className="text-muted">—</span>
                )}
                {paymentByEmail.get(p.email) === "paid" ? (
                  <p className="mt-1"><Badge tone="good">Catalogue acheté</Badge></p>
                ) : paymentByEmail.get(p.email) === "started" ? (
                  <p className="mt-1"><Badge tone="warn">Paiement commencé</Badge></p>
                ) : null}
              </td>
              <td className="px-4 py-2.5 text-xs">
                {p.status === "converted" ? (
                  <Badge tone="good">Payé le {fmtDate(p.convertedAt)}</Badge>
                ) : p.status === "unsubscribed" ? (
                  <Badge>Désinscrit</Badge>
                ) : p.status === "lost" ? (
                  <Badge>Perdu</Badge>
                ) : p.status === "bounced" ? (
                  <Badge tone="warn">Email rejeté</Badge>
                ) : p.nextEmailAt ? (
                  <>
                    <p className="font-semibold">
                      {SEQUENCES[p.sequenceKind]} {Math.min(p.sequenceStep + 1, total)}/{total}
                    </p>
                    <p className="text-muted">le {fmtDateTime(p.nextEmailAt)}</p>
                  </>
                ) : p.sequenceStartedAt ? (
                  <p className="text-muted">
                    {SEQUENCES[p.sequenceKind]} terminée ({p.sequenceStep}/{total} envoyés)
                  </p>
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
        <h2 className="font-semibold">Emails automatiques</h2>
        <p className="mt-1 text-sm text-muted">
          <strong>Bienvenue</strong> (plan et devis offert) : le cadeau part tout de suite, puis 4 emails à J+
          {WELCOME_DELAYS_HOURS.map((h) => h / 24).join(", J+")} : 1) comment lire le plan et devis (ou, pour ceux qui ne l&apos;ont pas téléchargé, un rappel avec le lien : même nombre d&apos;emails), 2) comparer plusieurs modèles,
          3) questions fréquentes, 4) dernier message avec le code de réduction.
        </p>
        <p className="mt-2 text-sm text-muted">
          <strong>Relance</strong> (paiement abandonné ou échoué) : 1) aide au paiement, 2) ce que contient le catalogue,
          3) offre avec le code de réduction, 4) dernier rappel. Ses délais se règlent ci-dessous.
        </p>
        <p className="mt-2 text-sm text-muted">Les deux s&apos;arrêtent dès le paiement ou la désinscription.</p>
        <form action={saveSettings} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" name="enabled" defaultChecked={settings.enabled} /> Envois automatiques actifs
          </label>
          <label className="text-sm">
            <span className="label">Délais de la relance (heures après l&apos;abandon)</span>
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
