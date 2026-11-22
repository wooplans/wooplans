"use client";

import { useState } from "react";

/**
 * Repli quand la page ne reconnaît pas l'acheteur (autre téléphone, lien transféré) : il saisit l'email de son achat
 * de l'extrait ou du guide ; si son prix réservé est encore valable, la page se recharge avec ce prix.
 */
export function FindReservedPrice({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "none">("idle");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") || "");
    setState("sending");
    const response = await fetch("/api/offre-reservee", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as { reserved?: boolean } | null;
    if (data?.reserved) window.location.reload();
    else setState("none");
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`text-sm font-semibold underline underline-offset-2 ${className}`}>
        Vous avez acheté l&apos;extrait ou le guide ? Voir votre prix réservé
      </button>
    );
  }
  return (
    <form onSubmit={onSubmit} className={`flex max-w-md flex-wrap gap-2 ${className}`}>
      <label className="sr-only" htmlFor="reserved-email">
        Email de votre achat
      </label>
      <input
        id="reserved-email"
        name="email"
        type="email"
        required
        placeholder="Email utilisé pour votre achat"
        className="min-w-0 flex-1 rounded-lg border border-white/30 bg-white px-3 py-2 text-sm text-foreground"
      />
      <button type="submit" disabled={state === "sending"} className="rounded-lg bg-secondary px-4 py-2 text-sm font-bold text-white">
        {state === "sending" ? "…" : "Vérifier"}
      </button>
      {state === "none" ? (
        <p className="w-full text-sm opacity-90">Aucun prix réservé en cours pour cet email : le prix du catalogue est le prix public.</p>
      ) : null}
    </form>
  );
}
