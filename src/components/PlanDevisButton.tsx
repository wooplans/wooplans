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
  /** Prix affiché dans le formulaire, déjà formaté (« 10 000 FCFA »). */
  price: string;
  ctaId: string;
  className: string;
  /** Paiement en ligne indisponible (produit Chariow non configuré) : le bouton ouvre WhatsApp. */
  fallbackHref?: string;
};

/**
 * Achat du plan et devis d'un modèle : formulaire court (nom, email, numéro) puis paiement Chariow ou Wajub.
 * Le modèle est enregistré avec l'achat, ce qui permet de livrer le bon document.
 */
export function PlanDevisButton({ plan, label, price, ctaId, className, fallbackHref }: Props) {
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
        <form onSubmit={onSubmit} className="grid gap-4 p-5 text-left sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Modèle {plan.code}</p>
              <h2 id={`pd-title-${plan.slug}`} className="mt-1 text-xl font-bold leading-tight">Recevez le plan et devis</h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="-mr-2 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg text-muted hover:bg-black/5"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl bg-primary/5 px-4 py-3">
            <p className="text-sm leading-snug text-foreground/80">Plan coté et devis détaillé, envoyés par email.</p>
            <p className="whitespace-nowrap text-lg font-bold text-primary">{price}</p>
          </div>

          <div>
            <label className="label" htmlFor={`pd-name-${plan.slug}`}>Nom complet</label>
            <input id={`pd-name-${plan.slug}`} name="name" required minLength={2} autoComplete="name" placeholder="Jean Dupont" className="input" />
          </div>
          <div>
            <label className="label" htmlFor={`pd-email-${plan.slug}`}>Email</label>
            <input
              id={`pd-email-${plan.slug}`}
              name="email"
              required
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="vous@exemple.com"
              className="input"
            />
            <p className="mt-1 text-xs text-muted">Le document vous y est envoyé.</p>
          </div>
          <div>
            <label className="label" htmlFor={`pd-phone-${plan.slug}`}>Numéro Mobile Money / WhatsApp</label>
            <div className="flex gap-2">
              {/* Indicatif seul à l'écran, la liste complète des pays s'ouvre au toucher. */}
              <div className="input relative flex w-auto shrink-0 items-center gap-1 pr-3 font-medium focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                <span>{dial}</span>
                <span aria-hidden className="text-xs text-muted">▾</span>
                <select
                  name="countryCode"
                  value={country}
                  onChange={(e) => {
                    countryChosen.current = true;
                    setCountry(e.target.value as CountryCode);
                  }}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Pays"
                >
                  {PHONE_COUNTRIES.map(([code, name, prefix]) => (
                    <option key={code} value={code}>
                      {name} {prefix}
                    </option>
                  ))}
                </select>
              </div>
              <input
                id={`pd-phone-${plan.slug}`}
                name="phone"
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder={example}
                className="input min-w-0"
              />
            </div>
          </div>
          {error ? <p className="rounded-xl bg-secondary/10 px-4 py-3 text-sm text-secondary">{error}</p> : null}
          <button type="submit" disabled={sending} className="btn-cta mt-1 w-full py-3.5 text-base">
            {sending ? "Ouverture du paiement…" : `Payer ${price}`}
          </button>
          <p className="-mt-1 text-center text-xs text-muted">🔒 Paiement sécurisé par Mobile Money ou carte bancaire</p>
        </form>
      </dialog>
    </>
  );
}
