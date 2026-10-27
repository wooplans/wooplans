"use client";

import { useEffect, useRef, useState } from "react";
import { FUNNEL_EVENTS } from "@/lib/behavior";
import { phCapture } from "@/lib/posthog-browser";

/** Pays proposés pour le numéro (Mobile Money) ; Chariow attend le code ISO du pays. */
const COUNTRIES = [
  ["CM", "Cameroun", "+237"],
  ["CI", "Côte d'Ivoire", "+225"],
  ["SN", "Sénégal", "+221"],
  ["GA", "Gabon", "+241"],
  ["CG", "Congo", "+242"],
  ["CD", "RD Congo", "+243"],
  ["BJ", "Bénin", "+229"],
  ["TG", "Togo", "+228"],
  ["BF", "Burkina Faso", "+226"],
  ["ML", "Mali", "+223"],
  ["GN", "Guinée", "+224"],
  ["NE", "Niger", "+227"],
  ["TD", "Tchad", "+235"],
  ["CF", "Centrafrique", "+236"],
  ["GQ", "Guinée équatoriale", "+240"],
  ["FR", "France", "+33"],
  ["BE", "Belgique", "+32"],
  ["CH", "Suisse", "+41"],
  ["CA", "Canada", "+1"],
  ["US", "États-Unis", "+1"],
] as const;

type Props = {
  plan: { slug: string; code: string };
  label: string;
  ctaId: string;
  className: string;
  /** Paiement en ligne indisponible (produit Chariow non configuré) : le bouton ouvre WhatsApp. */
  fallbackHref?: string;
};

/**
 * Achat du plan et devis d'un modèle : formulaire court (nom, email, numéro) puis paiement Chariow.
 * Le modèle est enregistré avec l'achat, ce qui permet de livrer le bon document.
 */
export function PlanDevisButton({ plan, label, ctaId, className, fallbackHref }: Props) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);

  if (fallbackHref) {
    return (
      <a href={fallbackHref} target="_blank" rel="noopener noreferrer" data-cta={ctaId} data-plan={plan.slug} className={className}>
        {label}
      </a>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSending(true);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/plan-devis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, slug: plan.slug }),
    }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as { url?: string; error?: string } | null;
    if (!response?.ok || !body?.url) {
      setError(body?.error || "Le paiement n'a pas pu démarrer. Réessayez ou écrivez-nous sur WhatsApp.");
      setSending(false);
      return;
    }
    // Aucune saisie transmise : seulement l'étape franchie et le modèle.
    phCapture(FUNNEL_EVENTS.checkoutOpen, { cta_id: ctaId, mode: "redirect", plan: plan.slug, offer: "plan_devis" });
    window.location.href = body.url;
  }

  return (
    <>
      <button type="button" data-cta={ctaId} data-plan={plan.slug} className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === dialog.current && setOpen(false)}
        className="m-auto w-[min(100%-24px,440px)] rounded-2xl p-0 backdrop:bg-black/60"
        aria-labelledby={`pd-title-${plan.slug}`}
      >
        <form onSubmit={onSubmit} className="grid gap-4 p-5 text-left">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={`pd-title-${plan.slug}`} className="text-lg font-bold">Plan et devis du modèle {plan.code}</h2>
              <p className="mt-1 text-sm text-muted">Vos coordonnées pour recevoir le document après le paiement.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-xl text-muted" aria-label="Fermer">✕</button>
          </div>
          <div>
            <label className="label" htmlFor={`pd-name-${plan.slug}`}>Nom complet</label>
            <input id={`pd-name-${plan.slug}`} name="name" required minLength={2} autoComplete="name" className="input" />
          </div>
          <div>
            <label className="label" htmlFor={`pd-email-${plan.slug}`}>Email (le document y est envoyé)</label>
            <input id={`pd-email-${plan.slug}`} name="email" required type="email" autoComplete="email" className="input" />
          </div>
          <div>
            <label className="label" htmlFor={`pd-phone-${plan.slug}`}>Numéro Mobile Money / WhatsApp</label>
            <div className="grid gap-2 sm:grid-cols-[auto_1fr]">
              <select name="countryCode" defaultValue="CM" className="input" aria-label="Pays">
                {COUNTRIES.map(([code, name, dial]) => (
                  <option key={code} value={code}>
                    {name} {dial}
                  </option>
                ))}
              </select>
              <input id={`pd-phone-${plan.slug}`} name="phone" required type="tel" inputMode="tel" autoComplete="tel-national" placeholder="6 xx xx xx xx" className="input" />
            </div>
          </div>
          {error ? <p className="text-sm text-secondary">{error}</p> : null}
          <button type="submit" disabled={sending} className="btn-cta w-full py-3.5 text-base">
            {sending ? "Ouverture du paiement…" : "Continuer vers le paiement"}
          </button>
          <p className="text-center text-xs text-muted">Paiement sécurisé par Mobile Money ou carte bancaire.</p>
        </form>
      </dialog>
    </>
  );
}
