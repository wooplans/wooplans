"use client";

import { useEffect, useState } from "react";
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

type PlanMutationResponse = {
  error?: string;
  published?: boolean;
  featured?: boolean;
  cataloguePreview?: boolean;
};

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/plans")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPlans(data);
          setError("");
        } else {
          setError("Erreur lors du chargement des plans");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Erreur lors du chargement des plans");
        setLoading(false);
      });
  }, []);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer le plan "${name}" ? Cette action est irréversible.`)) return;

    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/plans/${id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (res.ok) {
        setPlans((prev) => prev.filter((p) => p.id !== id));
        setError("");
      } else {
        setError(data.error || "Erreur lors de la suppression");
      }
    } catch {
      setError("Erreur reseau lors de la suppression");
    }
    setDeleting(null);
  }

  async function togglePublished(plan: Plan) {
    try {
      const res = await fetch(`/api/admin/plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !plan.published }),
      });

      if (res.ok) {
        const updated = (await res.json()) as PlanMutationResponse;
        setPlans((prev) =>
          prev.map((p) => (p.id === plan.id ? { ...p, published: Boolean(updated.published) } : p))
        );
        setError("");
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Erreur lors de la mise a jour du statut");
      }
    } catch {
      setError("Erreur reseau lors de la mise a jour du statut");
    }
  }

  async function toggleFeatured(plan: Plan) {
    try {
      const res = await fetch(`/api/admin/plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured: !plan.featured }),
      });

      if (res.ok) {
        const updated = (await res.json()) as PlanMutationResponse;
        setPlans((prev) =>
          prev.map((p) => (p.id === plan.id ? { ...p, featured: Boolean(updated.featured) } : p))
        );
        setError("");
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Erreur lors de la mise en avant");
      }
    } catch {
      setError("Erreur reseau lors de la mise en avant");
    }
  }

  async function toggleCataloguePreview(plan: Plan) {
    try {
      const res = await fetch(`/api/admin/plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cataloguePreview: !plan.cataloguePreview }),
      });

      if (res.ok) {
        const updated = (await res.json()) as PlanMutationResponse;
        setPlans((prev) =>
          prev.map((p) =>
            p.id === plan.id ? { ...p, cataloguePreview: Boolean(updated.cataloguePreview) } : p,
          ),
        );
        setError("");
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Erreur lors de la mise a jour de l'apercu catalogue");
      }
    } catch {
      setError("Erreur reseau lors de la mise a jour de l'apercu catalogue");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-foreground tracking-tight">Plans</h1>
        <Link
          href="/admin/plans/new"
          className="px-4 py-2 bg-primary text-white text-sm font-bold border-2 border-primary hover:bg-primary-dark transition-colors"
        >
          + Nouveau plan
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-foreground/40">Chargement...</div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm px-4 py-3 border-2 border-red-700 dark:border-red-500 font-semibold">
          {error}
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-surface border-2 border-outline p-12 text-center">
          <p className="text-foreground/50 mb-4">Aucun plan créé</p>
          <Link
            href="/admin/plans/new"
            className="text-primary font-bold hover:underline"
          >
            Créer votre premier plan
          </Link>
        </div>
      ) : (
        <div className="bg-surface border-2 border-outline overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-foreground/60 border-b-2 border-outline bg-surface">
                <th className="px-5 py-3 font-black uppercase tracking-wider text-xs">Plan</th>
                <th className="px-5 py-3 font-black uppercase tracking-wider text-xs">Catégorie</th>
                <th className="px-5 py-3 font-black uppercase tracking-wider text-xs">Surface</th>
                <th className="px-5 py-3 font-black uppercase tracking-wider text-xs">Statut</th>
                <th className="px-5 py-3 font-black uppercase tracking-wider text-xs">Vedette</th>
                <th className="px-5 py-3 font-black uppercase tracking-wider text-xs">AperÃ§u</th>
                <th className="px-5 py-3 font-black uppercase tracking-wider text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-surface/50 border-b-2 border-outline last:border-b-0">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Image
                        src={plan.thumbnail}
                        alt={plan.name}
                        width={36}
                        height={36}
                        sizes="36px"
                        quality={40}
                        className="w-9 h-9 object-cover bg-surface flex-shrink-0 border border-outline"
                      />
                      <div>
                        <p className="font-bold text-foreground">{plan.name}</p>
                        <p className="text-xs text-foreground/40 font-mono">{plan.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 capitalize text-foreground/70 font-semibold">
                    {plan.category}
                  </td>
                  <td className="px-5 py-3 text-foreground/70">
                    {plan.surface} m²
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => togglePublished(plan)}
                      className={`text-xs px-2.5 py-1 font-black uppercase tracking-wide transition-colors ${
                        plan.published
? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-2 border-green-700 dark:border-green-500 hover:bg-green-700 hover:text-white"
                           : "bg-foreground/5 dark:bg-foreground/10 text-foreground/50 border-2 border-foreground/20 hover:bg-foreground/10"
                      }`}
                    >
                      {plan.published ? "Publié" : "Brouillon"}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => toggleFeatured(plan)}
                      className={`text-xs px-2.5 py-1 font-black uppercase tracking-wide transition-colors ${
                        plan.featured
                          ? "bg-primary/10 text-primary border-2 border-primary hover:bg-primary hover:text-white"
                          : "bg-foreground/5 dark:bg-foreground/10 text-foreground/40 border-2 border-foreground/20 hover:bg-foreground/10"
                      }`}
                    >
                      {plan.featured ? "Vedette" : "—"}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => toggleCataloguePreview(plan)}
                      className={`text-xs px-2.5 py-1 font-black uppercase tracking-wide transition-colors ${
                        plan.cataloguePreview
                          ? "bg-accent/10 text-accent border-2 border-accent hover:bg-accent hover:text-white"
                          : "bg-foreground/5 dark:bg-foreground/10 text-foreground/40 border-2 border-foreground/20 hover:bg-foreground/10"
                      }`}
                    >
                      {plan.cataloguePreview ? "Catalogue" : "—"}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/plans/${plan.id}`}
                        className="text-xs text-primary hover:underline font-bold"
                      >
                        Modifier
                      </Link>
                      <button
                        onClick={() => handleDelete(plan.id, plan.name)}
                        disabled={deleting === plan.id}
                        className="text-xs text-red-500 hover:underline font-bold disabled:opacity-50"
                      >
                        {deleting === plan.id ? "..." : "Supprimer"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
