"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "admin",
        email,
        callbackUrl,
      }),
    });

    const data = (await response.json()) as { error?: string; redirectTo?: string };

    if (!response.ok) {
      setError(data.error || "Impossible d'accéder au dashboard");
      setLoading(false);
    } else {
      router.push(data.redirectTo || callbackUrl);
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary px-4">
      <div className="w-full max-w-md bg-white border-2 border-outline p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-foreground tracking-tight">WooPlans</h1>
          <p className="text-foreground/60 mt-1 text-sm">Panneau d&apos;administration</p>
          <p className="text-foreground/50 mt-2 text-xs">
            Accès temporaire sans mot de passe pendant la phase privée du site
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-3 border-2 border-red-700 font-semibold">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-bold text-foreground/70 mb-1.5 uppercase tracking-wider">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-2.5 border-2 border-outline focus:border-primary outline-none transition-all text-sm"
              placeholder="admin@wooplans.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2.5 border-2 border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? "Connexion..." : "Accéder au dashboard"}
          </button>
        </form>

        <p className="text-center text-xs text-foreground/40 mt-6">
          <a href="/" className="hover:text-primary transition-colors">
            &larr; Retour au site
          </a>
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LoginForm />
    </Suspense>
  );
}
