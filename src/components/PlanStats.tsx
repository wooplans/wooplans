type PlanStatsProps = {
  surface: number;
  bedrooms: number;
  bathrooms: number;
  floors: number;
};

export function PlanStats({
  surface,
  bedrooms,
  bathrooms,
  floors,
}: PlanStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <StatItem label="Surface" value={`${surface} m²`} />
      <StatItem label="Chambres" value={`${bedrooms}`} />
      <StatItem label="Salles de bain" value={`${bathrooms}`} />
      <StatItem label="Niveaux" value={`${floors}`} />
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-4 text-center border border-outline/10 rounded-2xl bg-surface">
      <p className="text-xl font-semibold text-foreground">{value}</p>
      <p className="text-[11px] text-foreground/50 uppercase tracking-[0.2em] font-semibold mt-1">
        {label}
      </p>
    </div>
  );
}
