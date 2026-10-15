import { formatDimensions, levelsLabel, type PublicPlan } from "@/lib/plans";

export function PlanSpecs({ plan }: { plan: PublicPlan }) {
  const items = [
    { label: "Chambres", value: String(plan.bedrooms) },
    { label: "Salles de bain", value: String(plan.bathrooms) },
    { label: "Niveaux", value: levelsLabel(plan.levels) },
    { label: "Surface totale", value: plan.surfaceTotal ? `${plan.surfaceTotal} m²` : null },
    { label: "Emprise au sol", value: plan.footprint ? `${plan.footprint} m²` : null },
    { label: "Dimensions du bâtiment", value: formatDimensions(plan.buildingWidth, plan.buildingDepth) },
    {
      label: "Terrain nécessaire",
      value: plan.landArea
        ? `${plan.landArea} m²${formatDimensions(plan.landWidth, plan.landDepth) ? ` (${formatDimensions(plan.landWidth, plan.landDepth)})` : ""}`
        : null,
    },
  ].filter((i): i is { label: string; value: string } => Boolean(i.value));

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-outline bg-outline">
      {items.map((item) => (
        <div key={item.label} className="bg-surface p-4">
          <dt className="text-xs text-muted">{item.label}</dt>
          <dd className="mt-1 font-semibold">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
