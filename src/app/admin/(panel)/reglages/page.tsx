import { MediaField } from "@/components/admin/MediaField";
import { PageTitle } from "@/components/admin/ui";
import { emailUsage, getEmailBudget } from "@/lib/email-budget";
import { STANDING_LABELS } from "@/lib/plan-pricing";
import { getCostSettings, getCustomPlanPricing, getSetting } from "@/lib/settings";
import { saveBudget, saveCatalogueFiles, saveCostSettings, savePricing } from "./actions";

export default async function SettingsPage() {
  const [cost, pricing, files, budget, usage] = await Promise.all([
    getCostSettings(),
    getCustomPlanPricing(),
    getSetting<{ key: string; label: string }[]>("catalogue_files", []),
    getEmailBudget(),
    emailUsage(),
  ]);
  return (
    <>
      <PageTitle title="Réglages" />
      <section className="card mb-6 p-5">
        <h2 className="font-semibold">Coût de construction (devis des villas et duplex)</h2>
        <p className="mt-1 text-sm text-muted">
          Devis total = surface totale × prix au m² × coefficient de standing du modèle. Chaque poste du devis est un
          pourcentage fixe du total (gros œuvre 45 %, finitions 55 %), et la fourchette affichée sur la vitrine vaut le
          devis ± 10 %. Enregistrer recalcule immédiatement le devis de tous les modèles.
        </p>
        <form action={saveCostSettings} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm">
            <span className="label">Villa : prix au m² (FCFA)</span>
            <input name="rateVilla" inputMode="numeric" required defaultValue={cost.ratePerM2.villa} className="input" />
          </label>
          <label className="text-sm">
            <span className="label">Duplex : prix au m² (FCFA)</span>
            <input name="rateDuplex" inputMode="numeric" required defaultValue={cost.ratePerM2.duplex} className="input" />
          </label>
          <label className="text-sm">
            <span className="label">Coef. {STANDING_LABELS.bas.toLowerCase()}</span>
            <input name="coefBas" inputMode="decimal" required defaultValue={String(cost.standingCoef.bas).replace(".", ",")} className="input" />
          </label>
          <label className="text-sm">
            <span className="label">Coef. {STANDING_LABELS.standard.toLowerCase()}</span>
            <input name="coefStandard" inputMode="decimal" required defaultValue={String(cost.standingCoef.standard).replace(".", ",")} className="input" />
          </label>
          <label className="text-sm">
            <span className="label">Coef. {STANDING_LABELS.eleve.toLowerCase()}</span>
            <input name="coefEleve" inputMode="decimal" required defaultValue={String(cost.standingCoef.eleve).replace(".", ",")} className="input" />
          </label>
          <div className="sm:col-span-2 lg:col-span-5">
            <button className="btn-primary">Enregistrer et recalculer les devis</button>
          </div>
        </form>
      </section>
      <section className="card mb-6 p-5">
        <h2 className="font-semibold">Quota d&apos;emails (Resend)</h2>
        <p className="mt-1 text-sm text-muted">
          Offre gratuite Resend : 100 emails par jour et 3 000 par mois. Les envois automatiques (relances prospects,
          actualités membres, codes par lots) s&apos;arrêtent avant la limite et reprennent ensuite : rien n&apos;est perdu.
          La réserve reste disponible pour les emails indispensables (code après un achat, code oublié, notifications).
        </p>
        <p className="mt-3 text-sm">
          Envoyés : <strong>{usage.day}</strong> sur 24 h / {budget.dailyLimit} · <strong>{usage.month}</strong> ce mois-ci / {budget.monthlyLimit}
        </p>
        <form action={saveBudget} className="mt-4 flex flex-wrap items-end gap-4">
          <label className="text-sm">
            <span className="label">Limite par jour</span>
            <input name="dailyLimit" type="number" min={0} defaultValue={budget.dailyLimit} className="input w-28" />
          </label>
          <label className="text-sm">
            <span className="label">Limite par mois</span>
            <input name="monthlyLimit" type="number" min={0} defaultValue={budget.monthlyLimit} className="input w-28" />
          </label>
          <label className="text-sm">
            <span className="label">Réserve par jour (emails indispensables)</span>
            <input name="dailyReserve" type="number" min={0} defaultValue={budget.dailyReserve} className="input w-28" />
          </label>
          <button className="btn-primary">Enregistrer</button>
        </form>
      </section>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-semibold">PDF du Catalogue Premium</h2>
          <p className="mt-1 text-sm text-muted">Fichier privé, téléchargeable uniquement par les membres depuis leur espace.</p>
          <form action={saveCatalogueFiles} className="mt-4 grid gap-4">
            <input name="label" defaultValue={files[0]?.label?.replace(/ — partie \d+$/, "") ?? "Catalogue Premium WOOPLANS (PDF)"} className="input" />
            <MediaField name="files" label="Fichiers PDF" initial={files.map((f) => f.key)} visibility="private" folder="catalogue" />
            <button className="btn-primary">Enregistrer</button>
          </form>
        </section>
        <section className="card p-5">
          <h2 className="font-semibold">Tarifs des plans complets personnalisés</h2>
          <p className="mt-1 text-sm text-muted">Affichés sur la page « Plans personnalisés ». Format JSON.</p>
          <form action={savePricing} className="mt-4 grid gap-4">
            <textarea name="pricing" rows={22} defaultValue={JSON.stringify(pricing, null, 2)} className="input font-mono text-xs" />
            <button className="btn-primary">Enregistrer</button>
          </form>
        </section>
      </div>
    </>
  );
}
