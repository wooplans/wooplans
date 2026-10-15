import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { FollowUpEmailForm } from "@/components/admin/FollowUpEmailForm";
import { Badge, fmtDate, fmtDateTime, PageTitle } from "@/components/admin/ui";
import { CHANNEL_LABELS, FOLLOW_UP_TEMPLATES, STAGES } from "@/lib/crm";
import { formatFcfa } from "@/lib/plans";
import { whatsappLink } from "@/lib/site";
import { addNote, addPayment, deleteLead, deletePayment, sendLeadEmail, updateLead } from "../actions";

const isoDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const lead = await db.query.leads.findFirst({ where: eq(schema.leads.id, id) });
  if (!lead) notFound();
  const [activities, payments, member] = await Promise.all([
    db.query.leadActivities.findMany({ where: eq(schema.leadActivities.leadId, id), orderBy: desc(schema.leadActivities.createdAt) }),
    db.query.leadPayments.findMany({ where: eq(schema.leadPayments.leadId, id), orderBy: desc(schema.leadPayments.paidAt) }),
    lead.memberId ? db.query.members.findFirst({ where: eq(schema.members.id, lead.memberId) }) : null,
  ]);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const due = Math.max(0, (lead.agreedPrice ?? 0) - lead.catalogueCredit - totalPaid);
  const phoneDigits = (lead.phone || "").replace(/\D/g, "");

  return (
    <>
      <PageTitle
        title={lead.name}
        subtitle={`${CHANNEL_LABELS[lead.channel]} · créée le ${fmtDate(lead.createdAt)}${lead.utmCampaign ? ` · campagne ${lead.utmCampaign}` : ""}`}
        actions={
          <>
            {phoneDigits ? (
              <a href={whatsappLink(`Bonjour ${lead.name}, `, phoneDigits)} target="_blank" rel="noopener noreferrer" className="btn bg-[#25D366] py-2 text-white">
                WhatsApp
              </a>
            ) : null}
            <Link href="/admin/crm" className="btn-ghost py-2">← Pipeline</Link>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <form action={updateLead.bind(null, id)} className="card grid gap-4 p-5 sm:grid-cols-2">
            <label>
              <span className="label">Étape</span>
              <select name="stage" defaultValue={lead.stage} className="input">
                {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
            <label><span className="label">Prochaine relance</span><input type="date" name="nextFollowUpAt" defaultValue={isoDate(lead.nextFollowUpAt)} className="input" /></label>
            <label><span className="label">Nom</span><input name="name" defaultValue={lead.name} className="input" /></label>
            <label><span className="label">Téléphone</span><input name="phone" defaultValue={lead.phone ?? ""} className="input" /></label>
            <label><span className="label">Email</span><input name="email" type="email" defaultValue={lead.email ?? ""} className="input" /></label>
            <label><span className="label">Modèle (réf.)</span><input name="planLabel" defaultValue={lead.planLabel ?? ""} className="input" /></label>
            <label><span className="label">Ville</span><input name="city" defaultValue={lead.city ?? ""} className="input" /></label>
            <label><span className="label">Pays</span><input name="country" defaultValue={lead.country ?? ""} className="input" /></label>
            <label><span className="label">Budget construction du client (FCFA)</span><input name="budget" inputMode="numeric" defaultValue={lead.budget ?? ""} className="input" /></label>
            <label><span className="label">Honoraires convenus (FCFA)</span><input name="agreedPrice" inputMode="numeric" defaultValue={lead.agreedPrice ?? ""} className="input" /></label>
            <label><span className="label">Crédit catalogue déduit (FCFA)</span><input name="catalogueCredit" inputMode="numeric" defaultValue={lead.catalogueCredit} className="input" /></label>
            <label><span className="label">Raison si perdu</span><input name="lostReason" defaultValue={lead.lostReason ?? ""} className="input" /></label>
            <label className="sm:col-span-2"><span className="label">Projet</span><textarea name="projectDetails" rows={3} defaultValue={lead.projectDetails} className="input" /></label>
            <label className="sm:col-span-2"><span className="label">Terrain</span><textarea name="landDetails" rows={2} defaultValue={lead.landDetails} className="input" /></label>
            <div className="sm:col-span-2"><button className="btn-primary">Enregistrer</button></div>
          </form>

          <section className="card p-5">
            <h2 className="font-semibold">Encaissements (plans complets)</h2>
            <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
              <div><p className="text-muted">Honoraires</p><p className="font-semibold">{formatFcfa(lead.agreedPrice)}</p></div>
              <div><p className="text-muted">Encaissé</p><p className="font-semibold text-emerald-700">{formatFcfa(totalPaid)}</p></div>
              <div><p className="text-muted">Reste à payer</p><p className="font-semibold">{formatFcfa(due)}</p></div>
            </div>
            {lead.catalogueCredit ? <p className="mt-2 text-xs text-muted">Crédit catalogue de {formatFcfa(lead.catalogueCredit)} déjà déduit du reste à payer.</p> : null}
            <ul className="mt-4 divide-y divide-outline text-sm">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <span>{fmtDate(p.paidAt)} · {p.method}{p.reference ? ` · ${p.reference}` : ""}</span>
                  <span className="flex items-center gap-3">
                    <strong>{formatFcfa(p.amount)}</strong>
                    <form action={deletePayment.bind(null, id, p.id)}><button className="text-xs text-secondary">Supprimer</button></form>
                  </span>
                </li>
              ))}
            </ul>
            <form action={addPayment.bind(null, id)} className="mt-4 grid gap-3 sm:grid-cols-4">
              <input name="amount" required inputMode="numeric" placeholder="Montant" className="input" />
              <select name="method" className="input">
                <option value="mobile_money">Mobile Money</option>
                <option value="virement">Virement</option>
                <option value="especes">Espèces</option>
                <option value="chariow">Chariow</option>
              </select>
              <input name="paidAt" type="date" className="input" />
              <input name="reference" placeholder="Référence" className="input" />
              <button className="btn-primary sm:col-span-4">Ajouter un encaissement</button>
            </form>
          </section>
        </div>

        <div className="space-y-6">
          {member ? (
            <section className="card p-5 text-sm">
              <p className="font-semibold">Membre Premium</p>
              <p className="mt-1 text-muted">{member.email} · <Badge tone={member.status === "active" ? "good" : "bad"}>{member.status === "active" ? "actif" : "révoqué"}</Badge></p>
            </section>
          ) : null}

          <section className="card p-5">
            <h2 className="font-semibold">Ajouter une note</h2>
            <form action={addNote.bind(null, id)} className="mt-3 grid gap-3">
              <textarea name="body" rows={3} placeholder="Compte rendu d'appel, besoin du client…" className="input" />
              <div className="grid grid-cols-2 gap-3">
                <select name="kind" className="input"><option value="note">Note</option><option value="call">Appel</option></select>
                <input type="date" name="nextFollowUpAt" className="input" aria-label="Prochaine relance" />
              </div>
              <button className="btn-primary">Enregistrer la note</button>
            </form>
          </section>

          {lead.email ? (
            <section className="card p-5">
              <h2 className="font-semibold">Relance par email</h2>
              <FollowUpEmailForm templates={FOLLOW_UP_TEMPLATES} action={sendLeadEmail.bind(null, id)} />
            </section>
          ) : null}

          <section className="card p-5">
            <h2 className="font-semibold">Historique</h2>
            <ol className="mt-3 space-y-3 text-sm">
              {activities.map((a) => (
                <li key={a.id} className="border-l-2 border-outline pl-3">
                  <p className="text-xs text-muted">{fmtDateTime(a.createdAt)} · {a.kind} · {a.author}</p>
                  <p className="whitespace-pre-line">{a.body}</p>
                </li>
              ))}
            </ol>
          </section>

          <form action={deleteLead.bind(null, id)}>
            <button className="text-sm text-secondary hover:underline">Supprimer cette demande</button>
          </form>
        </div>
      </div>
    </>
  );
}

