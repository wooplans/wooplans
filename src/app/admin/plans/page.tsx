"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type Plan = {
  id: string;
  name: string;
  slug: string;
  category: string;
  surface: number;
  bedrooms: number;
  published: boolean;
  featured: boolean;
  cataloguePreview: boolean;
  updatedAt: string;
  thumbnail: string;
};

type ToggleField = "published" | "featured" | "cataloguePreview";

type PlanMutationResponse = Partial<Pick<Plan, ToggleField | "updatedAt">> & {
  error?: string;
};

type Filters = {
  search: string;
  category: string;
  status: string;
  bedrooms: string;
  featured: string;
  cataloguePreview: string;
};

type SortKey = "name" | "category" | "surface" | "bedrooms" | "updatedAt";
type Sort = { key: SortKey; dir: "asc" | "desc" };

const EMPTY_FILTERS: Filters = {
  search: "",
  category: "",
  status: "",
  bedrooms: "",
  featured: "",
  cataloguePreview: "",
};

const DEFAULT_SORT: Sort = { key: "updatedAt", dir: "desc" };

const SORT_KEYS: SortKey[] = ["name", "category", "surface", "bedrooms", "updatedAt"];

const TOGGLE_ERRORS: Record<ToggleField, string> = {
  published: "Erreur lors de la mise à jour du statut",
  featured: "Erreur lors de la mise en avant",
  cataloguePreview: "Erreur lors de la mise à jour de l'aperçu catalogue",
};

const filterClass =
  "px-3 py-2 border-2 border-outline bg-surface text-sm text-foreground focus:outline-none focus:border-primary";

function readUrlState(): { filters: Filters; sort: Sort } {
  const params = new URLSearchParams(window.location.search);
  const filters = { ...EMPTY_FILTERS };
  for (const key of Object.keys(EMPTY_FILTERS) as (keyof Filters)[]) {
    filters[key] = params.get(key) ?? "";
  }
  const sortKey = params.get("sort") as SortKey | null;
  const sort: Sort =
    sortKey && SORT_KEYS.includes(sortKey)
      ? { key: sortKey, dir: params.get("dir") === "asc" ? "asc" : "desc" }
      : DEFAULT_SORT;
  return { filters, sort };
}

function writeUrlState(filters: Filters, sort: Sort) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  if (sort.key !== DEFAULT_SORT.key || sort.dir !== DEFAULT_SORT.dir) {
    params.set("sort", sort.key);
    params.set("dir", sort.dir);
  }
  const query = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function comparePlans(a: Plan, b: Plan, key: SortKey) {
  switch (key) {
    case "name":
      return a.name.localeCompare(b.name, "fr", { numeric: true });
    case "category":
      return a.category.localeCompare(b.category, "fr");
    case "surface":
      return a.surface - b.surface;
    case "bedrooms":
      return a.bedrooms - b.bedrooms;
    case "updatedAt":
      return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
  }
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkRunning, setBulkRunning] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT);
  const [urlReady, setUrlReady] = useState(false);

  useEffect(() => {
    const state = readUrlState();
    setFilters(state.filters);
    setSort(state.sort);
    setUrlReady(true);
  }, []);

  useEffect(() => {
    if (urlReady) writeUrlState(filters, sort);
  }, [filters, sort, urlReady]);

  useEffect(() => {
    fetch("/api/admin/plans")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPlans(data);
        } else {
          setLoadError("Erreur lors du chargement des plans");
        }
      })
      .catch(() => setLoadError("Erreur lors du chargement des plans"))
      .finally(() => setLoading(false));
  }, []);

  const bedroomOptions = useMemo(
    () => Array.from(new Set(plans.map((p) => p.bedrooms))).sort((a, b) => a - b),
    [plans],
  );

  const filteredPlans = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    const result = plans.filter((plan) => {
      if (query && !plan.name.toLowerCase().includes(query) && !plan.slug.toLowerCase().includes(query)) {
        return false;
      }
      if (filters.category && plan.category !== filters.category) return false;
      if (filters.status === "published" && !plan.published) return false;
      if (filters.status === "draft" && plan.published) return false;
      if (filters.bedrooms && plan.bedrooms !== Number(filters.bedrooms)) return false;
      if (filters.featured === "yes" && !plan.featured) return false;
      if (filters.featured === "no" && plan.featured) return false;
      if (filters.cataloguePreview === "yes" && !plan.cataloguePreview) return false;
      if (filters.cataloguePreview === "no" && plan.cataloguePreview) return false;
      return true;
    });
    const factor = sort.dir === "asc" ? 1 : -1;
    return result.sort((a, b) => comparePlans(a, b, sort.key) * factor);
  }, [plans, filters, sort]);

  const hasActiveFilters = Object.values(filters).some(Boolean);
  const visibleSelected = filteredPlans.filter((p) => selected.has(p.id));
  const allVisibleSelected = filteredPlans.length > 0 && visibleSelected.length === filteredPlans.length;

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "updatedAt" ? "desc" : "asc" },
    );
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const plan of filteredPlans) {
        if (allVisibleSelected) next.delete(plan.id);
        else next.add(plan.id);
      }
      return next;
    });
  }

  function setPendingKey(key: string, on: boolean) {
    setPending((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  async function updatePlanField(plan: Plan, field: ToggleField, value: boolean) {
    const res = await fetch(`/api/admin/plans/${plan.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    const data = (await res.json().catch(() => ({}))) as PlanMutationResponse;
    if (!res.ok) throw new Error(data.error || TOGGLE_ERRORS[field]);
    setPlans((prev) =>
      prev.map((p) =>
        p.id === plan.id
          ? { ...p, [field]: Boolean(data[field]), updatedAt: data.updatedAt ?? p.updatedAt }
          : p,
      ),
    );
  }

  async function togglePlanField(plan: Plan, field: ToggleField) {
    const key = `${plan.id}:${field}`;
    if (pending.has(key)) return;
    setPendingKey(key, true);
    try {
      await updatePlanField(plan, field, !plan[field]);
      setError("");
    } catch (err) {
      setError(err instanceof Error && err.message !== "Failed to fetch" ? err.message : "Erreur réseau");
    } finally {
      setPendingKey(key, false);
    }
  }

  async function runBulk(field: ToggleField, value: boolean) {
    const targets = visibleSelected.filter((p) => p[field] !== value);
    if (targets.length === 0) return;
    setBulkRunning(true);
    let failures = 0;
    for (const plan of targets) {
      try {
        await updatePlanField(plan, field, value);
      } catch {
        failures += 1;
      }
    }
    setBulkRunning(false);
    setError(failures > 0 ? `${failures} plan(s) n'ont pas pu être mis à jour.` : "");
    if (failures === 0) setSelected(new Set());
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/plans/${id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (res.ok) {
        setPlans((prev) => prev.filter((p) => p.id !== id));
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setConfirmDeleteId(null);
        setError("");
      } else {
        setError(data.error || "Erreur lors de la suppression");
      }
    } catch {
      setError("Erreur réseau lors de la suppression");
    }
    setDeleting(null);
  }

  function SortHeader({ label, sortKey, className = "" }: { label: string; sortKey: SortKey; className?: string }) {
    const active = sort.key === sortKey;
    return (
      <th className={`px-3 py-3 font-black uppercase tracking-wider text-xs ${className}`}>
        <button
          type="button"
          onClick={() => toggleSort(sortKey)}
          className={`inline-flex items-center gap-1 uppercase tracking-wider hover:text-foreground ${
            active ? "text-foreground" : ""
          }`}
        >
          {label}
          <span aria-hidden className={active ? "" : "opacity-30"}>
            {active && sort.dir === "asc" ? "▲" : "▼"}
          </span>
        </button>
      </th>
    );
  }

  function ToggleButton({
    plan,
    field,
    onLabel,
    offLabel,
    onClass,
    offClass,
  }: {
    plan: Plan;
    field: ToggleField;
    onLabel: string;
    offLabel: string;
    onClass: string;
    offClass: string;
  }) {
    const busy = pending.has(`${plan.id}:${field}`) || bulkRunning;
    return (
      <button
        type="button"
        onClick={() => togglePlanField(plan, field)}
        disabled={busy}
        className={`text-xs px-2.5 py-1 font-black uppercase tracking-wide whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-wait ${
          plan[field] ? onClass : offClass
        }`}
      >
        {pending.has(`${plan.id}:${field}`) ? "…" : plan[field] ? onLabel : offLabel}
      </button>
    );
  }

  const offClass =
    "bg-foreground/5 dark:bg-foreground/10 text-foreground/40 border-2 border-foreground/20 hover:bg-foreground/10";

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-black text-foreground tracking-tight">Plans</h1>
        <Link
          href="/admin/plans/new"
          className="px-4 py-2 bg-primary text-white text-sm font-bold border-2 border-primary hover:bg-primary-dark transition-colors"
        >
          + Nouveau plan
        </Link>
      </div>

      {error && (
        <div className="mb-4 flex items-start justify-between gap-4 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm px-4 py-3 border-2 border-red-700 dark:border-red-500 font-semibold">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} className="font-black" aria-label="Fermer">
            ×
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-foreground/40">Chargement...</div>
      ) : loadError ? (
        <div className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm px-4 py-3 border-2 border-red-700 dark:border-red-500 font-semibold">
          {loadError}
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-surface border-2 border-outline p-12 text-center">
          <p className="text-foreground/50 mb-4">Aucun plan créé</p>
          <Link href="/admin/plans/new" className="text-primary font-bold hover:underline">
            Créer votre premier plan
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <input
              type="search"
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              placeholder="Rechercher (nom, slug)..."
              className={`${filterClass} w-full sm:w-auto sm:flex-1 sm:min-w-[200px]`}
            />
            <select value={filters.category} onChange={(e) => updateFilter("category", e.target.value)} className={filterClass}>
              <option value="">Toutes catégories</option>
              <option value="villa">Villa</option>
              <option value="duplex">Duplex</option>
            </select>
            <select value={filters.status} onChange={(e) => updateFilter("status", e.target.value)} className={filterClass}>
              <option value="">Tous statuts</option>
              <option value="published">Publié</option>
              <option value="draft">Brouillon</option>
            </select>
            <select value={filters.bedrooms} onChange={(e) => updateFilter("bedrooms", e.target.value)} className={filterClass}>
              <option value="">Toutes chambres</option>
              {bedroomOptions.map((n) => (
                <option key={n} value={n}>
                  {n} chambre{n > 1 ? "s" : ""}
                </option>
              ))}
            </select>
            <select value={filters.featured} onChange={(e) => updateFilter("featured", e.target.value)} className={filterClass}>
              <option value="">Vedette : tous</option>
              <option value="yes">En vedette</option>
              <option value="no">Pas en vedette</option>
            </select>
            <select
              value={filters.cataloguePreview}
              onChange={(e) => updateFilter("cataloguePreview", e.target.value)}
              className={filterClass}
            >
              <option value="">Aperçu : tous</option>
              <option value="yes">Dans l&apos;aperçu catalogue</option>
              <option value="no">Hors aperçu catalogue</option>
            </select>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="px-3 py-2 text-sm font-bold text-primary hover:underline"
              >
                Réinitialiser
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-2 min-h-[34px]">
            <p className="text-xs text-foreground/50 font-semibold mr-auto">
              {filteredPlans.length} / {plans.length} plan{plans.length > 1 ? "s" : ""}
              {visibleSelected.length > 0 && ` · ${visibleSelected.length} sélectionné(s)`}
            </p>
            {visibleSelected.length > 0 && (
              <>
                {(
                  [
                    ["published", true, "Publier"],
                    ["published", false, "Dépublier"],
                    ["featured", true, "Mettre en vedette"],
                    ["featured", false, "Retirer vedette"],
                  ] as const
                ).map(([field, value, label]) => (
                  <button
                    key={label}
                    type="button"
                    disabled={bulkRunning}
                    onClick={() => runBulk(field, value)}
                    className="px-3 py-1.5 text-xs font-bold border-2 border-outline bg-surface text-foreground hover:bg-foreground hover:text-surface transition-colors disabled:opacity-50"
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="px-2 py-1.5 text-xs font-bold text-foreground/50 hover:text-foreground"
                >
                  Désélectionner
                </button>
              </>
            )}
          </div>

          {filteredPlans.length === 0 ? (
            <div className="bg-surface border-2 border-outline p-12 text-center text-foreground/50">
              Aucun plan ne correspond aux filtres
            </div>
          ) : (
            <div className="bg-surface border-2 border-outline overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="text-left text-foreground/60 border-b-2 border-outline bg-surface">
                    <th className="pl-4 pr-1 py-3 w-8">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAllVisible}
                        aria-label="Tout sélectionner"
                        className="w-4 h-4 accent-primary"
                      />
                    </th>
                    <SortHeader label="Plan" sortKey="name" />
                    <SortHeader label="Catégorie" sortKey="category" />
                    <SortHeader label="Surface" sortKey="surface" />
                    <SortHeader label="Ch." sortKey="bedrooms" />
                    <th className="px-3 py-3 font-black uppercase tracking-wider text-xs">Statut</th>
                    <th className="px-3 py-3 font-black uppercase tracking-wider text-xs">Vedette</th>
                    <th className="px-3 py-3 font-black uppercase tracking-wider text-xs">Aperçu</th>
                    <SortHeader label="Modifié" sortKey="updatedAt" />
                    <th className="px-3 py-3 font-black uppercase tracking-wider text-xs text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlans.map((plan) => (
                    <tr
                      key={plan.id}
                      className={`border-b-2 border-outline last:border-b-0 ${
                        selected.has(plan.id) ? "bg-primary/5" : "hover:bg-foreground/5"
                      }`}
                    >
                      <td className="pl-4 pr-1 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(plan.id)}
                          onChange={() => toggleSelected(plan.id)}
                          aria-label={`Sélectionner ${plan.name}`}
                          className="w-4 h-4 accent-primary"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          {plan.thumbnail ? (
                            <Image
                              src={plan.thumbnail}
                              alt={plan.name}
                              width={36}
                              height={36}
                              sizes="36px"
                              quality={40}
                              className="w-9 h-9 object-cover bg-surface flex-shrink-0 border border-outline"
                            />
                          ) : (
                            <div className="w-9 h-9 flex-shrink-0 border border-outline bg-foreground/10" />
                          )}
                          <div className="min-w-0">
                            <Link href={`/admin/plans/${plan.id}`} className="font-bold text-foreground hover:text-primary whitespace-nowrap">
                              {plan.name}
                            </Link>
                            <p className="text-xs text-foreground/40 font-mono whitespace-nowrap">
                              {plan.slug}
                              {plan.published && (
                                <a
                                  href={`/plans/${plan.slug}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Voir sur le site"
                                  aria-label={`Voir ${plan.name} sur le site`}
                                  className="ml-1.5 font-sans font-bold text-primary hover:underline"
                                >
                                  ↗
                                </a>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 capitalize text-foreground/70 font-semibold">{plan.category}</td>
                      <td className="px-3 py-3 text-foreground/70 whitespace-nowrap">{plan.surface} m²</td>
                      <td className="px-3 py-3 text-foreground/70">{plan.bedrooms}</td>
                      <td className="px-3 py-3">
                        <ToggleButton
                          plan={plan}
                          field="published"
                          onLabel="Publié"
                          offLabel="Brouillon"
                          onClass="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-2 border-green-700 dark:border-green-500 hover:bg-green-700 hover:text-white"
                          offClass="bg-foreground/5 dark:bg-foreground/10 text-foreground/50 border-2 border-foreground/20 hover:bg-foreground/10"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <ToggleButton
                          plan={plan}
                          field="featured"
                          onLabel="Vedette"
                          offLabel="—"
                          onClass="bg-primary/10 text-primary border-2 border-primary hover:bg-primary hover:text-white"
                          offClass={offClass}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <ToggleButton
                          plan={plan}
                          field="cataloguePreview"
                          onLabel="Catalogue"
                          offLabel="—"
                          onClass="bg-accent/10 text-accent border-2 border-accent hover:bg-accent hover:text-white"
                          offClass={offClass}
                        />
                      </td>
                      <td className="px-3 py-3 text-xs text-foreground/50 whitespace-nowrap">{formatDate(plan.updatedAt)}</td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                          <Link href={`/admin/plans/${plan.id}`} className="text-xs text-primary hover:underline font-bold">
                            Modifier
                          </Link>
                          {confirmDeleteId === plan.id ? (
                            <span className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDelete(plan.id)}
                                disabled={deleting === plan.id}
                                className="px-2 py-1 text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                              >
                                {deleting === plan.id ? "..." : "Confirmer"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 text-xs font-bold bg-foreground/10 text-foreground border border-foreground/20 hover:bg-foreground/20 transition-colors"
                              >
                                Annuler
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(plan.id)}
                              className="text-xs text-red-500 hover:underline font-bold"
                            >
                              Supprimer
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
