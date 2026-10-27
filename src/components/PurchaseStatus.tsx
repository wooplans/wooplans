"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import catalogue from "@/config/catalogue.json";
import projet from "@/config/projet.json";

type Status = {
  status: "unknown" | "started" | "paid" | "failed" | "abandoned";
  email: string | null;
  code: string | null;
  /** Achat du plan et devis d'un seul modèle (sinon Catalogue Premium). */
  plan?: { slug: string; code: string; name: string } | null;
  download?: string | null;
};

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
      if (json?.status === "paid" && json.download) {
        const key = `wp_purchase_${intentId ?? "x"}`;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          window.fbq?.("track", "Purchase", { value: projet.price, currency: "XAF", content_name: `Plan et devis ${json.plan?.code ?? ""}`.trim() });
        }
        return;
      }
      if (json?.status === "paid" && json.code) {
        const key = `wp_purchase_${intentId ?? "x"}`;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          window.fbq?.("track", "Purchase", { value: catalogue.price, currency: "XAF", content_name: "Catalogue Premium Wooplans" });
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

  if (data?.status === "paid" && data.plan && data.download) {
    const whatsapp = `https://wa.me/${process.env.WHATSAPP_NUMBER || "237694327885"}?text=${encodeURIComponent(
      `Bonjour WOOPLANS, j'ai téléchargé le plan et devis du modèle ${data.plan.code} et je souhaite parler de mon projet.`,
    )}`;
    return (
      <div className="card p-6 text-center md:p-10">
        <p className="text-4xl" aria-hidden>🎉</p>
        <h1 className="mt-3 text-2xl font-bold md:text-3xl">Paiement confirmé, votre plan et devis est prêt</h1>
        <p className="mt-3 text-foreground/75">
          {data.plan.name} (réf. {data.plan.code}) : plan de distribution avec les dimensions, surfaces des pièces et devis détaillé. Le lien vous
          est aussi envoyé par email.
        </p>
        <a href={data.download} className="btn-cta mt-8 px-8 py-4 text-base">Télécharger mon plan et devis</a>
        <p className="mt-8 font-semibold">Des modifications à faire ?</p>
        <p className="mt-1 text-sm text-foreground/75">Parlez-en à nos architectes : le prix de ce plan et devis est déduit de vos plans complets.</p>
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn mt-4 border border-[#25D366] text-[#128C4B] hover:bg-[#25D366]/10">
          Discuter sur WhatsApp
        </a>
      </div>
    );
  }

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
        <Link href={data.plan ? `/catalogue/${data.plan.slug}` : "/catalogue-premium"} className="btn-cta mt-6">Réessayer</Link>
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
          : data?.plan
            ? "La confirmation prend plus de temps que prévu. Dès qu'elle arrive, vous recevez votre plan et devis par email."
            : "La confirmation prend plus de temps que prévu. Dès qu'elle arrive, vous recevez votre catalogue et votre code d'accès par email."}
      </p>
      {!waiting && !data?.plan ? (
        <p className="mt-4 text-sm text-muted">
          Déjà reçu votre code ? <Link href="/connexion" className="font-semibold text-primary">Connectez-vous</Link>
        </p>
      ) : null}
    </div>
  );
}
