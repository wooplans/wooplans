import Link from "next/link";
import { BUDGET_OPTIONS, LAND_OPTIONS, type PlanFilters } from "@/lib/plan-filters";

const select = "input appearance-none py-2.5 text-sm";

/** Filtres en GET : fonctionne sans JavaScript et reste indexable. */
export function PlanFiltersForm({ filters, action }: { filters: PlanFilters; action: string }) {
  return (
    <form action={action} className="card grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6">
      <select name="categorie" defaultValue={filters.categorie ?? ""} className={select} aria-label="Type de maison">
        <option value="">Villas et duplex</option>
        <option value="villa">Villas</option>
        <option value="duplex">Duplex</option>
      </select>
      <select name="chambres" defaultValue={filters.chambres ?? ""} className={select} aria-label="Chambres">
        <option value="">Chambres</option>
        <option value="2">2 chambres</option>
        <option value="3">3 chambres</option>
        <option value="4">4 chambres</option>
        <option value="5">5 chambres et +</option>
      </select>
      <select name="niveaux" defaultValue={filters.niveaux ?? ""} className={select} aria-label="Niveaux">
        <option value="">Niveaux</option>
        <option value="1">Plain-pied</option>
        <option value="2">À étage</option>
      </select>
      <select name="budget" defaultValue={filters.budget ?? ""} className={select} aria-label="Budget">
        <option value="">Budget</option>
        {BUDGET_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <select name="terrain" defaultValue={filters.terrain ?? ""} className={select} aria-label="Terrain">
        <option value="">Terrain</option>
        {LAND_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary flex-1 py-2.5">Filtrer</button>
        <Link href={action} className="btn-ghost px-4 py-2.5" aria-label="Réinitialiser les filtres">×</Link>
      </div>
    </form>
  );
}
