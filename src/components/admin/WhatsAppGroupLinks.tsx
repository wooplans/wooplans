"use client";

import { useState } from "react";

type Link = { code: string; name: string; url: string };

/** Liens des fiches modèles prêts à partager dans les groupes WhatsApp (UTM inclus), un toucher pour copier ou partager. */
export function WhatsAppGroupLinks({ links }: { links: Link[] }) {
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const q = query.trim().toLowerCase();
  const shown = q ? links.filter((l) => `${l.code} ${l.name}`.toLowerCase().includes(q)) : links;

  return (
    <div className="card grid gap-3 p-5">
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un modèle (ex. V3-037)" className="input" />
      <ul className="divide-y divide-outline">
        {shown.map((l) => (
          <li key={l.code} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
            <span className="min-w-0 text-sm font-medium">{l.name}</span>
            <span className="flex gap-2">
              <button
                type="button"
                className="btn border border-outline px-3 py-1.5 text-sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(l.url).catch(() => undefined);
                  setCopied(l.code);
                  setTimeout(() => setCopied((c) => (c === l.code ? null : c)), 2000);
                }}
              >
                {copied === l.code ? "Copié ✓" : "Copier"}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(l.url)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary px-3 py-1.5 text-sm"
              >
                Partager sur WhatsApp
              </a>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
