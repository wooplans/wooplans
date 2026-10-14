"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <form
      className="card grid gap-4 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        const res = await fetch("/api/admin/connexion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
        }).catch(() => null);
        setPending(false);
        if (res?.ok) {
          router.push("/admin");
          router.refresh();
        } else {
          const data = (await res?.json().catch(() => null)) as { error?: string } | null;
          setError(data?.error || "Connexion impossible");
        }
      }}
    >
      <input name="email" type="email" required placeholder="Email" autoComplete="username" className="input" />
      <input name="password" type="password" required placeholder="Mot de passe" autoComplete="current-password" className="input" />
      {error ? <p className="text-sm text-secondary">{error}</p> : null}
      <button className="btn-primary" disabled={pending}>{pending ? "…" : "Se connecter"}</button>
    </form>
  );
}
