"use client";

import { useState, useMemo } from "react";
import { PlanGrid, type PlanListItem } from "./PlanGrid";

type CatalogueClientProps = {
  plans: PlanListItem[];
};

export function CatalogueClient({ plans }: CatalogueClientProps) {
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let result = plans;

    if (category !== "all") {
      result = result.filter((p) => p.category === category);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }

    return result;
  }, [plans, category, search]);

  const categories = [
    { value: "all", label: "Tous" },
    { value: "villa", label: "Villas" },
    { value: "duplex", label: "Duplex" },
  ];

  return (
    <>
      <div className="mb-10 rounded-[2rem] border border-outline/10 bg-surface p-3 shadow-[0_18px_60px_rgba(38,33,29,0.06)]">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex gap-1 rounded-full bg-background p-1">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`px-5 py-2.5 text-xs font-black uppercase tracking-[0.14em] rounded-full transition-colors ${
                category === cat.value
                  ? "bg-primary text-white"
                  : "text-foreground/70 hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
          </div>
          <input
            type="text"
            placeholder="Rechercher un modèle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-full border border-outline/10 bg-background px-5 py-3 text-sm font-semibold text-foreground placeholder:text-muted/70 focus:outline-none focus:border-primary"
          />
        </div>
      </div>
      <PlanGrid plans={filtered} />
    </>
  );
}
