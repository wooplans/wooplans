"use client";

import { useEffect, useRef, useState } from "react";

type PlanState = { code: string; name: string; status: string; expires_at: string; renders: string[]; cover_image: string; floor_plans: number; max_bytes: number };
type Line = { id: number; name: string; role: Role; state: "attente" | "envoi" | "ok" | "erreur"; message?: string };
type Role = "render" | "floor_plan";

const ROLES: { role: Role; title: string; hint: string; accept: string }[] = [
  { role: "render", title: "Rendus 3D (publics)", hint: "png, jpeg ou webp. Le premier envoyé devient la couverture s'il n'y en a pas.", accept: "image/png,image/jpeg,image/webp" },
  { role: "floor_plan", title: "Distributions cotées (Premium)", hint: "png, jpeg, webp ou PDF. Visibles des seuls membres Premium.", accept: "image/png,image/jpeg,image/webp,application/pdf" },
];

export function UploadLinkForm() {
  const [token, setToken] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [pending, setPending] = useState(0);
  // Envois strictement l'un après l'autre : l'ordre d'envoi est l'ordre d'affichage sur la fiche.
  const queue = useRef<Promise<void>>(Promise.resolve());
  const nextId = useRef(0);
  const busy = pending > 0;

  async function refresh(t: string) {
    const res = await fetch("/api/televersement", { headers: { authorization: `Bearer ${t}` }, cache: "no-store" }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as ({ error?: string } & Partial<PlanState>) | null;
    if (!res?.ok) setError(data?.error || "Lien d'envoi invalide ou expiré.");
    else setPlan(data as PlanState);
  }

  useEffect(() => {
    const load = () => {
      const t = window.location.hash.slice(1);
      setPlan(null);
      setError(null);
      setToken(t || null);
      if (!t) setError("Lien incomplet : ouvrez le lien exact donné par l'agent.");
      else void refresh(t);
    };
    load();
    window.addEventListener("hashchange", load);
    return () => window.removeEventListener("hashchange", load);
  }, []);

  function send(role: Role, files: FileList | null) {
    if (!token || !files?.length) return;
    const items = Array.from(files).map((file) => ({ file, id: nextId.current++ }));
    setLines((prev) => [...prev, ...items.map(({ file, id }) => ({ id, name: file.name, role, state: "attente" as const }))]);
    setPending((n) => n + items.length);
    const maxBytes = plan?.max_bytes ?? Infinity;
    queue.current = queue.current.then(async () => {
      for (const { file, id } of items) {
        const update = (patch: Partial<Line>) => setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
        if (file.size > maxBytes) {
          update({ state: "erreur", message: `dépasse ${maxBytes / 1048576} Mo` });
        } else {
          update({ state: "envoi" });
          const url = `/api/televersement?role=${role}&filename=${encodeURIComponent(file.name)}`;
          const res = await fetch(url, { method: "PUT", body: file, headers: { authorization: `Bearer ${token}` } }).catch(() => null);
          const data = (await res?.json().catch(() => null)) as { error?: string } | null;
          update(res?.ok ? { state: "ok" } : { state: "erreur", message: data?.error || "échec de l'envoi" });
        }
        setPending((n) => n - 1);
      }
      await refresh(token);
    });
  }

  if (error) {
    return (
      <div className="card mx-auto max-w-xl p-6">
        <h1 className="text-xl font-semibold">Envoi de fichiers</h1>
        <p className="mt-3 text-secondary">{error}</p>
      </div>
    );
  }
  if (!plan) return <p className="text-muted">Chargement…</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <p className="eyebrow">Envoi de fichiers</p>
      <h1 className="mt-1 text-2xl font-semibold">
        {plan.name} <span className="text-muted">({plan.code}, {plan.status === "published" ? "publié" : "brouillon"})</span>
      </h1>
      <p className="mt-2 text-sm text-muted">
        Lien valable jusqu&apos;au {new Date(plan.expires_at).toLocaleString("fr-FR")}. Fichiers de {plan.max_bytes / 1048576} Mo maximum. Les fichiers sont ajoutés dans l&apos;ordre d&apos;envoi.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {ROLES.map(({ role, title, hint, accept }) => (
          <label key={role} className="card flex cursor-pointer flex-col gap-2 border-2 border-dashed p-5 hover:border-primary">
            <span className="font-semibold">{title}</span>
            <span className="text-sm text-muted">{hint}</span>
            <span className="text-sm">{role === "render" ? `${plan.renders.length} rendu(s)` : `${plan.floor_plans} distribution(s)`} actuellement</span>
            <span className="btn btn-primary mt-2 self-start">{busy ? `Envoi en cours (${pending})…` : "Choisir des fichiers"}</span>
            <input type="file" multiple accept={accept} className="hidden" onChange={(e) => { send(role, e.target.files); e.target.value = ""; }} />
          </label>
        ))}
      </div>

      {lines.length > 0 ? (
        <ul className="card mt-6 divide-y divide-outline text-sm">
          {lines.map((l) => (
            <li key={l.id} className="flex justify-between gap-4 px-4 py-2">
              <span className="truncate">{l.name} <span className="text-muted">— {l.role === "render" ? "rendu" : "distribution"}</span></span>
              <span className={l.state === "erreur" ? "text-secondary" : l.state === "ok" ? "text-primary" : "text-muted"}>
                {l.state === "ok" ? "✓ ajouté" : l.state === "erreur" ? `✗ ${l.message}` : l.state === "envoi" ? "envoi…" : "en attente"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {plan.renders.length > 0 ? (
        <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {plan.renders.map((src) => (
            <div key={src} className="relative overflow-hidden rounded-lg border border-outline">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="aspect-square w-full object-cover" />
              {src === plan.cover_image ? <span className="absolute left-1 top-1 rounded bg-primary px-1 text-[10px] text-white">Couverture</span> : null}
            </div>
          ))}
        </div>
      ) : null}
      <p className="mt-6 text-sm text-muted">Une fois terminé, revenez à la conversation et dites à l&apos;agent que les fichiers sont envoyés.</p>
    </div>
  );
}
