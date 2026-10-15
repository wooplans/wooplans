"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Lien de l'email d'accès : /connexion?email=…#code=46TE. Le code est dans le fragment (#),
 * jamais envoyé au serveur ; il est lu ici puis retiré de la barre d'adresse et de l'historique.
 */
function takeCodeFromHash() {
  const code = new URLSearchParams(window.location.hash.slice(1)).get("code");
  if (code) window.history.replaceState(null, "", window.location.pathname + window.location.search);
  return code?.trim().toUpperCase().slice(0, 12) || "";
}

export function LoginForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const [code, setCode] = useState("");

  useEffect(() => {
    const fromLink = takeCodeFromHash();
    if (!fromLink) return;
    setCode(fromLink);
    setMessage({ tone: "info", text: "Vos identifiants sont pré-remplis : appuyez sur « Se connecter »." });
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const url = mode === "login" ? "/api/membre/connexion" : "/api/membre/code-oublie";
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { error?: string; message?: string } | null;
    setPending(false);
    if (mode === "login") {
      if (res?.ok) {
        router.push("/espace-premium");
        router.refresh();
        return;
      }
      setMessage({ tone: "error", text: data?.error || "Connexion impossible. Réessayez." });
    } else {
      setMessage({ tone: "info", text: data?.message || "Si cet email est associé à un accès actif, un nouveau code a été envoyé." });
      setMode("login");
    }
  }

  return (
    <form onSubmit={submit} className="card grid gap-4 p-6">
      <div>
        <label className="label" htmlFor="email">Email utilisé lors de l&apos;achat</label>
        <input id="email" name="email" type="email" required autoComplete="email" defaultValue={defaultEmail} className="input" />
      </div>
      {mode === "login" ? (
        <div>
          <label className="label" htmlFor="code">Code d&apos;accès</label>
          <input
            id="code"
            name="code"
            required
            autoComplete="one-time-code"
            autoCapitalize="characters"
            placeholder="Ex. 46TE"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="input font-mono uppercase tracking-widest"
          />
        </div>
      ) : null}
      {message ? (
        <p className={`text-sm ${message.tone === "error" ? "text-secondary" : "text-primary"}`}>{message.text}</p>
      ) : null}
      <button type="submit" disabled={pending} className="btn-primary py-3.5">
        {pending ? "Patientez…" : mode === "login" ? "Se connecter" : "Recevoir un nouveau code"}
      </button>
      <button
        type="button"
        className="text-sm font-medium text-primary hover:underline"
        onClick={() => {
          setMode(mode === "login" ? "forgot" : "login");
          setMessage(null);
        }}
      >
        {mode === "login" ? "Code perdu ? Recevoir un nouveau code par email" : "J'ai mon code, me connecter"}
      </button>
    </form>
  );
}
