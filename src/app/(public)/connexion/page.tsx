"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/plans";
  const [email, setEmail] = useState("");
  const [premiumCode, setPremiumCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "subscriber",
        email,
        premiumCode,
        callbackUrl,
      }),
    });

    const data = (await response.json()) as { error?: string; redirectTo?: string };

    if (!response.ok) {
      setError(data.error || "Impossible de vérifier vos identifiants");
      setLoading(false);
      return;
    }

    router.push(data.redirectTo || callbackUrl);
    router.refresh();
  }

  return (
    <div className="max-w-md w-full bg-surface border border-outline/10 p-8 rounded-2xl shadow-sm">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-foreground mb-2 tracking-tight">Connexion</h1>
        <p className="text-foreground/60">
          Entrez votre email et votre code premium pour accéder à votre compte Premium
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm px-4 py-3 border-2 border-red-700 dark:border-red-500 font-semibold">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold text-foreground/70 mb-2 uppercase tracking-[0.2em]"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="w-full px-4 py-3 border border-outline/10 bg-background rounded-full focus:outline-none focus:border-primary transition-colors"
            placeholder="votre@email.com"
          />
        </div>

        <div>
          <label
            htmlFor="premiumCode"
            className="block text-xs font-semibold text-foreground/70 mb-2 uppercase tracking-[0.2em]"
          >
            Code premium
          </label>
          <input
            type="text"
            id="premiumCode"
            name="premiumCode"
            value={premiumCode}
            onChange={(event) => setPremiumCode(event.target.value)}
            required
            maxLength={4}
            pattern="[0-9]{4}"
            inputMode="numeric"
            className="w-full px-4 py-3 border border-outline/10 bg-background rounded-full focus:outline-none focus:border-primary transition-colors text-center text-2xl font-mono tracking-[0.5em] placeholder:text-base placeholder:tracking-normal placeholder:font-normal"
            placeholder="4 chiffres"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-4 bg-primary text-white font-semibold text-lg rounded-full border border-primary hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>

      <div className="mt-6 space-y-3">
        <Link
          href="/abonnement"
          className="block w-full px-6 py-3 border border-outline/10 text-foreground font-semibold rounded-full hover:border-foreground/30 transition-colors text-center"
        >
          Acheter un abonnement
        </Link>
        <Link
          href="/"
          className="block w-full px-6 py-3 text-foreground/60 font-medium hover:text-foreground transition-colors text-center"
        >
          Retour à l&apos;accueil
        </Link>
      </div>

      <div className="mt-8 p-4 border border-outline/10 bg-background rounded-2xl">
        <p className="text-[11px] text-foreground/50 text-center mb-2 font-semibold uppercase tracking-[0.2em]">
          Comment obtenir mon code premium ?
        </p>
        <ol className="text-sm text-foreground/70 space-y-2">
          <li className="flex items-start gap-2">
            <span className="font-semibold text-primary">1.</span>
            <span>Passez par la page d&apos;abonnement et finalisez votre paiement</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-semibold text-primary">2.</span>
            <span>Recevez votre code premium à 4 chiffres après le paiement</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-semibold text-primary">3.</span>
            <span>Utilisez ce code ci-dessus pour vous connecter</span>
          </li>
        </ol>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <Suspense
        fallback={
          <div className="max-w-md w-full bg-surface border border-outline/10 p-8 rounded-2xl shadow-sm" />
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
