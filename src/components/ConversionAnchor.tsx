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
  thumbnail: string;
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

function resolveImageUrl(thumbnail: string, origin: string) {
  if (!thumbnail) return "";
  if (/^https?:\/\//i.test(thumbnail)) return thumbnail;
  return origin ? `${origin}${thumbnail.startsWith("/") ? "" : "/"}${thumbnail}` : thumbnail;
}

export function ConversionAnchor({
  category,
  name,
  slug,
  thumbnail,
  initialPremium = false,
}: ConversionAnchorProps) {
  const [isPremium, setIsPremium] = useState(initialPremium);
  const [origin, setOrigin] = useState("");
  const modelCode = getModelCode(category, name, slug);
  const fullPlanPrice = getFullPlanPrice(category);
  const imageUrl = resolveImageUrl(thumbnail, origin);
  const whatsappMessage = encodeURIComponent(
    [
      `Bonjour, je souhaite commander les plans complets du modele ${modelCode} - ${name}.`,
      `Prix affiche : A partir de ${formatPrice(fullPlanPrice)} Fcfa.`,
      imageUrl ? `Image du modele : ${imageUrl}` : "",
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
    <div className="bg-foreground text-white rounded-2xl p-8 md:p-12 text-center">
      <h2 className="text-xl md:text-2xl font-semibold text-white mb-3 tracking-tight">
        {isPremium
          ? `Commander les plans complets du modèle ${modelCode}`
          : "Commencez votre projet maintenant"}
      </h2>
      <p className="text-sm text-white/60 max-w-md mx-auto leading-relaxed mb-8">
        {isPremium
          ? `À partir de : ${formatPrice(fullPlanPrice)} FCFA`
          : "Comparez tous nos plans et devis, et discutez avec un architecte sur WhatsApp."}
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {isPremium ? (
          <a
            href={`https://wa.me/${WHATSAPP_PHONE}?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-7 py-3 bg-accent text-white font-bold text-sm rounded-full hover:bg-accent/90 transition-colors"
          >
            Commander sur WhatsApp
          </a>
        ) : (
          <>
            <Link
              href="/abonnement"
              className="px-7 py-3 bg-accent text-white font-bold text-sm rounded-full hover:bg-accent/90 transition-colors"
            >
              Découvrir l&apos;abonnement Premium
            </Link>
            <a
              href={`https://wa.me/${WHATSAPP_PHONE}?text=Bonjour%2C%20je%20suis%20interesse%20par%20un%20plan%20de%20construction%20WooPlans.`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-7 py-3 border border-white/30 text-white text-sm font-bold rounded-full hover:bg-white hover:text-foreground transition-colors"
            >
              En parler sur WhatsApp
            </a>
          </>
        )}
      </div>
    </div>
  );
}
