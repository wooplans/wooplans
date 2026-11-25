"use client";

import { useActionState } from "react";
import type { ProformaSendState } from "@/app/admin/(panel)/chantier/actions";

/** Bouton « Proforma en un clic » d'une carte de relance : envoi sur WhatsApp, ou lien vers le PDF si l'envoi échoue. */
export function ProformaOneClick({ action, pdfUrl, primary }: { action: () => Promise<ProformaSendState>; pdfUrl: string; primary: boolean }) {
  const [state, run, pending] = useActionState(action, null);
  return (
    <div className="mt-2">
      {state?.ok ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{state.message}</p>
      ) : (
        <form action={run} className="flex gap-2">
          <button
            disabled={pending}
            className={`flex-1 rounded-xl px-3 py-2.5 text-[15px] font-semibold disabled:opacity-60 ${primary ? "bg-primary text-white" : "border-2 border-primary text-primary"}`}
          >
            {pending ? "Envoi…" : "📄 Envoyer la proforma"}
          </button>
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="flex items-center rounded-xl border border-outline px-3 text-sm font-semibold text-primary">
            PDF
          </a>
        </form>
      )}
      {state && !state.ok ? <p className="mt-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{state.message}</p> : null}
    </div>
  );
}
