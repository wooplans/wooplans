"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { startCheckoutWithFunnelTracking, trackFunnelEvent } from "@/lib/funnel-client";

type CheckoutLeadFormProps = {
  ctaId: string;
  buttonLabel: string;
  helperText?: string;
  className?: string;
};

const COUNTRY_OPTIONS = [
  { code: "CM", label: "Cameroun" },
  { code: "CI", label: "Côte d'Ivoire" },
  { code: "SN", label: "Sénégal" },
  { code: "FR", label: "France" },
  { code: "GA", label: "Gabon" },
  { code: "CD", label: "RDC" },
];

export function CheckoutLeadForm({
  ctaId,
  buttonLabel,
  helperText = "Renseignez vos coordonnées pour recevoir le lien de paiement sécurisé.",
  className = "",
}: CheckoutLeadFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("CM");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(
    () =>
      firstName.trim().length > 1 &&
      lastName.trim().length > 1 &&
      email.trim().includes("@") &&
      phoneNumber.trim().length >= 6 &&
      countryCode.trim().length === 2,
    [countryCode, email, firstName, lastName, phoneNumber],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    setError("");

    try {
      await trackFunnelEvent("premium_cta_click", {
        ctaId,
        metadata: { source: "checkout_form" },
      });

      const checkoutUrl = await startCheckoutWithFunnelTracking({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phoneNumber: phoneNumber.trim(),
        countryCode: countryCode.trim().toUpperCase(),
        ctaId,
      });

      window.location.assign(checkoutUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-bold text-foreground/70">Prénom</label>
          <input
            type="text"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full border-2 border-outline bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
            placeholder="Jean"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold text-foreground/70">Nom</label>
          <input
            type="text"
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full border-2 border-outline bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
            placeholder="Kouassi"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-bold text-foreground/70">Email</label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border-2 border-outline bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
            placeholder="vous@email.com"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold text-foreground/70">Téléphone</label>
          <input
            type="tel"
            autoComplete="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full border-2 border-outline bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
            placeholder="6XXXXXXXX"
            required
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-bold text-foreground/70">Pays</label>
        <select
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
          className="w-full border-2 border-outline bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
        >
          {COUNTRY_OPTIONS.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="border-2 border-red-700 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-500 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit || loading}
        className="inline-flex w-full items-center justify-center rounded-full border-2 border-accent bg-accent px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Création du checkout..." : buttonLabel}
      </button>

      <p className="text-xs font-medium text-foreground/45">{helperText}</p>
    </form>
  );
}
