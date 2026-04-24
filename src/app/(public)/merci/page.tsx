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
  const [premiumCode, setPremiumCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!email) {
      setLoading(false);
      return;
    }

    const poll = setInterval(() => {
      fetch(`/api/premium-code/lookup?email=${encodeURIComponent(email)}`)
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
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(184,106,60,0.16),transparent_36%),linear-gradient(135deg,#F3EEE6_0%,#FFFDF8_100%)] px-4 py-12">
      <div className="w-full max-w-lg rounded-[2rem] border border-outline/10 bg-surface p-6 text-center shadow-[0_30px_80px_rgba(30,26,23,0.12)] sm:p-8">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
          <svg className="h-9 w-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="square"
              strokeLinejoin="miter"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-primary">
          Accès confirmé
        </p>
        <h1 className="mt-3 font-display text-4xl leading-tight text-foreground">
          Merci pour votre achat.
        </h1>
        <p className="mb-7 mt-4 leading-7 text-muted">
          Votre paiement a été effectué avec succès. Voici votre code
          d&apos;accès Premium.
        </p>

        {loading ? (
          <div className="mb-6 rounded-[1.5rem] border border-outline/10 bg-background p-6">
            <div className="flex animate-pulse flex-col items-center gap-2">
              <div className="h-4 w-32 rounded-full bg-foreground/10" />
              <div className="h-10 w-28 rounded-full bg-foreground/10" />
            </div>
            <p className="mt-3 text-xs text-muted">Génération de votre code en cours...</p>
          </div>
        ) : premiumCode ? (
          <div className="mb-6 rounded-[1.5rem] border border-primary/30 bg-background p-6">
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-primary">
              Votre code Premium
            </p>
            <p className="font-mono text-4xl font-black tracking-[0.3em] text-primary">
              {premiumCode}
            </p>
            <p className="mt-3 text-xs text-muted">
              Conservez ce code précieusement. Il vous sera demandé à la connexion.
            </p>
          </div>
        ) : (
          <div className="mb-6 rounded-[1.5rem] border border-outline/10 bg-background p-6">
            <p className="text-sm text-muted">
              Votre code premium est en cours d&apos;activation.
            </p>
            <p className="mt-2 text-xs text-muted/70">
              Vous recevrez votre code par email sous peu.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Link
            href="/connexion"
            className="block w-full rounded-full border border-primary bg-primary px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-primary-dark"
          >
            Accéder à la connexion
          </Link>
          <Link
            href="/plans"
            className="block w-full rounded-full border border-outline/10 px-6 py-3 text-sm font-black text-foreground transition-colors hover:border-primary/40"
          >
            Explorer le catalogue
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
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="animate-pulse text-muted">Chargement...</div>
        </div>
      }
    >
      <ThankYouContent />
    </Suspense>
  );
}
