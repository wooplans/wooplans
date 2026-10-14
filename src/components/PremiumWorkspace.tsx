"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
type Props = {
  plans: {
    slug: string;
    name: string;
    surface: number;
    bedrooms: number;
    budget: number;
  }[];
  favorites: string[];
  initialModel?: string;
};
export function PremiumWorkspace({ plans, favorites, initialModel }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function favorite(slug: string, selected: boolean) {
    setBusy(true);
    try {
      const r = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelSlug: slug, selected }),
      });
      if (!r.ok) throw Error("Favori non enregistré");
      router.refresh();
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = e.currentTarget;
    try {
      const r = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const data = (await r.json()) as { error?: string };
      if (!r.ok) throw Error(data.error || "Erreur");
      setMessage(
        "Votre demande est enregistrée. Wooplans vous contactera pour préciser le projet.",
      );
      form.reset();
      router.refresh();
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }
  const chosen = plans.filter((p) => favorites.includes(p.slug));
  return (
    <div className="space-y-8">
      <p role="status">{message}</p>
      <section>
        <h2 className="text-2xl font-semibold">Mes modèles favoris</h2>
        <p className="my-3">
          Commencez par sélectionner trois références à comparer.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th>Modèle</th>
                <th>Chambres</th>
                <th>Surface</th>
                <th>Budget indicatif</th>
              </tr>
            </thead>
            <tbody>
              {chosen.map((p) => (
                <tr key={p.slug} className="border-b">
                  <td className="py-3">
                    <Link href={`/plans/${p.slug}`}>{p.name}</Link>
                  </td>
                  <td>{p.bedrooms}</td>
                  <td>{p.surface} m²</td>
                  <td>{p.budget.toLocaleString("fr-FR")} FCFA</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-2">
        {plans.map((p) => (
          <article key={p.slug} className="rounded-xl border p-4">
            <Link className="font-semibold" href={`/plans/${p.slug}`}>
              {p.name}
            </Link>
            <button
              disabled={busy}
              onClick={() => favorite(p.slug, !favorites.includes(p.slug))}
              className="mt-3 block text-primary underline"
            >
              {favorites.includes(p.slug)
                ? "Retirer des favoris"
                : "Ajouter aux favoris"}
            </button>
          </article>
        ))}
      </section>
      <form
        onSubmit={submit}
        className="rounded-2xl border bg-surface p-6 space-y-4"
      >
        <h2 className="text-2xl font-semibold">
          Préparer ma demande de personnalisation
        </h2>
        <p>
          Prestation sur devis ; les documents, délais et éventuel crédit
          catalogue sont convenus avant engagement.
        </p>
        <label className="block">
          Modèle
          <select
            name="modelSlug"
            defaultValue={initialModel}
            required
            className="block w-full rounded border p-3"
          >
            {plans.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        {[
          ["phone", "Téléphone / WhatsApp"],
          ["location", "Ville et pays du projet"],
          ["terrain", "Dimensions et informations sur le terrain"],
        ].map(([name, label]) => (
          <label key={name} className="block">
            {label}
            <input
              name={name}
              required
              maxLength={2000}
              className="block w-full rounded border p-3"
            />
          </label>
        ))}
        <label className="block">
          Besoins et modifications souhaitées
          <textarea
            name="needs"
            required
            maxLength={2000}
            className="block w-full rounded border p-3"
          />
        </label>
        <button
          disabled={busy}
          className="rounded-full bg-accent px-6 py-3 text-white"
        >
          {busy ? "Enregistrement…" : "Envoyer ma demande"}
        </button>
      </form>
    </div>
  );
}
