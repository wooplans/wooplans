import { PageTitle } from "@/components/admin/ui";
import { CHANNEL_LABELS } from "@/lib/crm";
import { createLead } from "../actions";

export default function NewLeadPage() {
  return (
    <>
      <PageTitle title="Nouvelle demande" subtitle="Ajoutez une demande reçue hors ligne (WhatsApp, téléphone, rencontre…)." />
      <form action={createLead} className="card grid max-w-2xl gap-4 p-6 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="label">Nom *</span><input name="name" required className="input" /></label>
        <label><span className="label">Téléphone / WhatsApp</span><input name="phone" className="input" /></label>
        <label><span className="label">Email</span><input name="email" type="email" className="input" /></label>
        <label><span className="label">Ville</span><input name="city" className="input" /></label>
        <label><span className="label">Pays</span><input name="country" className="input" /></label>
        <label><span className="label">Modèle (réf.)</span><input name="planLabel" placeholder="V3-037" className="input" /></label>
        <label>
          <span className="label">Canal</span>
          <select name="channel" defaultValue="whatsapp" className="input">
            {Object.entries(CHANNEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="sm:col-span-2"><span className="label">Projet</span><textarea name="projectDetails" rows={4} className="input" /></label>
        <label><span className="label">Prochaine relance</span><input name="nextFollowUpAt" type="date" className="input" /></label>
        <div className="flex items-end"><button className="btn-primary w-full">Créer la demande</button></div>
      </form>
    </>
  );
}
