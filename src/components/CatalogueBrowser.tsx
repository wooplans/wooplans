"use client";

import { useMemo, useState, type MouseEvent, type ReactNode } from "react";
import {
  BUDGET_OPTIONS,
  TYPE_OPTIONS,
  activeFilterChips,
  applyPlanFilters,
  bedroomOptions,
  catalogueHref,
  cleanFilters,
  filtersFromSearch,
  type PlanFilterData,
  type PlanFilters,
} from "@/lib/plan-filters";
import { phCapture } from "@/lib/posthog-browser";

const plural = (n: number) => (n === 0 ? "Aucun plan" : `${n} plan${n > 1 ? "s" : ""}`);

/**
 * Catalogue filtrable (vitrine et espace Premium) : chaque choix s'applique au tap, sans rechargement
 * (les cartes, rendues par le serveur, sont déjà dans la page).
 * Chaque option reste un vrai lien vers l'URL filtrée : sans JavaScript, le serveur applique le même filtre.
 */
export function CatalogueBrowser({
  items,
  initialFilters,
  basePath = "/catalogue",
  search = false,
}: {
  items: { plan: PlanFilterData; card: ReactNode }[];
  initialFilters: PlanFilters;
  basePath?: string;
  /** Champ de recherche par référence (espace Premium). */
  search?: boolean;
}) {
  const plans = useMemo(() => items.map((item) => item.plan), [items]);
  const cards = useMemo(() => new Map(items.map((item) => [item.plan.id, item.card])), [items]);
  const [filters, setFilters] = useState(() =>
    // Retour sur le catalogue après une fiche : Next réaffiche la page rendue au départ, avec ses filtres
    // d'origine ; l'adresse (mise à jour à chaque filtre) fait foi, pour retrouver la même liste.
    typeof window !== "undefined" && window.location.pathname === basePath ? filtersFromSearch(window.location.search) : cleanFilters(initialFilters),
  );
  const [bedroomsOpen, setBedroomsOpen] = useState(Boolean(filters.chambres));
  // Change à chaque tap, même sur l'option déjà active : relance l'animation des résultats (retour visible).
  const [tick, setTick] = useState(0);

  const results = useMemo(() => applyPlanFilters(plans, filters), [plans, filters]);
  const bedrooms = useMemo(() => bedroomOptions(plans), [plans]);
  const chips = activeFilterChips(filters);

  function apply(next: PlanFilters, control: string) {
    const cleaned = cleanFilters(next);
    setFilters(cleaned);
    setTick((t) => t + 1);
    // Adresse partageable, sans nouvelle entrée d'historique ni rechargement.
    window.history.replaceState(null, "", catalogueHref(cleaned, basePath));
    // La saisie de la recherche n'est pas mesurée lettre par lettre.
    if (control !== "recherche") phCapture("catalogue_filter", { control, ...cleaned, results: applyPlanFilters(plans, cleaned).length });
  }

  const set = (key: keyof PlanFilters, value: string | undefined, control: string = key) => ({
    href: catalogueHref({ ...filters, [key]: value }, basePath),
    onSelect: () => apply({ ...filters, [key]: value }, control),
  });
  const reset = { href: basePath, onSelect: () => apply({}, "effacer") };

  // Suggestion pour l'état « aucun résultat » : le premier filtre dont le retrait redonne des modèles.
  const relaxed =
    results.length === 0
      ? chips
          .map((chip) => ({ chip, count: applyPlanFilters(plans, { ...filters, [chip.key]: undefined }).length }))
          .find((r) => r.count > 0)
      : undefined;

  return (
    <div>
      {search ? (
        <form action={basePath} onSubmit={(event) => event.preventDefault()} className="mb-3" role="search">
          {Object.entries(filters).map(([key, value]) =>
            key === "q" ? null : <input key={key} type="hidden" name={key} value={value} />,
          )}
          <input
            type="search"
            name="q"
            value={filters.q ?? ""}
            onChange={(event) => apply({ ...filters, q: event.target.value }, "recherche")}
            placeholder="Rechercher (ex. V3-037)"
            aria-label="Rechercher une référence ou un nom de modèle"
            enterKeyHint="search"
            className="input"
          />
        </form>
      ) : null}
      <div role="group" aria-label="Type de plan" className="grid grid-cols-3 gap-1 rounded-2xl bg-outline/60 p-1">
        {TYPE_OPTIONS.map((o) => (
          <FilterLink
            key={o.label}
            {...set("categorie", o.value, "type")}
            active={filters.categorie === o.value}
            className="flex min-h-12 flex-col items-center justify-center rounded-xl px-1 text-center leading-tight"
            activeClassName="bg-surface text-primary shadow-sm"
            idleClassName="text-foreground/80"
          >
            <span className="text-sm font-semibold">{o.label}</span>
            <span className="text-[11px] text-muted">{o.hint}</span>
          </FilterLink>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="shrink-0 text-sm font-medium text-muted">Budget max</span>
        <div
          role="group"
          aria-label="Budget maximum"
          className="no-scrollbar -mr-4 flex min-w-0 gap-2 overflow-x-auto pr-4 sm:mr-0 sm:pr-0"
        >
          <FilterLink {...set("budget", undefined)} active={!filters.budget} className={pill}>
            Tous
          </FilterLink>
          {BUDGET_OPTIONS.map((o) => (
            <FilterLink key={o.value} {...set("budget", o.value)} active={filters.budget === o.value} className={pill} ariaLabel={`${o.label} FCFA`}>
              {o.value} M
            </FilterLink>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p aria-live="polite" className="text-base font-bold text-foreground">
          <span key={tick} className={tick === 0 ? "inline-block" : "catalogue-pop inline-block"}>
            {plural(results.length)}
          </span>
        </p>
        <button
          type="button"
          aria-expanded={bedroomsOpen}
          aria-controls="filtre-chambres"
          onClick={() => setBedroomsOpen((open) => !open)}
          className={`${pill} gap-1.5 ${filters.chambres ? "border-primary text-primary" : ""}`}
        >
          Chambres
          {filters.chambres ? <span className="font-bold">· {bedrooms.find((b) => b.value === filters.chambres)?.label ?? filters.chambres}</span> : null}
          <svg viewBox="0 0 20 20" aria-hidden className={`h-4 w-4 transition-transform ${bedroomsOpen ? "rotate-180" : ""}`}>
            <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {bedroomsOpen ? (
        <div id="filtre-chambres" role="group" aria-label="Nombre de chambres" className="mt-2 flex flex-wrap gap-2">
          <FilterLink {...set("chambres", undefined)} active={!filters.chambres} className={pill}>
            Toutes
          </FilterLink>
          {bedrooms.map((o) => (
            <FilterLink key={o.value} {...set("chambres", o.value)} active={filters.chambres === o.value} className={pill}>
              {o.label}
            </FilterLink>
          ))}
        </div>
      ) : null}

      {chips.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Filtres actifs">
          {chips.map((chip) => (
            <FilterLink
              key={chip.key}
              {...set(chip.key, undefined, `retirer_${chip.key}`)}
              active={false}
              ariaLabel={`Retirer le filtre ${chip.label}`}
              className="relative inline-flex h-8 items-center gap-1.5 rounded-full bg-primary/10 pl-3 pr-2 text-sm font-medium text-primary after:absolute after:-inset-y-1.5 after:inset-x-0 after:content-['']"
              idleClassName=""
            >
              {chip.label}
              <span aria-hidden className="text-base leading-none">×</span>
            </FilterLink>
          ))}
          <FilterLink
            {...reset}
            active={false}
            className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-primary underline underline-offset-2"
            idleClassName=""
          >
            Effacer
          </FilterLink>
        </div>
      ) : null}

      {/* Deux animations identiques en alternance : relancées sans remonter les cartes ni recharger leurs images. */}
      <div className={`mt-5 ${tick === 0 ? "" : tick % 2 ? "catalogue-refresh-a" : "catalogue-refresh-b"}`}>
        {results.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((plan) => (
              <div key={plan.id} className="flex flex-col [&>*]:flex-1">
                {cards.get(plan.id)}
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center">
            <p className="font-semibold">Aucun plan ne correspond à ces critères.</p>
            <p className="mt-1 text-sm text-muted">Élargissez votre recherche pour voir d&apos;autres modèles.</p>
            <div className="mt-5 flex flex-col items-center gap-3">
              {relaxed ? (
                <FilterLink
                  {...set(relaxed.chip.key, undefined, "suggestion")}
                  active={false}
                  className="btn-primary min-h-11"
                  idleClassName=""
                >
                  Voir {plural(relaxed.count)} sans {relaxed.chip.key === "q" ? "cette recherche" : `« ${relaxed.chip.label} »`}
                </FilterLink>
              ) : null}
              <FilterLink {...reset} active={false} className={relaxed ? "btn-ghost min-h-11" : "btn-primary min-h-11"} idleClassName="">
                Réinitialiser les filtres
              </FilterLink>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const pill =
  "inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors";

/** Lien de filtre : applique le choix sur place ; un clic modifié (nouvel onglet) garde le comportement du lien. */
function FilterLink({
  href,
  onSelect,
  active,
  className,
  activeClassName = "border-primary bg-primary text-white",
  idleClassName = "border-outline bg-surface text-foreground",
  ariaLabel,
  children,
}: {
  href: string;
  onSelect: () => void;
  active: boolean;
  className: string;
  activeClassName?: string;
  idleClassName?: string;
  ariaLabel?: string;
  children: ReactNode;
}) {
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onSelect();
  }
  return (
    <a
      href={href}
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      aria-label={ariaLabel}
      rel="nofollow"
      className={`${className} ${active ? activeClassName : idleClassName}`}
    >
      {children}
    </a>
  );
}
