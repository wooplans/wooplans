"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { startCheckoutWithFunnelTracking, trackFunnelEvent } from "@/lib/funnel-client";

type CheckoutLeadFormProps = {
  ctaId: string;
  buttonLabel: string;
  helperText?: string;
  className?: string;
};

type CountryOption = {
  code: string;
  label: string;
  flag: string;
  dialCode: string;
  phonePattern: number[];
  example: string;
};

const COUNTRY_OPTIONS: CountryOption[] = [
  { code: "BJ", label: "Bénin", flag: "🇧🇯", dialCode: "+229", phonePattern: [2, 2, 2, 2], example: "61 23 45 67" },
  { code: "BF", label: "Burkina Faso", flag: "🇧🇫", dialCode: "+226", phonePattern: [2, 2, 2, 2], example: "70 12 34 56" },
  { code: "CM", label: "Cameroun", flag: "🇨🇲", dialCode: "+237", phonePattern: [2, 2, 2, 2, 2], example: "6 12 34 56 78" },
  { code: "CF", label: "Centrafrique", flag: "🇨🇫", dialCode: "+236", phonePattern: [2, 2, 2, 2], example: "70 12 34 56" },
  { code: "CI", label: "Côte d'Ivoire", flag: "🇨🇮", dialCode: "+225", phonePattern: [2, 2, 2, 2, 2], example: "01 23 45 67 89" },
  { code: "CD", label: "RDC", flag: "🇨🇩", dialCode: "+243", phonePattern: [3, 2, 2, 2], example: "812 34 56 78" },
  { code: "CG", label: "Congo", flag: "🇨🇬", dialCode: "+242", phonePattern: [3, 2, 2, 2], example: "06 12 34 56" },
  { code: "GA", label: "Gabon", flag: "🇬🇦", dialCode: "+241", phonePattern: [2, 2, 2, 2], example: "06 12 34 56" },
  { code: "GM", label: "Gambie", flag: "🇬🇲", dialCode: "+220", phonePattern: [3, 2, 2], example: "301 23 45" },
  { code: "GH", label: "Ghana", flag: "🇬🇭", dialCode: "+233", phonePattern: [3, 3, 4], example: "024 123 4567" },
  { code: "GN", label: "Guinée", flag: "🇬🇳", dialCode: "+224", phonePattern: [3, 2, 2, 2], example: "621 23 45 67" },
  { code: "GW", label: "Guinée-Bissau", flag: "🇬🇼", dialCode: "+245", phonePattern: [3, 2, 2], example: "955 12 34" },
  { code: "LR", label: "Libéria", flag: "🇱🇷", dialCode: "+231", phonePattern: [2, 2, 2, 2], example: "77 12 34 56" },
  { code: "ML", label: "Mali", flag: "🇲🇱", dialCode: "+223", phonePattern: [2, 2, 2, 2], example: "70 12 34 56" },
  { code: "MR", label: "Mauritanie", flag: "🇲🇷", dialCode: "+222", phonePattern: [2, 2, 2, 2], example: "22 12 34 56" },
  { code: "NE", label: "Niger", flag: "🇳🇪", dialCode: "+227", phonePattern: [2, 2, 2, 2], example: "90 12 34 56" },
  { code: "NG", label: "Nigeria", flag: "🇳🇬", dialCode: "+234", phonePattern: [4, 3, 4], example: "0801 234 5678" },
  { code: "SN", label: "Sénégal", flag: "🇸🇳", dialCode: "+221", phonePattern: [2, 2, 2, 2], example: "77 123 45 67" },
  { code: "SL", label: "Sierra Leone", flag: "🇸🇱", dialCode: "+232", phonePattern: [2, 2, 2, 2], example: "76 12 34 56" },
  { code: "ST", label: "São Tomé-et-Príncipe", flag: "🇸🇹", dialCode: "+239", phonePattern: [2, 2, 3], example: "90 12 345" },
  { code: "TD", label: "Tchad", flag: "🇹🇩", dialCode: "+235", phonePattern: [2, 2, 2, 2], example: "63 12 34 56" },
  { code: "TG", label: "Togo", flag: "🇹🇬", dialCode: "+228", phonePattern: [2, 2, 2, 2], example: "90 12 34 56" },
];

const COUNTRY_INDEX = new Map(COUNTRY_OPTIONS.map((country) => [country.code, country]));

function guessCountryFromLocale(locale: string | undefined) {
  if (!locale) return "CM";
  const region = locale.split("-")[1]?.toUpperCase();
  return region && COUNTRY_INDEX.has(region) ? region : "CM";
}

function formatDigitsByPattern(digits: string, pattern: number[]) {
  const groups: string[] = [];
  let index = 0;

  for (const size of pattern) {
    if (index >= digits.length) break;
    groups.push(digits.slice(index, index + size));
    index += size;
  }

  if (index < digits.length) {
    groups.push(digits.slice(index));
  }

  return groups.filter(Boolean).join(" ");
}

function formatPhoneDisplay(value: string, countryCode: string) {
  const country = COUNTRY_INDEX.get(countryCode) ?? COUNTRY_INDEX.get("CM")!;
  const digits = value.replace(/\D/g, "");
  return formatDigitsByPattern(digits, country.phonePattern);
}

function getPhoneExample(countryCode: string) {
  const country = COUNTRY_INDEX.get(countryCode) ?? COUNTRY_INDEX.get("CM")!;
  return country.example;
}

function normalizeLocalPhoneInput(value: string, countryCode: string) {
  const country = COUNTRY_INDEX.get(countryCode) ?? COUNTRY_INDEX.get("CM")!;
  let digits = value.replace(/\D/g, "");
  const dialDigits = country.dialCode.replace(/\D/g, "");

  if (digits.startsWith(dialDigits) && digits.length > dialDigits.length) {
    digits = digits.slice(dialDigits.length);
  }

  return digits;
}

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
  const manualCountrySelection = useRef(false);

  const resolvedCountry = COUNTRY_INDEX.get(countryCode) ?? COUNTRY_INDEX.get("CM")!;
  const phonePreview = getPhoneExample(countryCode);
  const phoneLabel = `Téléphone WhatsApp (${resolvedCountry.label})`;

  const canSubmit = useMemo(
    () =>
      firstName.trim().length > 1 &&
      lastName.trim().length > 1 &&
      email.trim().includes("@") &&
      phoneNumber.replace(/\D/g, "").length >= 6 &&
      countryCode.trim().length === 2,
    [countryCode, email, firstName, lastName, phoneNumber],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);

    async function detectCountry() {
      try {
        const response = await fetch("https://ipapi.co/json/", {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!response.ok) return;

        const data = (await response.json()) as {
          country_code?: string;
          country_name?: string;
        };

        const detectedCode = data.country_code?.toUpperCase();
        if (detectedCode && COUNTRY_INDEX.has(detectedCode) && !manualCountrySelection.current) {
          setCountryCode(detectedCode);
          return;
        }
      } catch {
        // Ignore geo lookup failures and fall back to the default country.
      } finally {
        window.clearTimeout(timeout);
      }

      if (!manualCountrySelection.current) {
        const localeCountry = guessCountryFromLocale(navigator.language);
        if (localeCountry !== "CM") {
          setCountryCode(localeCountry);
        }
      }
    }

    void detectCountry();

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, []);

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
        phoneNumber: phoneNumber.replace(/\D/g, ""),
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
          <label className="mb-1 block text-sm font-bold text-slate-700">Prénom</label>
          <input
            type="text"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition-colors placeholder:text-slate-400 focus:border-primary"
            placeholder="Jean"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">Nom</label>
          <input
            type="text"
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition-colors placeholder:text-slate-400 focus:border-primary"
            placeholder="Kouassi"
            required
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-bold text-slate-700">Pays</label>
        <select
          value={countryCode}
          onChange={(e) => {
            manualCountrySelection.current = true;
            setCountryCode(e.target.value);
            setPhoneNumber("");
          }}
          className="w-full border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition-colors focus:border-primary"
        >
          {COUNTRY_OPTIONS.map((option) => (
            <option key={option.code} value={option.code}>
              {option.flag} {option.label} ({option.dialCode})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">Email</label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition-colors placeholder:text-slate-400 focus:border-primary"
            placeholder="vous@email.com"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">{phoneLabel}</label>
          <div className="flex border-2 border-slate-300 bg-white transition-colors focus-within:border-primary">
            <span className="inline-flex min-w-20 items-center justify-center border-r border-slate-300 bg-slate-100 px-3 text-sm font-bold text-slate-700">
              {resolvedCountry.flag} {resolvedCountry.dialCode}
            </span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={formatPhoneDisplay(phoneNumber, countryCode)}
              onChange={(e) => {
                const digits = normalizeLocalPhoneInput(e.target.value, countryCode);
                setPhoneNumber(digits);
              }}
              className="min-w-0 flex-1 bg-white px-3 py-2 text-sm text-slate-950 outline-none placeholder:text-slate-400"
              placeholder={phonePreview}
              required
            />
          </div>
        </div>
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
        <span>{loading ? "Création du checkout..." : buttonLabel}</span>
        <svg className="ml-2 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M5 12h12m0 0-5-5m5 5-5 5" />
        </svg>
      </button>

      <p className="text-xs font-medium text-slate-500">{helperText}</p>
    </form>
  );
}
