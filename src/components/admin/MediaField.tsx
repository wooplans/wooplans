"use client";

import { useState } from "react";

/**
 * Liste de fichiers R2 gérée côté client, sérialisée en JSON dans un champ caché.
 * Public : URL « /media/… ». Privé : clé R2, servie via la route protégée.
 */
export function MediaField({
  name,
  label,
  initial,
  visibility,
  folder,
  hint,
}: {
  name: string;
  label: string;
  initial: string[];
  visibility: "public" | "private";
  folder: string;
  hint?: string;
}) {
  const [items, setItems] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = (v: string) =>
    visibility === "public" || v.startsWith("/") || v.startsWith("http") ? v : `/api/premium/fichier/${v}`;

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.set("visibility", visibility);
    body.set("folder", folder);
    for (const file of Array.from(files)) body.append("files", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { files?: { url: string }[]; error?: string } | null;
    setBusy(false);
    if (!res?.ok || !data?.files) {
      setError(data?.error || "Échec du téléversement");
      return;
    }
    setItems((prev) => [...prev, ...data.files!.map((f) => f.url)]);
  }

  const move = (i: number, d: number) =>
    setItems((prev) => {
      const next = [...prev];
      const j = i + d;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div>
      <p className="label">{label}</p>
      {hint ? <p className="-mt-1 mb-2 text-xs text-muted">{hint}</p> : null}
      <input type="hidden" name={name} value={JSON.stringify(items)} />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {items.map((item, i) => (
          <div key={item} className="relative overflow-hidden rounded-lg border border-outline bg-background">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview(item)} alt="" className="aspect-square w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 px-1 text-xs text-white">
              <button type="button" onClick={() => move(i, -1)} aria-label="Avant">←</button>
              <button type="button" onClick={() => setItems((p) => p.filter((x) => x !== item))} aria-label="Retirer">✕</button>
              <button type="button" onClick={() => move(i, 1)} aria-label="Après">→</button>
            </div>
            {i === 0 && visibility === "public" ? <span className="absolute left-1 top-1 rounded bg-primary px-1 text-[10px] text-white">Couverture</span> : null}
          </div>
        ))}
        <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-outline text-center text-xs text-muted hover:border-primary">
          {busy ? "Envoi…" : "+ Ajouter"}
          <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => upload(e.target.files)} />
        </label>
      </div>
      {error ? <p className="mt-1 text-xs text-secondary">{error}</p> : null}
    </div>
  );
}
