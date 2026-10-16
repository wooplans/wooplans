"use client";

import { useEffect, useState } from "react";

/**
 * Distribution cotée de l'espace Premium : agrandissement plein écran dans la page
 * (plutôt qu'un nouvel onglet où l'image s'enregistre d'un clic droit).
 * L'image est servie filigranée au nom du membre.
 */
export function FloorPlanViewer({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="card block w-full overflow-hidden text-left">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} loading="lazy" draggable={false} className="w-full bg-white object-contain" />
        <p className="border-t border-outline px-4 py-2 text-sm text-muted">Toucher pour agrandir</p>
      </button>
      {open ? (
        <div role="dialog" aria-label={alt} className="fixed inset-0 z-50 flex flex-col bg-black/90" onClick={() => setOpen(false)}>
          <div className="flex justify-end p-3">
            <button type="button" className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white">Fermer</button>
          </div>
          <div className="flex-1 overflow-auto p-2" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} draggable={false} className="mx-auto min-w-[900px] max-w-none bg-white md:min-w-0 md:max-w-full" />
          </div>
        </div>
      ) : null}
    </>
  );
}
