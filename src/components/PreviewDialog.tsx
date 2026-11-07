"use client";

import { useEffect, useRef, useState } from "react";
import { phCapture } from "@/lib/posthog-browser";

/**
 * Fenêtre « Aperçu du plan et devis » : bouton d'ouverture + document en plein écran (contenu rendu par le serveur,
 * passé en children). Mesure : ouverture et durée de lecture (PostHog), pour savoir si l'aperçu aide à acheter.
 */
export function PreviewDialog({ planSlug, label, children }: { planSlug: string; label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const openedAt = useRef(0);

  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        data-cta="plan_devis_apercu"
        data-plan={planSlug}
        onClick={() => {
          openedAt.current = Date.now();
          phCapture("plan_devis_preview_open", { plan: planSlug, offer: "plan_devis" });
          setOpen(true);
        }}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border-2 border-primary/30 bg-white px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/5"
      >
        <span aria-hidden>👁</span> {label}
      </button>
      <dialog
        ref={dialog}
        onClose={() => {
          if (openedAt.current) phCapture("plan_devis_preview_close", { plan: planSlug, open_ms: Date.now() - openedAt.current });
          openedAt.current = 0;
          setOpen(false);
        }}
        onClick={(e) => e.target === dialog.current && setOpen(false)}
        className="m-auto h-[min(100dvh-16px,900px)] w-[min(100%-16px,560px)] max-w-none overflow-hidden rounded-2xl bg-[#e9edf0] p-0 backdrop:bg-black/70"
        aria-label="Aperçu du plan et devis"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-black/10 bg-white px-4 py-3">
            <p className="text-sm font-semibold">Aperçu du plan et devis</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-9 w-9 place-items-center rounded-full text-lg text-muted hover:bg-black/5"
              aria-label="Fermer l'aperçu"
            >
              ✕
            </button>
          </div>
          {open ? <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5">{children}</div> : null}
        </div>
      </dialog>
    </>
  );
}
