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
    <div className="w-full max-w-lg rounded-[2rem] border border-outline/10 bg-surface p-6 shadow-[0_30px_80px_rgba(30,26,23,0.12)] sm:p-8">
      <div className="mb-8">
        <Link
          href="/"
          className="mb-8 inline-flex text-xs font-black uppercase tracking-[0.22em] text-primary"
        >
          WooPlans
        </Link>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-primary">
          Espace premium
        </p>
        <h1 className="mt-3 font-display text-4xl leading-tight text-foreground">
          Retrouvez vos plans débloqués.
        </h1>
        <p className="mt-4 leading-7 text-muted">
          Entrez votre email et votre code Premium pour accéder aux plans,
          devis et informations réservées.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-muted"
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
            className="w-full rounded-full border border-outline/10 bg-background px-5 py-4 text-foreground transition-colors placeholder:text-muted/60 focus:border-primary focus:outline-none"
            placeholder="votre@email.com"
          />
        </div>

        <div>
          <label
            htmlFor="premiumCode"
            className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-muted"
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
            className="w-full rounded-full border border-outline/10 bg-background px-5 py-4 text-center font-mono text-2xl tracking-[0.5em] text-foreground transition-colors placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-muted/60 focus:border-primary focus:outline-none"
            placeholder="4 chiffres"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full border border-primary bg-primary px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-white shadow-[0_16px_36px_rgba(184,106,60,0.26)] transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          href="/abonnement"
          className="block rounded-full border border-outline/10 px-5 py-3 text-center text-sm font-black text-foreground transition-colors hover:border-primary/40"
        >
          Voir Premium
        </Link>
        <Link
          href="/plans"
          className="block rounded-full px-5 py-3 text-center text-sm font-black text-muted transition-colors hover:text-foreground"
        >
          Catalogue
        </Link>
      </div>

      <div className="mt-8 rounded-[1.5rem] border border-outline/10 bg-background p-5">
        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-primary">
          Comment obtenir mon code premium ?
        </p>
        <ol className="space-y-2 text-sm text-muted">
          <li className="flex items-start gap-2">
            <span className="font-black text-primary">1.</span>
            <span>Passez par la page d&apos;abonnement et finalisez votre paiement</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-black text-primary">2.</span>
            <span>Recevez votre code premium à 4 chiffres après le paiement</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-black text-primary">3.</span>
            <span>Utilisez ce code ci-dessus pour vous connecter</span>
          </li>
        </ol>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(184,106,60,0.16),transparent_36%),linear-gradient(135deg,#F3EEE6_0%,#FFFDF8_100%)] px-4 py-12">
      <Suspense
        fallback={
          <div className="h-[560px] w-full max-w-lg animate-pulse rounded-[2rem] bg-surface" />
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
