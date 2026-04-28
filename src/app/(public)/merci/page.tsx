"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type PremiumCodeLookupResponse = {
  premiumCode?: string | null;
};

function ThankYouContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const loginHref = email ? `/connexion?email=${encodeURIComponent(email)}` : "/connexion";
  const [premiumCode, setPremiumCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!email) {
      setLoading(false);
      return;
    }

    const poll = setInterval(() => {
      fetch(`/api/premium-code/lookup?email=${encodeURIComponent(email!)}`)
        .then((res) => res.json() as Promise<PremiumCodeLookupResponse>)
        .then((data) => {
          if (data.premiumCode) {
            setPremiumCode(data.premiumCode);
            setLoading(false);
            clearInterval(poll);
          }
        })
        .catch(() => {
          setLoading(false);
          clearInterval(poll);
        });
    }, 3000);

    setTimeout(() => {
      clearInterval(poll);
      setLoading(false);
    }, 60000);

    return () => clearInterval(poll);
  }, [email]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <div className="max-w-md w-full bg-surface border border-outline/10 p-8 text-center rounded-2xl shadow-sm">
        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="square"
              strokeLinejoin="miter"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-2 tracking-tight">Merci pour votre achat !</h1>
        <p className="text-foreground/60 mb-6">
          Votre paiement a été effectué avec succès. Voici votre code d&apos;accès Premium.
        </p>

        {loading ? (
          <div className="border border-outline/10 bg-background p-6 mb-6 rounded-2xl">
            <div className="animate-pulse flex flex-col items-center gap-2">
              <div className="h-4 w-32 bg-foreground/10" />
              <div className="h-10 w-28 bg-foreground/10" />
            </div>
            <p className="text-xs text-foreground/50 mt-3">Génération de votre code en cours...</p>
          </div>
        ) : premiumCode ? (
          <div className="border border-primary/30 bg-background p-6 mb-6 rounded-2xl">
            <p className="text-[11px] text-foreground/50 mb-2 uppercase tracking-[0.2em] font-semibold">Votre code Premium</p>
            <p className="text-4xl font-mono font-black text-primary tracking-[0.3em]">{premiumCode}</p>
            <p className="text-xs text-foreground/40 mt-3">Conservez ce code précieusement. Il vous sera demandé à la connexion.</p>
          </div>
        ) : (
          <div className="border border-outline/10 bg-background p-6 mb-6 rounded-2xl">
            <p className="text-sm text-foreground/60">Votre code premium est en cours d&apos;activation.</p>
            <p className="text-xs text-foreground/40 mt-2">Vous recevrez votre code par email sous peu.</p>
          </div>
        )}

        <div className="space-y-3">
          <Link
            href={loginHref}
            className="block w-full px-6 py-4 bg-primary text-white font-semibold text-lg rounded-full border border-primary hover:bg-primary-dark transition-colors"
          >
            Accéder à la page de connexion
          </Link>
          <Link
            href="/"
            className="block w-full px-6 py-3 border border-outline/10 text-foreground font-semibold rounded-full hover:border-foreground/30 transition-colors"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-pulse text-foreground/50">Chargement...</div>
        </div>
      }
    >
      <ThankYouContent />
    </Suspense>
  );
}
