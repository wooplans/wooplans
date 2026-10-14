"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export function OfflineProjectForm({
  members,
  plans,
}: {
  members: { id: string; email: string }[];
  plans: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw Error(data.error || "Erreur");
      form.reset();
      setMessage("Projet ajouté");
      router.refresh();
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="rounded-xl border p-5">
      <summary className="font-semibold">
        Ajouter une demande reçue sur WhatsApp ou hors ligne
      </summary>
      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label>
          Membre
          <select
            name="subscriberId"
            required
            className="block w-full border p-2"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.email}
              </option>
            ))}
          </select>
        </label>
        <label>
          Modèle
          <select name="modelSlug" required className="block w-full border p-2">
            {plans.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Téléphone
          <input name="phone" className="block w-full border p-2" />
        </label>
        <label>
          Localisation
          <input name="location" className="block w-full border p-2" />
        </label>
        <label className="sm:col-span-2">
          Besoins
          <textarea name="needs" className="block w-full border p-2" />
        </label>
        <button
          disabled={busy || !members.length || !plans.length}
          className="bg-primary p-3 text-white"
        >
          Créer le projet
        </button>
        <p role="status">{message}</p>
      </form>
    </details>
  );
}
