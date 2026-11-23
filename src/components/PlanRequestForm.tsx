"use client";

import { useState } from "react";
import { track } from "@/components/Tracker";
import { FUNNEL_EVENTS, pageType } from "@/lib/behavior";
import { PLAN_REQUEST_QUESTIONS } from "@/lib/plan-request-rules";
import { phCapture } from "@/lib/posthog-browser";

/**
 * Formulaire de qualification des plans complets (23 nov. 2026) : questions à choix, coordonnées, confirmation,
 * puis le bouton final envoie le client sur WhatsApp avec un message pré-rempli (renvoyé par /api/demande-plans).
 */
export function PlanRequestForm({ defaultPlan = "", priceNote }: { defaultPlan?: string; priceNote: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [ref, setRef] = useState<string | null>(null);

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
    const body = (await response?.json().catch(() => null)) as { error?: string; whatsappUrl?: string; ref?: string } | null;
    if (!response?.ok || !body?.whatsappUrl) {
      setError(body?.error || "L'envoi a échoué. Réessayez ou écrivez-nous sur WhatsApp.");
      setState("idle");
      return;
    }
    track({ type: "cta_click", ctaId: "lead_form_submitted" });
    // Aucune saisie transmise : seulement l'étape franchie et le modèle demandé.
    phCapture(FUNNEL_EVENTS.planRequest, { page_type: pageType(window.location.pathname), plan: defaultPlan || null });
    setWhatsappUrl(body.whatsappUrl);
    setRef(body.ref ?? null);
    setState("sent");
    window.location.href = body.whatsappUrl;
  }

  if (state === "sent" && whatsappUrl) {
    return (
      <div className="card p-6 text-center">
        <p className="text-lg font-semibold text-primary">Demande enregistrée ✓</p>
        {ref ? <p className="mt-1 text-sm text-muted">Votre référence : {ref}</p> : null}
        <p className="mt-2 text-foreground/70">Dernière étape : envoyez le message préparé à notre architecte sur WhatsApp.</p>
        <a href={whatsappUrl} data-cta="plan_request_whatsapp" className="btn-cta mt-5 w-full py-3.5">
          Discuter avec un architecte sur WhatsApp
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card grid gap-5 p-6">
      {PLAN_REQUEST_QUESTIONS.map((q) => (
        <fieldset key={q.key}>
          <legend className="label">{q.label}</legend>
          <div className="mt-1 grid gap-2 sm:grid-cols-2">
            {q.options.map(([value, text]) => (
              <label key={value} className="flex cursor-pointer items-center gap-2 rounded-xl border border-foreground/15 px-3 py-2.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <input type="radio" name={q.key} value={value} required />
                {text}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="pr-name">Nom complet</label>
          <input id="pr-name" name="name" required autoComplete="name" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="pr-phone">Numéro WhatsApp</label>
          <input id="pr-phone" name="phone" required type="tel" autoComplete="tel" placeholder="+237 6..." className="input" />
        </div>
        <div>
          <label className="label" htmlFor="pr-city">Ville du terrain</label>
          <input id="pr-city" name="city" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="pr-plan">Modèle choisi (facultatif, ex. V3-037)</label>
          <input id="pr-plan" name="plan" defaultValue={defaultPlan} className="input" />
        </div>
      </div>

      <label className="flex cursor-pointer gap-3 rounded-xl bg-highlight/15 p-4 text-sm">
        <input type="checkbox" name="confirm" required className="mt-0.5" />
        <span>
          Je confirme ces informations. Je connais le prix des plans complets ({priceNote}) et je souhaite échanger avec un architecte
          WOOPLANS sur WhatsApp.
        </span>
      </label>

      {error ? <p className="text-sm text-secondary">{error}</p> : null}
      <button type="submit" disabled={state === "sending"} className="btn-cta py-3.5">
        {state === "sending" ? "Envoi…" : "Valider et discuter avec un architecte sur WhatsApp"}
      </button>
    </form>
  );
}
