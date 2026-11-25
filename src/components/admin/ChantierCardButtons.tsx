"use client";

import { useState } from "react";

/**
 * Boutons d'une carte de l'onglet « Plans complets » (pensés pour le pouce) : WhatsApp avec le message proposé par
 * l'IA, WhatsApp sans message (audio, réponse libre) et la proforma en PDF à télécharger puis envoyer. Un clic sur
 * WhatsApp est noté en arrière-plan : la carte passe en grisé jusqu'à ce que le message parte.
 */
export function ChantierCardButtons({ id, withText, withoutText, proformaUrl }: { id: string; withText: string | null; withoutText: string; proformaUrl: string | null }) {
  const [clicked, setClicked] = useState(false);
  const record = () => {
    setClicked(true);
    fetch(`/admin/chantier/clic?id=${encodeURIComponent(id)}`, { method: "POST", keepalive: true, cache: "no-store" }).catch(() => undefined);
  };
  const second = "flex min-h-12 items-center justify-center gap-1.5 rounded-xl border-2 px-3 text-[15px] font-semibold active:scale-[0.98]";
  return (
    <div className="mt-4 space-y-2">
      <a
        href={withText ?? withoutText}
        target="_blank"
        rel="noopener noreferrer"
        onClick={record}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 text-[16px] font-bold text-white active:scale-[0.98]"
      >
        <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 fill-current">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.3-.5 0-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l2 .9c.3.2.5.2.5.4.1.1.1.7-.1 1.3Z" />
        </svg>
        {clicked ? "Rouvrir WhatsApp" : withText ? "Envoyer le message proposé" : "Répondre sur WhatsApp"}
      </a>
      <div className={`grid gap-2 ${proformaUrl && withText ? "grid-cols-2" : "grid-cols-1"}`}>
        {withText ? (
          <a href={withoutText} target="_blank" rel="noopener noreferrer" onClick={record} className={`${second} border-[#25D366] text-[#128C4B]`}>
            🎤 Audio / libre
          </a>
        ) : null}
        {proformaUrl ? (
          <a href={proformaUrl} target="_blank" rel="noopener noreferrer" className={`${second} border-primary text-primary`}>
            📄 Proforma PDF
          </a>
        ) : null}
      </div>
    </div>
  );
}
