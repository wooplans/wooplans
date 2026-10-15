import type { PlanRow } from "@/lib/plans";
import { MediaField } from "@/components/admin/MediaField";

const field = "input";

function Section({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <section className="card p-5">
      <h2 className="font-semibold">{title}</h2>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </section>
  );
}

function F({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={wide ? "sm:col-span-2 lg:col-span-4" : undefined}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

export function PlanForm({ plan, action }: { plan?: PlanRow; action: (form: FormData) => Promise<void> }) {
  const p = plan;
  const folder = (p?.code || "nouveau").toLowerCase();
  return (
    <form action={action} className="space-y-6">
      <Section title="Identité">
        <F label="Nom *"><input name="name" required defaultValue={p?.name} placeholder="Villa V3-037" className={field} /></F>
        <F label="Référence *"><input name="code" required defaultValue={p?.code} placeholder="V3-037" className={field} /></F>
        <F label="Catégorie">
          <select name="category" defaultValue={p?.category ?? "villa"} className={field}>
            <option value="villa">Villa</option><option value="duplex">Duplex</option><option value="immeuble">Immeuble</option><option value="autre">Autre</option>
          </select>
        </F>
        <F label="Statut">
          <select name="status" defaultValue={p?.status ?? "draft"} className={field}>
            <option value="draft">Brouillon</option><option value="published">Publié</option><option value="archived">Archivé</option>
          </select>
        </F>
        <F label="Adresse (slug)"><input name="slug" defaultValue={p?.slug} placeholder="auto : villa-v3-037" className={field} /></F>
        <F label="Ordre d'affichage"><input name="sortOrder" type="number" defaultValue={p?.sortOrder ?? 0} className={field} /></F>
        <label className="flex items-center gap-2 pt-7 text-sm"><input type="checkbox" name="featured" defaultChecked={p?.featured} /> Mis en avant</label>
      </Section>

      <Section title="Vitrine publique" hint="Visible par tous les visiteurs et indexé par Google.">
        <F label="Accroche" wide><input name="summary" defaultValue={p?.summary} placeholder="Villa familiale de plain-pied avec grand séjour traversant" className={field} /></F>
        <F label="Description" wide><textarea name="description" rows={4} defaultValue={p?.description} className={field} /></F>
        <F label="Chambres"><input name="bedrooms" type="number" defaultValue={p?.bedrooms ?? 3} className={field} /></F>
        <F label="Salles de bain"><input name="bathrooms" type="number" defaultValue={p?.bathrooms ?? 2} className={field} /></F>
        <F label="Niveaux (1 = plain-pied)"><input name="levels" type="number" min={1} defaultValue={p?.levels ?? 1} className={field} /></F>
        <F label="Surface totale (m²)"><input name="surfaceTotal" inputMode="decimal" defaultValue={p?.surfaceTotal ?? ""} className={field} /></F>
        <F label="Emprise au sol (m²)"><input name="footprint" inputMode="decimal" defaultValue={p?.footprint ?? ""} className={field} /></F>
        <F label="Largeur bâtiment (m)"><input name="buildingWidth" inputMode="decimal" defaultValue={p?.buildingWidth ?? ""} className={field} /></F>
        <F label="Profondeur bâtiment (m)"><input name="buildingDepth" inputMode="decimal" defaultValue={p?.buildingDepth ?? ""} className={field} /></F>
        <F label="Terrain nécessaire (m²)"><input name="landArea" inputMode="decimal" defaultValue={p?.landArea ?? ""} className={field} /></F>
        <F label="Largeur terrain (m)"><input name="landWidth" inputMode="decimal" defaultValue={p?.landWidth ?? ""} className={field} /></F>
        <F label="Profondeur terrain (m)"><input name="landDepth" inputMode="decimal" defaultValue={p?.landDepth ?? ""} className={field} /></F>
        <F label="Budget indicatif min (FCFA)"><input name="budgetMin" inputMode="numeric" defaultValue={p?.budgetMin ?? ""} placeholder="auto : devis −10 %" className={field} /></F>
        <F label="Budget indicatif max (FCFA)"><input name="budgetMax" inputMode="numeric" defaultValue={p?.budgetMax ?? ""} placeholder="auto : devis +10 %" className={field} /></F>
        <F label="Titre SEO (facultatif)" wide><input name="seoTitle" defaultValue={p?.seoTitle ?? ""} className={field} /></F>
        <F label="Description SEO (facultatif)" wide><input name="seoDescription" defaultValue={p?.seoDescription ?? ""} className={field} /></F>
        <div className="sm:col-span-2 lg:col-span-4">
          <MediaField name="renders" label="Rendus 3D (publics)" initial={p?.renders ?? []} visibility="public" folder={folder} hint="La première image sert de couverture." />
        </div>
      </Section>

      <Section title="Contenu Premium" hint="Réservé aux membres : jamais exposé sur la vitrine.">
        <div className="sm:col-span-2 lg:col-span-4">
          <MediaField name="floorPlans" label="Distributions cotées (privées)" initial={p?.floorPlans ?? []} visibility="private" folder={folder} />
        </div>
        <F label="Pièces : « Nom | surface | niveau » (une par ligne)" wide>
          <textarea name="rooms" rows={6} defaultValue={(p?.rooms ?? []).map((r) => [r.name, r.area, r.level].filter((x) => x !== undefined && x !== "").join(" | ")).join("\n")} placeholder={"Séjour | 32 | RDC\nChambre parentale | 16 | Étage"} className={`${field} font-mono text-sm`} />
        </F>
        <F label="Devis par lot : « Libellé | montant » (une ligne par lot)" wide>
          <textarea name="estimateLots" rows={8} defaultValue={(p?.estimateLots ?? []).map((l) => `${l.label} | ${l.amount}`).join("\n")} className={`${field} font-mono text-sm`} />
        </F>
        <F label="Pré-remplir le devis : prix au m² (si lots vides)"><input name="ratePerM2" inputMode="numeric" placeholder="villa 150000 · duplex 180000" className={field} /></F>
        <F label="Total devis (FCFA, sinon somme des lots)"><input name="estimateTotal" inputMode="numeric" defaultValue={p?.estimateTotal ?? ""} className={field} /></F>
        <F label="Hypothèses de coût" wide><textarea name="costAssumptions" rows={3} defaultValue={p?.costAssumptions} placeholder="Prix 2026, Douala/Yaoundé, finitions standard, hors terrain et VRD…" className={field} /></F>
        <F label="Atouts (un par ligne)" wide><textarea name="strengths" rows={4} defaultValue={(p?.strengths ?? []).join("\n")} className={field} /></F>
        <F label="Points d'attention (un par ligne)" wide><textarea name="watchouts" rows={4} defaultValue={(p?.watchouts ?? []).join("\n")} className={field} /></F>
        <F label="Notes de l'architecte" wide><textarea name="premiumNotes" rows={3} defaultValue={p?.premiumNotes} className={field} /></F>
      </Section>

      <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-outline bg-background/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <button className="btn-primary">Enregistrer</button>
        {p ? <a href={`/catalogue/${p.slug}`} target="_blank" className="btn-ghost">Voir la fiche ↗</a> : null}
      </div>
    </form>
  );
}
