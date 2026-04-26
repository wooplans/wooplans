"use client";

import { useState } from "react";

type SettingsFormProps = {
  initialRates: {
    villa: number | null;
    duplex: number | null;
  };
};

type SaveResponse = {
  error?: string;
  rates?: {
    villa: number | null;
    duplex: number | null;
  };
};

function toInputValue(value: number | null) {
  return value === null ? "" : String(value);
}

export function SettingsForm({ initialRates }: SettingsFormProps) {
  const [villa, setVilla] = useState(toInputValue(initialRates.villa));
  const [duplex, setDuplex] = useState(toInputValue(initialRates.duplex));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/admin/cost-rates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ villa, duplex }),
      });
      const data = (await res.json().catch(() => ({}))) as SaveResponse;

      if (!res.ok) {
        setError(data.error || "Erreur lors de l'enregistrement");
        return;
      }

      if (data.rates) {
        setVilla(toInputValue(data.rates.villa));
        setDuplex(toInputValue(data.rates.duplex));
      }

      setMessage("Prix au m2 enregistres.");
    } catch {
      setError("Erreur reseau lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full px-3 py-2 border-2 border-outline text-sm focus:outline-none focus:border-primary";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm px-4 py-3 border-2 border-red-700 dark:border-red-500 font-semibold">
          {error}
        </div>
      )}
      {message && (
        <div className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 text-sm px-4 py-3 border-2 border-green-700 dark:border-green-500 font-semibold">
          {message}
        </div>
      )}

      <div className="bg-surface border-2 border-outline p-6 space-y-5">
        <div>
          <h2 className="font-semibold text-foreground">Prix de construction</h2>
          <p className="text-xs text-foreground/40 mt-1">
            Montants globaux en FCFA par m2. Les regions seront ajoutees plus tard.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1">
              Villa (FCFA / m2)
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={villa}
              onChange={(event) => setVilla(event.target.value)}
              className={inputClass}
              placeholder="Ex: 172250"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1">
              Duplex (FCFA / m2)
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={duplex}
              onChange={(event) => setDuplex(event.target.value)}
              className={inputClass}
              placeholder="Ex: 245125"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="px-6 py-2.5 bg-primary text-white text-sm font-bold border-2 border-primary hover:bg-primary-dark transition-colors disabled:opacity-50"
      >
        {saving ? "Enregistrement..." : "Enregistrer les reglages"}
      </button>
    </form>
  );
}
