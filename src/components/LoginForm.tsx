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

const TEXT = {
  fr: {
    prefilled: "Vos identifiants sont pré-remplis : appuyez sur « Se connecter ».",
    failed: "Connexion impossible. Réessayez.",
    sent: "Si cet email est associé à un accès actif, un nouveau code a été envoyé.",
    email: "Email utilisé lors de l'achat",
    code: "Code d'accès",
    example: "Ex. 46TE",
    wait: "Patientez…",
    login: "Se connecter",
    newCode: "Recevoir un nouveau code",
    lost: "Code perdu ? Recevoir un nouveau code par email",
    have: "J'ai mon code, me connecter",
  },
  en: {
    prefilled: "Your details are filled in: tap “Log in”.",
    failed: "Login failed. Please try again.",
    sent: "If this email has an active access, a new code has been sent.",
    email: "Email used for your purchase",
    code: "Access code",
    example: "e.g. 46TE",
    wait: "Please wait…",
    login: "Log in",
    newCode: "Send me a new code",
    lost: "Lost your code? Get a new one by email",
    have: "I have my code, log in",
  },
};

export function LoginForm({ defaultEmail = "", next = "/espace-premium", lang = "fr" }: { defaultEmail?: string; next?: string; lang?: "fr" | "en" }) {
  const t = TEXT[lang];
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const [code, setCode] = useState("");

  useEffect(() => {
    const fromLink = takeCodeFromHash();
    if (!fromLink) return;
    setCode(fromLink);
    setMessage({ tone: "info", text: t.prefilled });
  }, [t.prefilled]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const url = mode === "login" ? "/api/membre/connexion" : "/api/membre/code-oublie";
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, lang }) }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { error?: string; message?: string } | null;
    setPending(false);
    if (mode === "login") {
      if (res?.ok) {
        router.push(next);
        router.refresh();
        return;
      }
      setMessage({ tone: "error", text: data?.error || t.failed });
    } else {
      setMessage({ tone: "info", text: data?.message || t.sent });
      setMode("login");
    }
  }

  return (
    <form onSubmit={submit} className="card grid gap-4 p-6">
      <div>
        <label className="label" htmlFor="email">{t.email}</label>
        <input id="email" name="email" type="email" required autoComplete="email" defaultValue={defaultEmail} className="input" />
      </div>
      {mode === "login" ? (
        <div>
          <label className="label" htmlFor="code">{t.code}</label>
          <input
            id="code"
            name="code"
            required
            autoComplete="one-time-code"
            autoCapitalize="characters"
            placeholder={t.example}
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
        {pending ? t.wait : mode === "login" ? t.login : t.newCode}
      </button>
      <button
        type="button"
        className="text-sm font-medium text-primary hover:underline"
        onClick={() => {
          setMode(mode === "login" ? "forgot" : "login");
          setMessage(null);
        }}
      >
        {mode === "login" ? t.lost : t.have}
      </button>
    </form>
  );
}
