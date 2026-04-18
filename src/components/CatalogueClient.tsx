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
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex gap-1 border border-outline/10 bg-surface rounded-full p-1">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`px-4 py-2 text-xs font-semibold rounded-full transition-colors ${
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
          placeholder="Rechercher un plan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-outline/10 bg-surface text-sm rounded-full focus:outline-none focus:border-primary"
        />
      </div>
      <PlanGrid plans={filtered} />
    </>
  );
}
