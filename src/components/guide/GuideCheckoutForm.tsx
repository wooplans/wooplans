"use client";

import { useState } from "react";
import { HEARD_FROM_OPTIONS } from "@/lib/guide-rules";
import { PHONE_COUNTRIES, type PhoneCountryCode } from "@/lib/phone";
import { pixelTrack } from "@/lib/pixel";

/** Formulaire d'achat du guide : nom, email, WhatsApp, « comment nous avez-vous connu ? », puis paiement Chariow. */
export function GuideCheckoutForm({ price, defaultCountry, enabled }: { price: string; defaultCountry: PhoneCountryCode; enabled: boolean }) {
  const [country, setCountry] = useState<PhoneCountryCode>(defaultCountry);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const example = PHONE_COUNTRIES.find(([c]) => c === country)?.[3] ?? "";
  const dial = PHONE_COUNTRIES.find(([c]) => c === country)?.[2] ?? "";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const res = await fetch("/api/guide/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone"),
        countryCode: country,
        heardFrom: form.get("heardFrom"),
      }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { url?: string; error?: string; metaEventId?: string | null } | null;
    if (!res?.ok || !data?.url) {
      setPending(false);
      setError(data?.error || "Le paiement n'a pas pu démarrer. Réessayez.");
      return;
    }
    pixelTrack("InitiateCheckout", { value: 1900, currency: "XAF", content_name: "Guide WooPlans des maisons" }, data.metaEventId);
    window.location.href = data.url;
  }

  const field = "mt-1 w-full rounded-xl border border-outline bg-white px-4 py-3 text-base outline-none focus:border-primary";
  return (
    <form onSubmit={submit} className="card space-y-4 p-6" id="commander">
      <div>
        <p className="text-sm text-muted">Guide WooPlans des maisons · PDF</p>
        <p className="mt-1 text-3xl font-bold text-primary">{price}</p>
        <p className="text-sm text-muted">Paiement unique · Mobile Money ou carte</p>
      </div>
      <label className="block text-sm font-medium">
        Nom complet
        <input name="name" required minLength={2} autoComplete="name" className={field} />
      </label>
      <label className="block text-sm font-medium">
        Email (le guide vous y est envoyé)
        <input name="email" type="email" required autoComplete="email" className={field} />
      </label>
      <div className="block text-sm font-medium">
        Numéro WhatsApp
        <div className="mt-1 flex gap-2">
          <select
            aria-label="Pays"
            value={country}
            onChange={(e) => setCountry(e.target.value as PhoneCountryCode)}
            className="w-36 rounded-xl border border-outline bg-white px-2 py-3 text-base"
          >
            {PHONE_COUNTRIES.map(([code, name, prefix]) => (
              <option key={code} value={code}>
                {name} ({prefix})
              </option>
            ))}
          </select>
          <input name="phone" type="tel" required inputMode="tel" autoComplete="tel-national" placeholder={example} aria-label={`Numéro WhatsApp (${dial})`} className={`${field} mt-0`} />
        </div>
      </div>
      <label className="block text-sm font-medium">
        Comment avez-vous connu WooPlans ?
        <select name="heardFrom" required defaultValue="" className={field}>
          <option value="" disabled>
            Choisissez une réponse
          </option>
          {HEARD_FROM_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="rounded-xl bg-secondary/10 px-4 py-3 text-sm text-secondary">{error}</p>}
      <button type="submit" disabled={pending || !enabled} data-cta="guide_payer" className="btn btn-cta w-full py-4 text-base disabled:opacity-60">
        {!enabled ? "Bientôt disponible" : pending ? "Ouverture du paiement…" : `Recevoir mon guide · ${price}`}
      </button>
      <p className="text-center text-xs text-muted">Le guide arrive par email juste après le paiement, et s&apos;ouvre aussi sur la page suivante.</p>
    </form>
  );
}
