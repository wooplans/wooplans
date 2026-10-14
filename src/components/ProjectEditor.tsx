"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PROJECT_STAGES } from "@/lib/crm";
type Project = {
  id: string;
  status: string;
  notes: string;
  nextFollowUp: string;
  grossPrice: number;
  catalogueCredit: number;
  paidAmount: number;
};
export function ProjectEditor({ project }: { project: Project }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await fetch("/api/admin/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: project.id,
          ...Object.fromEntries(new FormData(e.currentTarget)),
        }),
      });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) throw Error(d.error || "Erreur");
      setMessage("Enregistré");
      router.refresh();
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2">
      <label>
        Étape
        <select
          name="status"
          defaultValue={project.status}
          className="block w-full border p-2"
        >
          {Object.entries(PROJECT_STAGES).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label>
        Prochain suivi
        <input
          type="date"
          name="nextFollowUp"
          defaultValue={project.nextFollowUp}
          className="block w-full border p-2"
        />
      </label>
      {[
        ["grossPrice", "Prix convenu avant crédit"],
        ["catalogueCredit", "Crédit catalogue convenu"],
        ["paidAmount", "Total réellement encaissé"],
      ].map(([name, label]) => (
        <label key={name}>
          {label} (FCFA)
          <input
            type="number"
            name={name}
            min="0"
            step="1"
            required
            defaultValue={project[name as keyof Project]}
            className="block w-full border p-2"
          />
        </label>
      ))}
      <label className="sm:col-span-2">
        Notes et historique des encaissements
        <textarea
          name="notes"
          defaultValue={project.notes}
          maxLength={10000}
          className="block w-full border p-2"
        />
      </label>
      <p className="sm:col-span-2 text-sm">
        Reste à encaisser :{" "}
        {Math.max(
          0,
          project.grossPrice - project.catalogueCredit - project.paidAmount,
        ).toLocaleString("fr-FR")}{" "}
        FCFA. Renseignez les dates et références des paiements dans les notes.
      </p>
      <button disabled={busy} className="bg-primary px-4 py-2 text-white">
        {busy ? "Enregistrement…" : "Enregistrer le suivi"}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
