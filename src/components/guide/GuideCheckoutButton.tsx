"use client";

import { useEffect, useRef, useState } from "react";
import { useVisitorCountry } from "@/components/LocalPrice";
import { pixelTrack } from "@/lib/pixel";
import { phCapture } from "@/lib/posthog-browser";
import { PHONE_COUNTRIES, phoneCountryOrDefault, type PhoneCountryCode as CountryCode } from "@/lib/phone";

/** Retire l'indicatif s'il a été saisi (+225…, 00225…) : le serveur attend le numéro national. */
function nationalNumber(raw: string, dial: string) {
  const digits = raw.replace(/\D/g, "");
  const prefix = dial.replace("+", "");
  if (raw.trim().startsWith("+") && digits.startsWith(prefix)) return digits.slice(prefix.length);
  if (digits.startsWith(`00${prefix}`)) return digits.slice(prefix.length + 2);
  return digits;
}

/**
 * Achat du Guide des maisons : même formulaire que le plan et devis des fiches (nom, email, WhatsApp), titre et prix du
 * guide. Aucun compte à rebours : le prix du guide est fixe.
 */
const OFFER_TEXT = {
  guide: { eyebrow: "Guide WooPlans des maisons", title: "100 villas et duplex", contentName: "Guide WooPlans des maisons", contentId: "guide-maisons" },
  extrait: { eyebrow: "Extrait du Catalogue Premium", title: "5 maisons avec plan et devis", contentName: "Extrait du Catalogue Premium", contentId: "extrait-catalogue" },
} as const;

export function GuideCheckoutButton({
  label,
  ctaId,
  className,
  price,
  enabled,
  offer = "guide",
}: {
  label: React.ReactNode;
  ctaId: string;
  className: string;
  price: number;
  enabled: boolean;
  offer?: "guide" | "extrait";
}) {
  const text = OFFER_TEXT[offer];
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState<CountryCode>("CI");
  const countryChosen = useRef(false);
  const visitorCountry = useVisitorCountry();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [, , dial, example] = PHONE_COUNTRIES.find(([c]) => c === country) ?? PHONE_COUNTRIES[0];

  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);

  useEffect(() => {
    if (visitorCountry && !countryChosen.current) setCountry(phoneCountryOrDefault(visitorCountry));
  }, [visitorCountry]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    setError(null);
    setSending(true);
    const response = await fetch("/api/guide/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: (form.name || "").trim(), email: form.email, phone: nationalNumber(form.phone || "", dial), countryCode: country, offer }),
      signal: AbortSignal.timeout(25000),
    }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as { url?: string; error?: string; metaEventId?: string | null } | null;
    if (!response?.ok || !body?.url) {
      setError(body?.error || "Le paiement n'a pas pu démarrer. Réessayez dans un instant.");
      setSending(false);
      return;
    }
    phCapture("checkout_open", { cta_id: ctaId, mode: "redirect", offer, provider: "chariow" });
    pixelTrack("InitiateCheckout", { content_name: text.contentName, content_ids: [text.contentId], content_type: "product", value: price, currency: "XAF" }, body.metaEventId);
    const url = body.url;
    setTimeout(() => {
      window.location.href = url;
    }, 300);
  }

  return (
    <>
      <button
        type="button"
        data-cta={ctaId}
        className={className}
        disabled={!enabled}
        onClick={() => {
          phCapture("guide_form_open", { cta_id: ctaId, offer });
          setOpen(true);
        }}
      >
        {enabled ? label : "Bientôt disponible"}
      </button>
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === dialog.current && setOpen(false)}
        className="m-auto w-[min(100%-24px,440px)] rounded-2xl p-0 backdrop:bg-black/60"
        aria-labelledby={`guide-title-${ctaId}`}
      >
        <form onSubmit={onSubmit} className="grid gap-4 p-5 text-left sm:p-6">
          <div className="relative -mx-5 -mt-5 border-b border-outline bg-primary/5 px-5 pb-4 pt-5 text-center sm:-mx-6 sm:-mt-6 sm:px-6">
            <p className="eyebrow px-8">{text.eyebrow}</p>
            <h2 id={`guide-title-${ctaId}`} className="mt-1 text-lg font-bold">{text.title}</h2>
            <p className="mt-1 text-4xl font-bold tracking-tight">
              {price.toLocaleString("fr-FR").replace(/ | /g, " ")} <span className="text-base font-medium">FCFA</span>
            </p>
            <p className="mt-1 text-sm font-semibold">Téléchargement instantané</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-lg text-muted hover:bg-black/5"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>

          <div>
            <label className="label" htmlFor={`g-name-${ctaId}`}>Nom complet</label>
            <input id={`g-name-${ctaId}`} name="name" required minLength={2} autoComplete="name" placeholder="Kouame Diallo" className="input" />
          </div>
          <div>
            <label className="label" htmlFor={`g-email-${ctaId}`}>Email</label>
            <input id={`g-email-${ctaId}`} name="email" required type="email" inputMode="email" autoComplete="email" placeholder="vous@exemple.com" className="input" />
            <p className="mt-1 text-xs text-muted">Même si votre email n&apos;est pas actif, vous recevez aussi sur WhatsApp.</p>
          </div>
          <div>
            <label className="label" htmlFor={`g-phone-${ctaId}`}>WhatsApp</label>
            <div className="flex gap-2">
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
              <input id={`g-phone-${ctaId}`} name="phone" required type="tel" inputMode="tel" autoComplete="tel-national" placeholder={example} className="input min-w-0" />
            </div>
          </div>
          {error ? <p className="rounded-xl bg-secondary/10 px-4 py-3 text-sm text-secondary">{error}</p> : null}
          <button type="submit" disabled={sending} className="btn-cta mt-1 w-full py-3.5 text-base">
            {sending ? "Ouverture du paiement…" : "Procéder au paiement →"}
          </button>
          <p className="-mt-1 text-center text-xs text-muted">🔒 Vous serez redirigé vers la page de paiement sécurisée (Mobile Money ou carte bancaire)</p>
        </form>
      </dialog>
    </>
  );
}
