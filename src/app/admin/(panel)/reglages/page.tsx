import { MediaField } from "@/components/admin/MediaField";
import { PageTitle } from "@/components/admin/ui";
import { getCustomPlanPricing, getSetting } from "@/lib/settings";
import { saveCatalogueFiles, savePricing } from "./actions";

export default async function SettingsPage() {
  const [pricing, files] = await Promise.all([
    getCustomPlanPricing(),
    getSetting<{ key: string; label: string }[]>("catalogue_files", []),
  ]);
  return (
    <>
      <PageTitle title="Réglages" />
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-semibold">PDF du Catalogue Premium</h2>
          <p className="mt-1 text-sm text-muted">Fichier privé, téléchargeable uniquement par les membres depuis leur espace.</p>
          <form action={saveCatalogueFiles} className="mt-4 grid gap-4">
            <input name="label" defaultValue={files[0]?.label?.replace(/ — partie \d+$/, "") ?? "Catalogue Premium WooPlans (PDF)"} className="input" />
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
