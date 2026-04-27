"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const PREMIUM_TEST_STORAGE_KEY = "wooplans-premium-test-unlocked";
const PREMIUM_TEST_EVENT = "wooplans-premium-test-changed";

type PlanPersonalizationCTAProps = {
  isPremium: boolean;
};

export function PlanPersonalizationCTA({
  isPremium,
}: PlanPersonalizationCTAProps) {
  const [clientPremium, setClientPremium] = useState(false);

  useEffect(() => {
    const syncPremiumState = () => {
      const savedState = window.localStorage.getItem(PREMIUM_TEST_STORAGE_KEY);
      setClientPremium(savedState === "true");
    };
    syncPremiumState();
    window.addEventListener(PREMIUM_TEST_EVENT, syncPremiumState);
    window.addEventListener("storage", syncPremiumState);
    return () => {
      window.removeEventListener(PREMIUM_TEST_EVENT, syncPremiumState);
      window.removeEventListener("storage", syncPremiumState);
    };
  }, []);

  if (isPremium || clientPremium) {
    return null;
  }

  return (
    <div className="bg-surface border border-outline/10 rounded-2xl p-6 md:p-8 opacity-80">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h3 className="text-lg font-semibold text-foreground tracking-tight">
              Personnalisez ce plan
            </h3>
          </div>
          <p className="text-sm text-foreground/60 leading-relaxed">
            Cette option est réservée aux membres Premium. Abonnez-vous pour discuter avec nos architectes et adapter ce modèle à votre projet.
          </p>
        </div>
        <Link
          href="/abonnement"
          className="shrink-0 inline-flex items-center justify-center px-6 py-3 border-2 border-accent text-accent font-semibold text-sm rounded-full hover:bg-accent hover:text-white transition-colors"
        >
          Devenir Premium
        </Link>
      </div>
    </div>
  );
}
