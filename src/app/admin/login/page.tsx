"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "admin",
          email,
          password,
          callbackUrl,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        redirectTo?: string;
      };

      if (!response.ok) {
        setError(data.error || "Impossible d'acceder au dashboard");
        return;
      }

      router.push(data.redirectTo || callbackUrl);
      router.refresh();
    } catch (error) {
      console.error("Admin login failed:", error);
      setError("Erreur reseau lors de la connexion.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary px-4">
      <div className="w-full max-w-md bg-surface border-2 border-outline p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-foreground tracking-tight">WooPlans</h1>
          <p className="text-foreground/60 mt-1 text-sm">Panneau d&apos;administration</p>
          <p className="text-foreground/50 mt-2 text-xs">
            Connexion réservée à l’administrateur
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm px-4 py-3 border-2 border-red-700 dark:border-red-500 font-semibold">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-bold text-foreground/70 mb-1.5 uppercase tracking-wider"
            >
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

          <label className="block text-sm">Mot de passe<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full border-2 border-outline px-4 py-3" /></label>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2.5 border-2 border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? "Connexion..." : "Acceder au dashboard"}
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
