"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const PREMIUM_TEST_STORAGE_KEY = "wooplans-premium-test-unlocked";
const PREMIUM_TEST_EVENT = "wooplans-premium-test-changed";
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

function getModelCode(category: string, name: string, slug: string) {
  const source = `${name} ${slug}`.toUpperCase();
  const explicitCode = source.match(/\b[VD]X?[-\s]?\d{2,4}\b/)?.[0];

  if (explicitCode) {
    const letter = explicitCode.startsWith("D") ? "D" : "V";
    const digits = explicitCode.match(/\d{2,4}/)?.[0] ?? "XXX";
    return `${letter}X-${digits}`;
  }

  const slugSuffix = slug.toUpperCase().match(/(?:^|[-_\s])([VD])(\d{2,4})(?:$|[-_\s])?/);

  if (slugSuffix) {
    return `${slugSuffix[1]}X-${slugSuffix[2]}`;
  }

  return category === "duplex" ? "DX-XXX" : "VX-XXX";
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
  const modelCode = getModelCode(category, name, slug);
  const fullPlanPrice = getFullPlanPrice(category);
  const whatsappMessage = encodeURIComponent(
    `Bonjour, je souhaite commander les plans complets du modele ${modelCode} - ${name}.`,
  );

  useEffect(() => {
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
    <div className="border-2 border-outline bg-surface p-8 md:p-12 text-center">
      <h2 className="text-xl md:text-2xl font-black text-foreground mb-3 tracking-tight">
        {isPremium
          ? `Commander les plans complets de ce modele ${modelCode}`
          : "Lancez votre projet de construction"}
      </h2>
      <p className="text-sm text-foreground/50 max-w-md mx-auto leading-relaxed mb-8">
        {isPremium
          ? `A partir de : ${formatPrice(fullPlanPrice)} Fcfa`
          : "Accedez aux plans de distribution, devis estimatifs et echangez avec nos architectes pour personnaliser votre projet."}
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {isPremium ? (
          <a
            href={`https://wa.me/?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-7 py-3 bg-primary text-white font-bold text-sm border-2 border-primary hover:bg-transparent hover:text-primary transition-colors"
          >
            Commander sur WhatsApp
          </a>
        ) : (
          <>
            <Link
              href="/abonnement"
              className="px-7 py-3 bg-primary text-white font-bold text-sm border-2 border-primary hover:bg-transparent hover:text-primary transition-colors"
            >
              Decouvrir l&apos;abonnement Premium
            </Link>
            <a
              href="https://wa.me/?text=Bonjour, je suis interesse par un plan de construction WooPlans."
              target="_blank"
              rel="noopener noreferrer"
              className="px-7 py-3 border-2 border-outline text-foreground text-sm font-bold hover:bg-outline hover:text-white transition-colors"
            >
              En parler sur WhatsApp
            </a>
          </>
        )}
      </div>
    </div>
  );
}
