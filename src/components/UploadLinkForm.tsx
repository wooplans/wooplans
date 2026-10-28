"use client";

import { useEffect, useRef, useState } from "react";

type PlanState = {
  code: string;
  name: string;
  status: string;
  expires_at: string;
  renders: string[];
  cover_image: string;
  floor_plans: number;
  documents: number;
  videos: number;
  max_bytes: number;
  video_part_bytes: number;
};
type Line = { id: number; name: string; role: Role; state: "attente" | "envoi" | "ok" | "erreur"; message?: string };
type Role = "render" | "floor_plan" | "document" | "video";

const ROLES: { role: Role; title: string; hint: string; accept: string }[] = [
  {
    role: "render",
    title: "Rendus 3D (originaux)",
    hint: "png, jpeg ou webp, en pleine résolution et sans filigrane : l'original est gardé en privé, le site en affiche une version légère filigranée. Le premier devient la couverture s'il n'y en a pas.",
    accept: "image/png,image/jpeg,image/webp",
  },
  { role: "floor_plan", title: "Distributions cotées (Premium)", hint: "png, jpeg, webp ou PDF. Visibles des seuls membres Premium.", accept: "image/png,image/jpeg,image/webp,application/pdf" },
  { role: "document", title: "PDF du modèle (privé)", hint: "Le PDF descriptif du modèle, gardé en privé.", accept: "application/pdf" },
  { role: "video", title: "Vidéo de visite guidée (privée)", hint: "mp4, mov ou webm. Les vidéos lourdes sont envoyées en morceaux.", accept: "video/mp4,video/quicktime,video/webm" },
];

const ROLE_NAMES: Record<Role, string> = { render: "rendu", floor_plan: "distribution", document: "PDF", video: "vidéo" };

const count = (plan: PlanState, role: Role) =>
  ({ render: `${plan.renders.length} rendu(s)`, floor_plan: `${plan.floor_plans} distribution(s)`, document: `${plan.documents} PDF`, video: `${plan.videos} vidéo(s)` })[role];

/** Vidéo trop lourde pour un seul envoi : morceaux de taille fixe (envoi multipart R2, voir /api/televersement). */
async function sendInParts(token: string, file: File, partBytes: number, progress: (done: number, total: number) => void) {
  const auth = { authorization: `Bearer ${token}` };
  const call = async (url: string, init: RequestInit) => {
    const res = await fetch(url, { ...init, headers: { ...auth, ...(init.headers || {}) } });
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok) throw new Error((data?.error as string) || "échec de l'envoi");
    return data!;
  };
  const { upload } = (await call(`/api/televersement?action=start&filename=${encodeURIComponent(file.name)}`, { method: "POST" })) as { upload: string };
  const total = Math.ceil(file.size / partBytes);
  const parts: { partNumber: number; etag: string }[] = [];
  try {
    for (let i = 0; i < total; i++) {
      progress(i, total);
      const chunk = file.slice(i * partBytes, (i + 1) * partBytes);
      parts.push((await call(`/api/televersement?action=part&upload=${upload}&part=${i + 1}`, { method: "PUT", body: chunk })) as { partNumber: number; etag: string });
    }
    await call(`/api/televersement?action=complete&upload=${upload}`, { method: "POST", body: JSON.stringify({ parts }), headers: { "content-type": "application/json" } });
  } catch (error) {
    await fetch(`/api/televersement?action=abort&upload=${upload}`, { method: "POST", headers: auth }).catch(() => {});
    throw error;
  }
}

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
        if (role === "video" && file.size > maxBytes) {
          update({ state: "envoi" });
          try {
            await sendInParts(token, file, plan?.video_part_bytes ?? 50 * 1048576, (done, total) => update({ message: `${done}/${total}` }));
            update({ state: "ok", message: undefined });
          } catch (e) {
            update({ state: "erreur", message: e instanceof Error ? e.message : "échec de l'envoi" });
          }
        } else if (file.size > maxBytes) {
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
        Lien valable jusqu&apos;au {new Date(plan.expires_at).toLocaleString("fr-FR")}. Fichiers de {plan.max_bytes / 1048576} Mo maximum (vidéos : sans limite pratique). Les fichiers sont ajoutés dans l&apos;ordre d&apos;envoi.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {ROLES.map(({ role, title, hint, accept }) => (
          <label key={role} className="card flex cursor-pointer flex-col gap-2 border-2 border-dashed p-5 hover:border-primary">
            <span className="font-semibold">{title}</span>
            <span className="text-sm text-muted">{hint}</span>
            <span className="text-sm">{count(plan, role)} actuellement</span>
            <span className="btn btn-primary mt-2 self-start">{busy ? `Envoi en cours (${pending})…` : "Choisir des fichiers"}</span>
            <input type="file" multiple accept={accept} className="hidden" onChange={(e) => { send(role, e.target.files); e.target.value = ""; }} />
          </label>
        ))}
      </div>

      {lines.length > 0 ? (
        <ul className="card mt-6 divide-y divide-outline text-sm">
          {lines.map((l) => (
            <li key={l.id} className="flex justify-between gap-4 px-4 py-2">
              <span className="truncate">{l.name} <span className="text-muted">— {ROLE_NAMES[l.role]}</span></span>
              <span className={l.state === "erreur" ? "text-secondary" : l.state === "ok" ? "text-primary" : "text-muted"}>
                {l.state === "ok" ? "✓ ajouté" : l.state === "erreur" ? `✗ ${l.message}` : l.state === "envoi" ? `envoi…${l.message ? ` ${l.message}` : ""}` : "en attente"}
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
