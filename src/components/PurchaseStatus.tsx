"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import catalogue from "@/config/catalogue.json";
import projet from "@/config/projet.json";
import { pixelPurchase } from "@/lib/pixel";
import { confirmBuyer } from "@/components/PromoCode";
import { UpsellOffer, type UpsellData } from "@/components/UpsellOffer";

type Status = {
  status: "unknown" | "started" | "paid" | "failed" | "abandoned";
  email: string | null;
  code: string | null;
  /** Achat du plan et devis d'un seul modèle (sinon Catalogue Premium). */
  plan?: { slug: string; code: string; name: string } | null;
  download?: string | null;
  /** Acheté avec le code de l'offre aux clients : prix non déduit des plans complets. */
  promo?: boolean;
  /** Offre aux clients (24 h après le paiement). */
  upsell?: UpsellData | null;
  /** Offre « plan et devis + Catalogue Premium offert » : accès Premium, le modèle est dans les fiches PDF. */
  offre?: { id: string; price: number } | null;
};

/** Lien de connexion qui mène aux fiches PDF (email pré-rempli). */
function loginToDownloads(email: string | null) {
  return `/connexion?${email ? `email=${encodeURIComponent(email)}&` : ""}suite=${encodeURIComponent("/espace-premium/telechargements")}`;
}

/** Interroge le serveur jusqu'à la confirmation du paiement (notification Chariow). */
export function PurchaseStatus({ intentId, pixelId }: { intentId?: string; pixelId?: string }) {
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
      if (json?.status === "paid" && json.offre) {
        confirmBuyer();
        const key = `wp_purchase_${intentId ?? "x"}`;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          const code = json.plan?.code;
          pixelPurchase(pixelId, key, {
            value: json.offre.price,
            currency: "XAF",
            content_name: code ? `Plan et devis ${code} + Catalogue Premium offert` : "Plan et devis + Catalogue Premium offert",
            ...(code ? { content_ids: [code], content_type: "product" } : {}),
          });
        }
        return;
      }
      if (json?.status === "paid" && json.download) {
        // Paiement confirmé : les achats suivants sur cet appareil partent directement au paiement.
        confirmBuyer();
        const key = `wp_purchase_${intentId ?? "x"}`;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          // content_ids = code du modèle : Meta voit quel modèle se vend, campagne par campagne.
          const code = json.plan?.code;
          pixelPurchase(pixelId, key, {
            value: projet.price,
            currency: "XAF",
            content_name: `Plan et devis ${code ?? ""}`.trim(),
            ...(code ? { content_ids: [code], content_type: "product" } : {}),
          });
        }
        return;
      }
      if (json?.status === "paid" && json.code) {
        const key = `wp_purchase_${intentId ?? "x"}`;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          pixelPurchase(pixelId, key, { value: catalogue.price, currency: "XAF", content_name: "Catalogue Premium Wooplans" });
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
  }, [intentId, pixelId]);

  if (data?.status === "paid" && data.offre) {
    return <OffreConfirmed data={data} copied={copied} onCopy={() => setCopied(true)} />;
  }

  if (data?.status === "paid" && data.plan && data.download) {
    return (
      <div className="card p-6 text-center md:p-10">
        <p className="text-4xl" aria-hidden>🎉</p>
        <h1 className="mt-3 text-2xl font-bold md:text-3xl">Paiement confirmé, votre plan et devis est prêt</h1>
        <p className="mt-3 text-foreground/75">
          {data.plan.name} (réf. {data.plan.code}) : plan de distribution avec les dimensions, surfaces des pièces et devis détaillé. Le lien vous
          est aussi envoyé par email.
        </p>
        <a href={data.download} className="btn-cta mt-8 px-8 py-4 text-base">Télécharger mon plan et devis</a>
        {data.upsell ? <UpsellOffer upsell={data.upsell} /> : null}
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

/**
 * Offre payée : un bouton connecte l'acheteur (navigateur de l'achat) et ouvre ses fiches PDF, où le modèle l'attend.
 * Autre navigateur ou délai dépassé : page de connexion avec le code reçu par email.
 */
function OffreConfirmed({ data, copied, onCopy }: { data: Status; copied: boolean; onCopy: () => void }) {
  const [opening, setOpening] = useState(false);
  async function open() {
    setOpening(true);
    const res = await fetch("/api/achat/acces", { method: "POST" }).catch(() => null);
    const body = (await res?.json().catch(() => null)) as { url?: string } | null;
    window.location.href = res?.ok && body?.url ? body.url : loginToDownloads(data.email);
  }
  return (
    <div className="card p-6 text-center md:p-10">
      <p className="text-4xl" aria-hidden>🎉</p>
      <h1 className="mt-3 text-2xl font-bold md:text-3xl">Paiement confirmé, votre plan et devis est prêt</h1>
      <p className="mt-3 text-foreground/75">
        {data.plan ? `${data.plan.name} (réf. ${data.plan.code}) vous attend` : "Votre plan et devis vous attend"} dans votre espace Premium, rubrique
        « Fiches PDF ». <strong>Bonus :</strong> le Catalogue Premium vous est offert, pour le comparer avec tous nos autres modèles.
      </p>
      <button type="button" onClick={open} disabled={opening} className="btn-cta mt-8 px-8 py-4 text-base">
        {opening ? "Ouverture…" : "Accéder à mon plan et devis"}
      </button>
      {data.code ? (
        <div className="mx-auto mt-8 max-w-xs rounded-2xl border-2 border-dashed border-primary bg-primary/5 p-4">
          <p className="text-sm text-foreground/75">Votre code d&apos;accès personnel</p>
          <p className="mt-1 font-mono text-2xl font-extrabold tracking-[0.2em] text-primary">{data.code}</p>
          <button
            type="button"
            className="mt-2 text-sm font-semibold text-primary hover:underline"
            onClick={() => {
              void navigator.clipboard?.writeText(data.code!);
              onCopy();
            }}
          >
            {copied ? "Code copié ✓" : "Copier le code"}
          </button>
        </div>
      ) : null}
      <p className="mt-4 text-sm text-muted">
        Votre code vous est aussi envoyé par email{data.email ? ` à ${data.email}` : ""} : il vous servira à vous reconnecter depuis n&apos;importe quel téléphone.
      </p>
    </div>
  );
}
