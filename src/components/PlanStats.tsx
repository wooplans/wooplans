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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatItem label="Surface bâtie" value={`${surface} m²`} />
      <StatItem label="Chambres" value={`${bedrooms}`} />
      <StatItem label="Salles d'eau" value={`${bathrooms}`} />
      <StatItem label="Niveaux" value={`${floors}`} />
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-outline/10 bg-surface p-5 shadow-[0_14px_45px_rgba(38,33,29,0.05)]">
      <p className="font-display text-3xl text-foreground">{value}</p>
      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted">
        {label}
      </p>
    </div>
  );
}
