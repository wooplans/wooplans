import Link from "next/link";
import { shiftDay } from "@/lib/date-range";

export function PageTitle({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function PeriodTabs({ current, base }: { current: number | null; base: string }) {
  const periods = [7, 30, 90, 365];
  return (
    <div className="flex rounded-full border border-outline bg-surface p-1 text-sm">
      {periods.map((p) => (
        <Link
          key={p}
          href={`${base}?jours=${p}`}
          className={`rounded-full px-3 py-1 ${p === current ? "bg-primary text-white" : "text-foreground/70 hover:text-primary"}`}
        >
          {p === 365 ? "1 an" : `${p} j`}
        </Link>
      ))}
    </div>
  );
}

/** Choix d'un jour précis (formulaire GET ?jour=AAAA-MM-JJ, sans JavaScript) : raccourcis, jour précédent / suivant. */
export function DayPicker({ day, today, base }: { day: string | null; today: string; base: string }) {
  const yesterday = shiftDay(today, -1);
  const chip = (d: string, label: string) => (
    <Link
      href={`${base}?jour=${d}`}
      className={`rounded-full px-3 py-1 ${d === day ? "bg-primary text-white" : "text-foreground/70 hover:text-primary"}`}
    >
      {label}
    </Link>
  );
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <div className="flex rounded-full border border-outline bg-surface p-1">
        {chip(today, "Aujourd'hui")}
        {chip(yesterday, "Hier")}
      </div>
      <form action={base} method="get" className="flex items-center gap-1 rounded-full border border-outline bg-surface p-1 pl-3">
        {day ? (
          <Link href={`${base}?jour=${shiftDay(day, -1)}`} aria-label="Jour précédent" className="px-1 text-foreground/70 hover:text-primary">‹</Link>
        ) : null}
        <input type="date" name="jour" defaultValue={day ?? ""} max={today} required aria-label="Jour précis" className="bg-transparent text-sm outline-none" />
        {day && day < today ? (
          <Link href={`${base}?jour=${shiftDay(day, 1)}`} aria-label="Jour suivant" className="px-1 text-foreground/70 hover:text-primary">›</Link>
        ) : null}
        <button type="submit" className="rounded-full bg-primary px-3 py-1 text-white">Voir</button>
      </form>
    </div>
  );
}

export function Table({ head, children, empty }: { head: string[]; children: React.ReactNode; empty?: boolean }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="bg-background text-left text-xs uppercase tracking-wide text-muted">
          <tr>{head.map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-outline">{children}</tbody>
      </table>
      {empty ? <p className="p-6 text-center text-sm text-muted">Rien à afficher pour le moment.</p> : null}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "info" }) {
  const tones = {
    neutral: "bg-background text-foreground/70",
    good: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-700",
    bad: "bg-red-50 text-red-700",
    info: "bg-primary/10 text-primary",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export const fmtDate = (d: Date | null | undefined) =>
  d ? d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
export const fmtDateTime = (d: Date | null | undefined) =>
  d ? d.toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Douala" }) : "—";
export const pct = (v: number) => `${(v * 100).toFixed(1).replace(".", ",")} %`;
