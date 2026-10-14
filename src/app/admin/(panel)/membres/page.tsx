import { cookies } from "next/headers";
import { desc, like, or } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { Badge, fmtDate, PageTitle, Table } from "@/components/admin/ui";
import { addMember, importFromChariow, newCode, reactivate, revoke, sendLegacyCodes } from "./actions";

const SOURCES: Record<string, string> = { chariow: "Chariow", legacy_import: "Import", manual: "Manuel" };

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const flashRaw = (await cookies()).get("wp_flash")?.value;
  const flash = flashRaw ? (JSON.parse(flashRaw) as { email: string; code: string; emailed: boolean }) : null;
  const notice = (await cookies()).get("wp_notice")?.value;
  const term = (q || "").trim();
  const members = await getDb().query.members.findMany({
    where: term ? or(like(schema.members.email, `%${term}%`), like(schema.members.name, `%${term}%`), like(schema.members.phone, `%${term}%`)) : undefined,
    orderBy: desc(schema.members.createdAt),
    limit: 200,
  });

  return (
    <>
      <PageTitle
        title="Membres Premium"
        subtitle={`${members.length} affiché(s). La révocation coupe l'accès immédiatement.`}
        actions={
          <>
            <form action={importFromChariow}><button className="btn-ghost py-2">Importer les acheteurs Chariow</button></form>
            <form action={sendLegacyCodes}><button className="btn-ghost py-2">Envoyer les codes (25 suivants)</button></form>
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
          <input name="q" defaultValue={term} placeholder="Rechercher email, nom, téléphone" className="input" />
          <button className="btn-ghost">Chercher</button>
        </form>
        <form action={addMember} className="card grid gap-2 p-4 sm:grid-cols-[1fr_1fr_auto]">
          <input name="email" type="email" required placeholder="Email du membre" className="input" />
          <input name="name" placeholder="Nom" className="input" />
          <button className="btn-primary">Donner l&apos;accès</button>
          <label className="flex items-center gap-2 text-sm sm:col-span-3">
            <input type="checkbox" name="sendEmail" defaultChecked /> Envoyer le code par email
          </label>
        </form>
      </div>

      <Table head={["Membre", "Statut", "Source", "Depuis", "Dernière connexion", "Actions"]} empty={members.length === 0}>
        {members.map((m) => (
          <tr key={m.id}>
            <td className="px-4 py-2.5">
              <p className="font-medium">{m.email}</p>
              <p className="text-xs text-muted">{[m.name, m.phone].filter(Boolean).join(" · ")}</p>
            </td>
            <td className="px-4 py-2.5">
              {m.status === "active" ? <Badge tone="good">Actif</Badge> : <Badge tone="bad">Révoqué</Badge>}
              {m.revokedReason ? <p className="mt-1 text-xs text-muted">{m.revokedReason}</p> : null}
            </td>
            <td className="px-4 py-2.5">{SOURCES[m.source]}</td>
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
    </>
  );
}
