"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * Bouton vert des relances : ouvre WhatsApp tout de suite (lien wa.me déjà prêt dans la page, aucun aller-retour
 * vers le serveur avant l'ouverture) et note l'envoi en arrière-plan. La carte se replie aussitôt.
 */
export function WhatsappSendButton({ waUrl, recordUrl, children }: { waUrl: string; recordUrl: string; children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");
  const [, startTransition] = useTransition();

  function record() {
    setState("sent");
    fetch(recordUrl, { method: "POST", keepalive: true, cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        // Mise à jour discrète des compteurs, sans bloquer l'écran.
        setTimeout(() => startTransition(() => router.refresh()), 4000);
      })
      .catch(() => setState("error"));
  }

  if (state === "sent") {
    return (
      <p className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700">
        ✓ Envoyé · <a href={waUrl} target="_blank" rel="noopener noreferrer" className="underline">rouvrir WhatsApp</a>
      </p>
    );
  }
  return (
    <>
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={record}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-3 py-2.5 font-semibold text-white transition active:scale-[0.98] hover:bg-[#1ebe5a]"
      >
        <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 fill-current">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.3-.5 0-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l2 .9c.3.2.5.2.5.4.1.1.1.7-.1 1.3Z" />
        </svg>
        {children}
      </a>
      {state === "error" ? (
        <p className="mt-1 text-center text-xs font-semibold text-red-600">L&apos;envoi n&apos;a pas été noté : touchez à nouveau le bouton.</p>
      ) : null}
    </>
  );
}
