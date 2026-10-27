/**
 * Histogramme mono-série (une seule échelle), avec info-bulle native par barre : par jour (`day` AAAA-MM-JJ)
 * ou par heure (`day` « HH », série d'une seule journée).
 */
export function DailyBars({
  title,
  data,
  format = (v) => String(v),
}: {
  title: string;
  data: { day: string; value: number }[];
  format?: (v: number) => string;
}) {
  const label = (day: string | undefined) =>
    !day ? "" : /^\d{2}$/.test(day) ? `${Number(day)} h` : new Date(day).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);
  const width = 600;
  const height = 120;
  const gap = 2;
  const barW = Math.max(2, width / data.length - gap);
  return (
    <figure className="card p-5">
      <figcaption className="flex items-baseline justify-between text-sm">
        <span className="font-semibold">{title}</span>
        <span className="text-muted">Total : {format(total)}</span>
      </figcaption>
      <svg viewBox={`0 0 ${width} ${height + 18}`} className="mt-3 w-full" role="img" aria-label={`${title}, total ${format(total)}`}>
        <line x1={0} x2={width} y1={height} y2={height} stroke="#DFE5EA" strokeWidth={1} />
        {data.map((d, i) => {
          const h = d.value ? Math.max(3, (d.value / max) * (height - 8)) : 0;
          const x = i * (barW + gap);
          return (
            <g key={d.day}>
              <rect x={x} y={0} width={barW + gap} height={height} fill="transparent">
                <title>{`${label(d.day)} : ${format(d.value)}`}</title>
              </rect>
              {h > 0 ? (
                <path
                  d={`M${x},${height} V${height - h + 2} q0,-2 2,-2 H${x + barW - 2} q2,0 2,2 V${height} Z`}
                  fill="#0F5B59"
                  pointerEvents="none"
                />
              ) : null}
            </g>
          );
        })}
        <text x={0} y={height + 14} fontSize={10} fill="#6B7280">
          {label(data[0]?.day)}
        </text>
        <text x={width} y={height + 14} fontSize={10} fill="#6B7280" textAnchor="end">
          {label(data.at(-1)?.day)}
        </text>
      </svg>
    </figure>
  );
}
