"use client";

import { useState } from "react";

/** Envoi du message audio de la page /temoignage (bucket public MEDIA), enregistré dès la fin du téléversement. */
export function IntroAudioField({ initial, save }: { initial: string; save: (url: string) => Promise<void> }) {
  const [url, setUrl] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.set("visibility", "public");
    body.set("folder", "temoignages");
    body.append("files", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { files?: { url: string }[]; error?: string } | null;
    const next = data?.files?.[0]?.url;
    if (!res?.ok || !next) setError(data?.error || "Échec du téléversement");
    else {
      await save(next);
      setUrl(next);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      {url ? <audio src={url} controls preload="metadata" className="w-full" /> : <p className="text-sm text-muted">Aucun message pour le moment : la page s&apos;affiche sans.</p>}
      <div className="flex flex-wrap gap-2">
        <label className="btn-primary cursor-pointer py-2">
          {busy ? "Envoi…" : url ? "Remplacer l'audio" : "Envoyer mon audio"}
          <input type="file" accept="audio/*" className="hidden" disabled={busy} onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        {url ? (
          <button type="button" className="btn-ghost py-2" disabled={busy} onClick={async () => { await save(""); setUrl(""); }}>
            Retirer
          </button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-secondary">{error}</p> : null}
    </div>
  );
}
