"use client";

import { useState } from "react";

/**
 * Boutons d'une carte de l'onglet « Plans complets » : WhatsApp avec le message proposé par l'IA, ou sans message
 * (audio, réponse libre). Le clic ouvre WhatsApp tout de suite et note le clic en arrière-plan : la carte passe en
 * grisé jusqu'à ce que le message parte.
 */
export function ChantierCardButtons({ id, withText, withoutText }: { id: string; withText: string | null; withoutText: string }) {
  const [clicked, setClicked] = useState(false);
  const record = () => {
    setClicked(true);
    fetch(`/admin/chantier/clic?id=${encodeURIComponent(id)}`, { method: "POST", keepalive: true, cache: "no-store" }).catch(() => undefined);
  };
  return (
    <div className={`mt-3 grid gap-2 ${withText ? "grid-cols-[1fr_auto]" : "grid-cols-1"}`}>
      {withText ? (
        <a
          href={withText}
          target="_blank"
          rel="noopener noreferrer"
          onClick={record}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 py-3 text-[15px] font-semibold text-white active:scale-[0.98]"
        >
          {clicked ? "✓ Rouvrir WhatsApp" : "Envoyer le message"}
        </a>
      ) : null}
      <a
        href={withoutText}
        target="_blank"
        rel="noopener noreferrer"
        onClick={record}
        className={`flex items-center justify-center rounded-xl border-2 border-[#25D366] px-3 py-3 text-[15px] font-semibold text-[#128C4B] active:scale-[0.98] ${withText ? "" : "bg-[#25D366]/10"}`}
      >
        {withText ? "🎤 Sans message" : clicked ? "✓ Rouvrir WhatsApp" : "🎤 Ouvrir WhatsApp (audio ou message libre)"}
      </a>
    </div>
  );
}
