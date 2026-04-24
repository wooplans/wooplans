"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const PREMIUM_TEST_STORAGE_KEY = "wooplans-premium-test-unlocked";
const PREMIUM_TEST_EVENT = "wooplans-premium-test-changed";
const WHATSAPP_PHONE = "237694327885";
const FULL_PLAN_PRICES = {
  villa: 150000,
  duplex: 250000,
};

type ConversionAnchorProps = {
  category: string;
  name: string;
  slug: string;
  initialPremium?: boolean;
};

function getModelCode(name: string, slug: string) {
  const source = `${name} ${slug}`.toUpperCase();
  const explicitCode = source.match(/\b[VD]X?[-\s]?\d{2,4}\b/)?.[0];

  if (explicitCode) {
    return explicitCode.replace(/\s+/g, "-");
  }

  const slugSuffix = slug.toUpperCase().match(/(?:^|[-_\s])([VD]\d{2,4})(?:$|[-_\s])?/);

  if (slugSuffix) {
    return slugSuffix[1];
  }

  return "";
}

function getFullPlanPrice(category: string) {
  return category === "duplex" ? FULL_PLAN_PRICES.duplex : FULL_PLAN_PRICES.villa;
}

function formatPrice(value: number) {
  return value.toLocaleString("fr-FR").replace(/\u202f/g, " ");
}

export function ConversionAnchor({
  category,
  name,
  slug,
  initialPremium = false,
}: ConversionAnchorProps) {
  const [isPremium, setIsPremium] = useState(initialPremium);
  const [origin, setOrigin] = useState("");
  const modelCode = getModelCode(name, slug);
  const modelLabel = modelCode ? `ce modele ${modelCode}` : "ce modele";
  const fullPlanPrice = getFullPlanPrice(category);
  const planUrl = origin ? `${origin}/plans/${slug}` : `/plans/${slug}`;
  const whatsappMessage = encodeURIComponent(
    [
      `Bonjour, je souhaite commander les plans complets de ${modelLabel} - ${name}.`,
      `Prix affiche : A partir de ${formatPrice(fullPlanPrice)} Fcfa.`,
      `Lien du modele : ${planUrl}`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  useEffect(() => {
    setOrigin(window.location.origin);

    const syncPremiumState = () => {
      const savedState = window.localStorage.getItem(PREMIUM_TEST_STORAGE_KEY);
      setIsPremium(savedState === null ? initialPremium : savedState === "true");
    };

    syncPremiumState();
    window.addEventListener(PREMIUM_TEST_EVENT, syncPremiumState);
    window.addEventListener("storage", syncPremiumState);

    return () => {
      window.removeEventListener(PREMIUM_TEST_EVENT, syncPremiumState);
      window.removeEventListener("storage", syncPremiumState);
    };
  }, [initialPremium]);

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] bg-secondary p-8 text-center text-surface md:p-14">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(184,106,60,0.28),transparent_38%)]" />
      <div className="relative">
      <h2 className="mx-auto max-w-3xl font-display text-4xl leading-tight tracking-tight md:text-6xl">
        {isPremium
          ? `Commander les plans complets de ${modelLabel}`
          : "Lancez votre projet de construction"}
      </h2>
      <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-surface/65 md:text-base">
        {isPremium
          ? `A partir de : ${formatPrice(fullPlanPrice)} Fcfa`
          : "Accedez aux plans de distribution, devis estimatifs et echangez avec nos architectes pour personnaliser votre projet."}
      </p>
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        {isPremium ? (
          <a
            href={`https://wa.me/${WHATSAPP_PHONE}?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-primary px-8 py-3 text-sm font-black text-white shadow-[0_18px_45px_rgba(184,106,60,0.35)] transition-colors hover:bg-primary-dark"
          >
            Commander sur WhatsApp
          </a>
        ) : (
          <>
            <Link
              href="/abonnement"
              className="rounded-full bg-primary px-8 py-3 text-sm font-black text-white shadow-[0_18px_45px_rgba(184,106,60,0.35)] transition-colors hover:bg-primary-dark"
            >
              Decouvrir l&apos;abonnement Premium
            </Link>
            <a
              href={`https://wa.me/${WHATSAPP_PHONE}?text=Bonjour%2C%20je%20suis%20interesse%20par%20un%20plan%20de%20construction%20WooPlans.`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-surface/25 px-8 py-3 text-sm font-black text-surface transition-colors hover:border-primary hover:text-primary"
            >
              En parler sur WhatsApp
            </a>
          </>
        )}
      </div>
      </div>
    </div>
  );
}
