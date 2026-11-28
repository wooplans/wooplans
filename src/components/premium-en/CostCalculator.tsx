"use client";

import { useState } from "react";

type Range = [number, number | null];
type Props = {
  area: number;
  currency: string;
  /** Postes du devis, en % (répartition du devis WOOPLANS du modèle). */
  shares: { label: string; share: number }[];
  ranges: Partial<Record<"basic" | "standard" | "luxury", Range>>;
  defaults: Partial<Record<"basic" | "standard" | "luxury", number>>;
  source: { name: string; url: string } | null;
};

const LEVELS = [
  { key: "basic", label: "Basic" },
  { key: "standard", label: "Standard" },
  { key: "luxury", label: "Luxury" },
] as const;

const fmt = (currency: string, v: number) => `${currency} ${Math.round(v).toLocaleString("en-US")}`;

/** Calculateur de coût (façon Maramani) : prix au m² × surface, réparti selon les postes du devis du modèle. */
export function CostCalculator({ area, currency, shares, ranges, defaults, source }: Props) {
  const first = defaults.standard ? "standard" : null;
  const [level, setLevel] = useState<"basic" | "standard" | "luxury" | null>(first);
  const [rate, setRate] = useState<number>(first ? defaults.standard! : 0);
  const total = rate * area;
  const range = level ? ranges[level] : undefined;

  return (
    <div className="card p-5">
      <div className="flex flex-wrap gap-2">
        {LEVELS.map((l) => {
          const d = defaults[l.key];
          return (
            <button
              key={l.key}
              type="button"
              disabled={!d}
              onClick={() => {
                setLevel(l.key);
                setRate(d!);
              }}
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${level === l.key ? "border-primary bg-primary text-white" : "border-outline"} disabled:opacity-40`}
            >
              {l.label}
            </button>
          );
        })}
      </div>
      <label className="mt-4 grid gap-1 text-sm font-semibold">
        Price per m² ({currency})
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={500}
          value={rate || ""}
          placeholder="Your builder's price per m²"
          onChange={(e) => {
            setRate(Number(e.target.value) || 0);
            setLevel(null);
          }}
          className="input"
        />
      </label>
      {range ? (
        <p className="mt-1 text-xs text-muted">
          Published range: {fmt(currency, range[0])}
          {range[1] ? ` – ${Math.round(range[1]).toLocaleString("en-US")}` : "+"} per m²
        </p>
      ) : null}
      <table className="mt-4 w-full text-sm">
        <tbody>
          {shares.map((s) => (
            <tr key={s.label} className="border-t border-outline">
              <td className="py-2 pr-2">{s.label}</td>
              <td className="py-2 text-right font-medium">{total ? fmt(currency, (total * s.share) / 100) : `${s.share.toFixed(1)}%`}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-primary">
            <td className="py-3 font-semibold">Estimated total ({area} m²)</td>
            <td className="py-3 text-right font-bold text-primary">{total ? fmt(currency, total) : "—"}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-3 text-xs text-muted">
        Construction only: excludes land, permits, professional fees and connections. Prices change from one town to another: always confirm with your builder.
        {source ? (
          <>
            {" "}Published ranges: <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline">{source.name}</a>, third-party estimates.
          </>
        ) : null}
      </p>
    </div>
  );
}
