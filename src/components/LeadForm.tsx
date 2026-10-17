"use client";

import { useState } from "react";
import { track } from "@/components/Tracker";
import { FUNNEL_EVENTS, pageType } from "@/lib/behavior";
import { phCapture } from "@/lib/posthog-browser";

export function LeadForm({ defaultPlan = "" }: { defaultPlan?: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setState("sending");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/demande-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).catch(() => null);
    if (!response?.ok) {
      const body = (await response?.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error || "L'envoi a échoué. Réessayez ou écrivez-nous sur WhatsApp.");
      setState("idle");
      return;
    }
    track({ type: "cta_click", ctaId: "lead_form_submitted" });
    // Aucune saisie transmise : seulement l'étape franchie et le modèle demandé.
    phCapture(FUNNEL_EVENTS.planRequest, { page_type: pageType(window.location.pathname), plan: defaultPlan || null });
    setState("sent");
  }

  if (state === "sent") {
    return (
      <div className="card p-6 text-center">
        <p className="text-lg font-semibold text-primary">Demande envoyée ✓</p>
        <p className="mt-2 text-foreground/70">Un architecte WOOPLANS vous contacte sur WhatsApp sous 24 h ouvrées.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card grid gap-4 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="lf-name">Nom complet</label>
          <input id="lf-name" name="name" required autoComplete="name" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="lf-phone">Numéro WhatsApp</label>
          <input id="lf-phone" name="phone" required type="tel" autoComplete="tel" placeholder="+237 6..." className="input" />
        </div>
        <div>
          <label className="label" htmlFor="lf-email">Email (facultatif)</label>
          <input id="lf-email" name="email" type="email" autoComplete="email" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="lf-city">Ville du terrain</label>
          <input id="lf-city" name="city" className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="lf-plan">Modèle choisi (référence, ex. V3-037)</label>
        <input id="lf-plan" name="plan" defaultValue={defaultPlan} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="lf-details">Votre projet : terrain, modifications souhaitées, délai</label>
        <textarea id="lf-details" name="details" rows={4} className="input" />
      </div>
      {error ? <p className="text-sm text-secondary">{error}</p> : null}
      <button type="submit" disabled={state === "sending"} className="btn-primary py-3.5">
        {state === "sending" ? "Envoi…" : "Envoyer ma demande de plans complets"}
      </button>
    </form>
  );
}
