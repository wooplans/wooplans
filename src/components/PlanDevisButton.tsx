"use client";

import { useEffect, useRef, useState } from "react";
import { FUNNEL_EVENTS } from "@/lib/behavior";
import { phCapture } from "@/lib/posthog-browser";
import { PHONE_COUNTRIES, phoneCountryOrDefault, type PhoneCountryCode as CountryCode } from "@/lib/phone";

/** Retire l'indicatif s'il a été saisi (+237…, 00237…) : le serveur attend le numéro national. */
function nationalNumber(raw: string, dial: string) {
  const digits = raw.replace(/\D/g, "");
  const prefix = dial.replace("+", "");
  if (raw.trim().startsWith("+") && digits.startsWith(prefix)) return digits.slice(prefix.length);
  if (digits.startsWith(`00${prefix}`)) return digits.slice(prefix.length + 2);
  return digits;
}

type Props = {
  plan: { slug: string; code: string };
  label: string;
  ctaId: string;
  className: string;
  /** Paiement en ligne indisponible (produit Chariow non configuré) : le bouton ouvre WhatsApp. */
  fallbackHref?: string;
};

/**
 * Achat du plan et devis d'un modèle : formulaire court (nom, email, numéro) puis paiement Chariow ou Wajub.
 * Le modèle est enregistré avec l'achat, ce qui permet de livrer le bon document.
 */
export function PlanDevisButton({ plan, label, ctaId, className, fallbackHref }: Props) {
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState<CountryCode>("CM");
  const countryChosen = useRef(false);
  const [, , dial, example] = PHONE_COUNTRIES.find(([c]) => c === country) ?? PHONE_COUNTRIES[0];
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);

  // Pays du visiteur, lu à l'ouverture (la page est en cache, partagée entre pays) : présélectionné
  // tant que le visiteur n'a pas choisi lui-même.
  useEffect(() => {
    if (!open || fallbackHref) return;
    let cancelled = false;
    fetch("/api/pays", { cache: "no-store" })
      .then((r) => r.json() as Promise<{ country?: string | null }>)
      .then((d) => {
        if (!cancelled && !countryChosen.current) setCountry(phoneCountryOrDefault(d.country));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, fallbackHref]);

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
    const form = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const data = { ...form, phone: nationalNumber(form.phone || "", dial) };
    // Essai Wajub : ?paiement=wajub sur la fiche (sinon le cookie posé par la page de vente, ou le réglage du site).
    const provider = new URLSearchParams(window.location.search).get("paiement") || undefined;
    const response = await fetch("/api/plan-devis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, slug: plan.slug, provider }),
    }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as { url?: string; mode?: string; error?: string } | null;
    if (!response?.ok || !body?.url) {
      setError(body?.error || "Le paiement n'a pas pu démarrer. Réessayez ou écrivez-nous sur WhatsApp.");
      setSending(false);
      return;
    }
    // Aucune saisie transmise : seulement l'étape franchie et le modèle.
    phCapture(FUNNEL_EVENTS.checkoutOpen, { cta_id: ctaId, mode: "redirect", plan: plan.slug, offer: "plan_devis", provider: body.mode === "wajub" ? "wajub" : "chariow" });
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
              <select
                name="countryCode"
                value={country}
                onChange={(e) => {
                  countryChosen.current = true;
                  setCountry(e.target.value as CountryCode);
                }}
                className="input"
                aria-label="Pays"
              >
                {PHONE_COUNTRIES.map(([code, name, prefix]) => (
                  <option key={code} value={code}>
                    {name} {prefix}
                  </option>
                ))}
              </select>
              <input
                id={`pd-phone-${plan.slug}`}
                name="phone"
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder={example}
                className="input"
              />
            </div>
            <p className="mt-1 text-xs text-muted">
              Sans l&apos;indicatif {dial}, par exemple {example} ({example.replace(/\D/g, "").length} chiffres).
            </p>
          </div>
          <div>
            <label className="label" htmlFor={`pd-promo-${plan.slug}`}>Code promo (facultatif)</label>
            <input id={`pd-promo-${plan.slug}`} name="discountCode" autoComplete="off" autoCapitalize="characters" className="input" />
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
