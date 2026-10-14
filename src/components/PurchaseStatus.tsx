"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Status = { status: "unknown" | "started" | "paid" | "failed" | "abandoned"; email: string | null; code: string | null };

/** Interroge le serveur jusqu'à la confirmation du paiement (notification Chariow). */
export function PurchaseStatus({ intentId }: { intentId?: string }) {
  const [data, setData] = useState<Status | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async (n: number) => {
      const qs = intentId ? `?i=${encodeURIComponent(intentId)}` : "";
      const res = await fetch(`/api/achat/statut${qs}`, { cache: "no-store" }).catch(() => null);
      const json = (await res?.json().catch(() => null)) as Status | null;
      if (cancelled) return;
      if (json) setData(json);
      setAttempts(n);
      if (json?.status === "paid" && json.code) {
        const key = `wp_purchase_${intentId ?? "x"}`;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          window.fbq?.("track", "Purchase", { value: 39000, currency: "XAF", content_name: "Catalogue Premium Wooplans" });
        }
        return;
      }
      if (n < 40 && json?.status !== "failed") timer = setTimeout(() => poll(n + 1), n < 10 ? 3000 : 6000);
    };
    void poll(1);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [intentId]);

  if (data?.status === "paid") {
    return (
      <div className="card p-6 text-center md:p-10">
        <p className="text-4xl" aria-hidden>🎉</p>
        <h1 className="mt-3 text-2xl font-bold md:text-3xl">Paiement confirmé, bienvenue !</h1>
        <p className="mt-3 text-foreground/75">
          Votre Catalogue Premium vous est envoyé par email{data.email ? ` à ${data.email}` : ""}. Voici votre code d&apos;accès personnel à l&apos;espace Premium :
        </p>
        {data.code ? (
          <div className="mx-auto mt-6 max-w-xs rounded-2xl border-2 border-dashed border-primary bg-primary/5 p-5">
            <p className="font-mono text-3xl font-extrabold tracking-[0.2em] text-primary">{data.code}</p>
            <button
              type="button"
              className="mt-3 text-sm font-semibold text-primary hover:underline"
              onClick={() => {
                void navigator.clipboard?.writeText(data.code!);
                setCopied(true);
              }}
            >
              {copied ? "Code copié ✓" : "Copier le code"}
            </button>
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted">Votre code vient de vous être envoyé par email.</p>
        )}
        <p className="mt-4 text-sm text-muted">Notez-le : il vous servira à vous connecter depuis n&apos;importe quel téléphone.</p>
        <Link href={`/connexion${data.email ? `?email=${encodeURIComponent(data.email)}` : ""}`} className="btn-cta mt-8 px-8 py-4 text-base">
          Accéder à mon espace Premium
        </Link>
      </div>
    );
  }

  if (data?.status === "failed") {
    return (
      <div className="card p-8 text-center">
        <h1 className="text-2xl font-bold">Le paiement n&apos;a pas abouti</h1>
        <p className="mt-3 text-foreground/75">Aucun montant n&apos;a été débité. Vous pouvez réessayer quand vous voulez.</p>
        <Link href="/catalogue-premium" className="btn-cta mt-6">Réessayer</Link>
      </div>
    );
  }

  const waiting = attempts < 40;
  return (
    <div className="card p-8 text-center">
      {waiting ? <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" /> : null}
      <h1 className="mt-5 text-2xl font-bold">{waiting ? "Nous confirmons votre paiement…" : "Confirmation en cours"}</h1>
      <p className="mt-3 text-foreground/75">
        {waiting
          ? "Cela prend généralement moins d'une minute. Ne fermez pas cette page."
          : "La confirmation prend plus de temps que prévu. Dès qu'elle arrive, vous recevez votre catalogue et votre code d'accès par email."}
      </p>
      {!waiting ? (
        <p className="mt-4 text-sm text-muted">
          Déjà reçu votre code ? <Link href="/connexion" className="font-semibold text-primary">Connectez-vous</Link>
        </p>
      ) : null}
    </div>
  );
}
