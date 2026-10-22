import { cookies } from "next/headers";
import { countDistinct, desc, eq, gte, inArray, like, or } from "drizzle-orm";
import { getDb, schema } from "@/db";
import Link from "next/link";
import { Badge, fmtDate, fmtDateTime, PageTitle, Table } from "@/components/admin/ui";
import { automatedEmailAllowance } from "@/lib/email-budget";
import { getLegacyCodesSettings, legacyCodesQueue, legacyCodesSentToday } from "@/lib/legacy-codes";
import { nextWindowStart, PROSPECT_MARGIN } from "@/lib/legacy-codes-schedule";
import { codeStatusByMember, getDigestCampaign, getMemberDigestSettings } from "@/lib/member-mailing";
import { whatsappUrl } from "@/lib/phone";
import { addMember, importFromChariow, newCode, reactivate, revoke, saveDigest, saveLegacyCodes, sendLegacyCodes } from "./actions";

const SOURCES: Record<string, string> = { chariow: "Chariow", legacy_import: "Import", manual: "Manuel" };

const CODE_VIEWS = [
  { id: "", label: "Tous" },
  { id: "envoye", label: "Code reçu" },
  { id: "jamais", label: "Code jamais envoyé" },
  { id: "echec", label: "Envoi échoué" },
] as const;

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string; code?: string }> }) {
  const { q, code = "" } = await searchParams;
  const flashRaw = (await cookies()).get("wp_flash")?.value;
  const flash = flashRaw ? (JSON.parse(flashRaw) as { email: string; code: string; emailed: boolean }) : null;
  const notice = (await cookies()).get("wp_notice")?.value;
  const term = (q || "").trim();
  // Identifiant imprimé sur une fiche (W-XXXXXX) : retrouve le membre à l'origine d'une copie.
  const markId = /^W-[0-9A-F]{6}$/i.test(term) ? term.toUpperCase() : null;
  const markOwners = markId
    ? (await getDb().selectDistinct({ id: schema.pdfDownloads.memberId }).from(schema.pdfDownloads).where(eq(schema.pdfDownloads.markId, markId))).map((r) => r.id)
    : [];
  const [allMembers, codes, digest, campaign, pdfCounts] = await Promise.all([
    getDb().query.members.findMany({
      where: markId
        ? inArray(schema.members.id, markOwners.length ? markOwners : [""])
        : term
          ? or(like(schema.members.email, `%${term}%`), like(schema.members.name, `%${term}%`), like(schema.members.phone, `%${term}%`))
          : undefined,
      orderBy: desc(schema.members.createdAt),
    }),
    codeStatusByMember(),
    getMemberDigestSettings(),
    getDigestCampaign(),
    getDb()
      .select({ memberId: schema.pdfDownloads.memberId, n: countDistinct(schema.pdfDownloads.planSlug) })
      .from(schema.pdfDownloads)
      .where(gte(schema.pdfDownloads.createdAt, new Date(Date.now() - 30 * 86_400_000)))
      .groupBy(schema.pdfDownloads.memberId),
  ]);
  const legacy = await getLegacyCodesSettings();
  const [legacyQueue, legacySentToday, allowance] = await Promise.all([legacyCodesQueue(legacy), legacyCodesSentToday(), automatedEmailAllowance()]);
  const legacyDays = Math.ceil(legacyQueue.first.length / legacy.perDay);
  const pdfByMember = new Map(pdfCounts.map((r) => [r.memberId, r.n]));
  const stateOf = (id: string) => codes.get(id)?.state ?? "never";
  const counts = { envoye: 0, jamais: 0, echec: 0 };
  for (const m of allMembers) {
    if (m.status !== "active") continue;
    const st = stateOf(m.id);
    counts[st === "sent" ? "envoye" : st === "failed" ? "echec" : "jamais"]++;
  }
  const waiting = allMembers.filter((m) => m.status === "active" && !m.lastLoginAt && stateOf(m.id) !== "sent").length;
  const members = allMembers
    .filter((m) =>
      code === "envoye" ? stateOf(m.id) === "sent" : code === "jamais" ? stateOf(m.id) === "never" : code === "echec" ? stateOf(m.id) === "failed" : true,
    )
    .slice(0, 300);

  return (
    <>
      <PageTitle
        title="Membres Premium"
        subtitle={`${members.length} affiché(s) · code reçu : ${counts.envoye} · jamais envoyé : ${counts.jamais} · échec : ${counts.echec}. La révocation coupe l'accès immédiatement.`}
        actions={
          <>
            <form action={importFromChariow}><button className="btn-ghost py-2">Importer les acheteurs Chariow</button></form>
            <form action={sendLegacyCodes}>
              <button className="btn-ghost py-2" disabled={waiting === 0} title="Membres actifs sans code reçu et jamais connectés">
                Envoyer les codes (25 suivants · {waiting} en attente)
              </button>
            </form>
          </>
        }
      />
      {notice ? <p className="mb-4 rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary">{notice}</p> : null}

      {flash ? (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
          Code d&apos;accès de <strong>{flash.email}</strong> : <span className="font-mono text-lg font-bold tracking-widest">{flash.code}</span>
          <span className="ml-2 text-muted">{flash.emailed ? "(envoyé par email)" : "(non envoyé par email : transmettez-le vous-même)"}</span>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <form className="card flex gap-2 p-4">
          <input name="q" defaultValue={term} placeholder="Email, nom, téléphone ou identifiant W-… d'une fiche" className="input" />
          <button className="btn-ghost">Chercher</button>
        </form>
        <form action={addMember} className="card grid gap-2 p-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <input name="email" type="email" required placeholder="Email du membre" className="input" />
          <input name="name" placeholder="Nom" className="input" />
          <input name="phone" type="tel" placeholder="WhatsApp (+237…)" className="input" />
          <button className="btn-primary">Donner l&apos;accès</button>
          <label className="flex items-center gap-2 text-sm sm:col-span-4">
            <input type="checkbox" name="sendEmail" defaultChecked /> Envoyer le code par email
          </label>
        </form>
      </div>

      <div className="mb-4 flex flex-wrap gap-1 rounded-full border border-outline bg-surface p-1 text-sm sm:w-fit">
        {CODE_VIEWS.map((v) => (
          <Link
            key={v.id}
            href={`/admin/membres?${new URLSearchParams({ ...(term ? { q: term } : {}), ...(v.id ? { code: v.id } : {}) })}`}
            className={`rounded-full px-3 py-1 ${code === v.id ? "bg-primary text-white" : "text-foreground/70 hover:text-primary"}`}
          >
            {v.label}
          </Link>
        ))}
      </div>

      <Table head={["Membre", "WhatsApp", "Statut", "Code d'accès", "Source", "Fiches PDF (30 j)", "Depuis", "Dernière connexion", "Actions"]} empty={members.length === 0}>
        {members.map((m) => (
          <tr key={m.id}>
            <td className="px-4 py-2.5">
              <p className="font-medium">{m.email}</p>
              {m.name ? <p className="text-xs text-muted">{m.name}</p> : null}
            </td>
            <td className="px-4 py-2.5">
              {(() => {
                const wa = whatsappUrl(m.phone, `Bonjour ${m.name || ""}, ici WOOPLANS. `.replace("  ", " "));
                return wa ? (
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-[#25D366] px-3 py-1 text-xs font-semibold text-white" title={`+${m.phone}`}>
                    WhatsApp
                  </a>
                ) : (
                  <span className="text-xs text-muted">—</span>
                );
              })()}
            </td>
            <td className="px-4 py-2.5">
              {m.status === "active" ? <Badge tone="good">Actif</Badge> : <Badge tone="bad">Révoqué</Badge>}
              {m.revokedReason ? <p className="mt-1 text-xs text-muted">{m.revokedReason}</p> : null}
            </td>
            <td className="px-4 py-2.5">
              {(() => {
                const c = codes.get(m.id);
                if (c?.state === "sent") return <><Badge tone="good">Reçu</Badge><p className="mt-1 text-xs text-muted">{fmtDate(c.at)}</p></>;
                if (c?.state === "failed") return <><Badge tone="bad">Échec</Badge><p className="mt-1 text-xs text-muted">{fmtDate(c.at)}</p></>;
                return <Badge tone="warn">Jamais envoyé</Badge>;
              })()}
            </td>
            <td className="px-4 py-2.5">{SOURCES[m.source]}</td>
            <td className="px-4 py-2.5">{pdfByMember.get(m.id) ?? 0}</td>
            <td className="px-4 py-2.5">{fmtDate(m.createdAt)}</td>
            <td className="px-4 py-2.5">{fmtDate(m.lastLoginAt)}</td>
            <td className="px-4 py-2.5">
              <div className="flex flex-wrap gap-2">
                {m.status === "active" ? (
                  <>
                    <form action={newCode.bind(null, m.id)}><button className="text-xs font-semibold text-primary">Nouveau code</button></form>
                    <form action={revoke.bind(null, m.id)} className="flex gap-1">
                      <input name="reason" placeholder="Motif" className="w-24 rounded border border-outline px-2 text-xs" />
                      <button className="text-xs font-semibold text-secondary">Révoquer</button>
                    </form>
                  </>
                ) : (
                  <form action={reactivate.bind(null, m.id)}><button className="text-xs font-semibold text-primary">Réactiver</button></form>
                )}
              </div>
            </td>
          </tr>
        ))}
      </Table>

      <section className="card mt-8 p-5">
        <h2 className="font-semibold">Envoi automatique des codes aux anciens abonnés</h2>
        <p className="mt-1 text-sm text-muted">
          Chaque matin, dans la fenêtre choisie (heure de Douala), les codes partent par lots aux membres actifs qui ne se
          sont jamais connectés : d&apos;abord ceux qui n&apos;ont jamais reçu de code, puis un rappel unique (nouveau code) à
          ceux qui l&apos;ont reçu sans se connecter. Un membre sort de la file dès sa première connexion. Le lot respecte le
          quota Resend (réserve pour les emails d&apos;achat, {PROSPECT_MARGIN} emails laissés aux relances prospects) ; les actualités
          mensuelles attendent que tous les codes soient partis.
        </p>
        <p className="mt-2 text-sm">
          En attente : <strong>{legacyQueue.first.length}</strong> premier(s) envoi(s)
          {legacyQueue.first.length ? <> (≈ {legacyDays} jour(s))</> : null} · <strong>{legacyQueue.reminders.length}</strong> rappel(s) ·
          envoyés aujourd&apos;hui : <strong>{legacySentToday}</strong>/{legacy.perDay} · quota automatique restant : {allowance}
          {legacy.enabled ? <> · prochaine fenêtre : {fmtDateTime(nextWindowStart(legacy, new Date()))}</> : <> · <Badge tone="warn">en pause</Badge></>}
        </p>
        <form action={saveLegacyCodes} className="mt-4 flex flex-wrap items-end gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="enabled" defaultChecked={legacy.enabled} /> Envoi automatique actif
          </label>
          <label className="text-sm">
            <span className="label">Heure (Douala)</span>
            <input name="hour" type="number" min={0} max={23} defaultValue={legacy.hour} className="input w-24" />
          </label>
          <label className="text-sm">
            <span className="label">Fenêtre (h)</span>
            <input name="windowHours" type="number" min={1} max={12} defaultValue={legacy.windowHours} className="input w-24" />
          </label>
          <label className="text-sm">
            <span className="label">Codes par jour</span>
            <input name="perDay" type="number" min={1} max={100} defaultValue={legacy.perDay} className="input w-24" />
          </label>
          <label className="text-sm">
            <span className="label">Rappel après (j, 0 = aucun)</span>
            <input name="reminderAfterDays" type="number" min={0} max={60} defaultValue={legacy.reminderAfterDays} className="input w-24" />
          </label>
          <button className="btn-primary">Enregistrer</button>
        </form>
      </section>

      <section className="card mt-8 p-5">
        <h2 className="font-semibold">Actualités mensuelles aux membres</h2>
        <p className="mt-1 text-sm text-muted">
          Chaque mois, à partir du jour choisi, un email présente les modèles publiés depuis le mois précédent, avec le
          bouton de connexion. Pas de nouveau modèle, pas d&apos;email. Envoyé aux membres actifs qui ont reçu leur code ou
          se sont déjà connectés, par lots quotidiens (7 h), hors désinscrits.
        </p>
        {campaign ? (
          <p className="mt-2 text-sm">
            Dernière campagne : <strong>{campaign.month}</strong> · {campaign.planIds.length} nouveau(x) modèle(s) ·{" "}
            {campaign.done ? "terminée" : "en cours d'envoi"}
          </p>
        ) : null}
        <form action={saveDigest} className="mt-4 flex flex-wrap items-end gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="enabled" defaultChecked={digest.enabled} /> Envoi automatique actif
          </label>
          <label className="text-sm">
            <span className="label">Jour du mois</span>
            <input name="dayOfMonth" type="number" min={1} max={28} defaultValue={digest.dayOfMonth} className="input w-24" />
          </label>
          <label className="text-sm">
            <span className="label">Emails par jour</span>
            <input name="perRun" type="number" min={1} max={200} defaultValue={digest.perRun} className="input w-24" />
          </label>
          <button className="btn-primary">Enregistrer</button>
        </form>
      </section>
    </>
  );
}
