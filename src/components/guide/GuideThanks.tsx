"use client";

import { useEffect, useState } from "react";
import { pixelPurchase } from "@/lib/pixel";
import { phCapture } from "@/lib/posthog-browser";

type Status = { status: "unknown" | "started" | "paid" | "failed" | "abandoned" | "gift"; download?: string | null; track?: boolean; waText?: string | null };

/**
 * Page de remerciement du guide : deux choses seulement, livrer le guide puis présenter le Catalogue Premium
 * (prix plein, aucune réduction). Pas de questionnaire ni de lien WhatsApp à côté du bouton : ils détournaient
 * les clics du catalogue (décision de Tao, 15 nov.). L'achat du guide suffit à qualifier le contact.
 */
export function GuideThanks(props: {
  intentId?: string;
  pixelId?: string;
  guidePrice: number;
  cataloguePrice: string;
  catalogueUrl: string;
  whatsappUrl: string;
  video: string;
  videoPoster: string;
  announcedModels: number;
  offer?: "guide" | "extrait";
  /** Lien wa.me vers le numéro WooPlans, message pré-rempli : le client nous écrit en premier pour recevoir le PDF. */
  waDeliveryUrl?: string;
  /** Numéro WhatsApp Business (chiffres) : le message pré-rempli définitif (code de commande + nom) vient de /api/guide/statut. */
  waDeliveryNumber?: string;
}) {
  const { intentId, pixelId } = props;
  const extrait = props.offer === "extrait";
  const product = extrait ? "Extrait du Catalogue Premium" : "Guide WooPlans des maisons";
  const [data, setData] = useState<Status | null>(null);
  const [attempts, setAttempts] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async (n: number) => {
      const qs = intentId ? `?i=${encodeURIComponent(intentId)}` : "";
      const res = await fetch(`/api/guide/statut${qs}`, { cache: "no-store" }).catch(() => null);
      const json = (await res?.json().catch(() => null)) as Status | null;
      if (cancelled) return;
      if (json) setData(json);
      setAttempts(n);
      if (json?.status === "paid") {
        const key = `wp_purchase_${intentId ?? "x"}`;
        if (json.track && !sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          pixelPurchase(pixelId, key, { value: props.guidePrice, currency: "XAF", content_name: product, content_ids: [extrait ? "extrait-catalogue" : "guide-maisons"], content_type: "product" });
        }
        return;
      }
      if (n < 40) timer = setTimeout(() => poll(n + 1), n < 10 ? 2000 : 5000);
    };
    void poll(0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intentId, pixelId]);

  const paid = data?.status === "paid";
  const waiting = !paid && attempts < 40 && data?.status !== "failed";

  return (
    <div className="space-y-8">
      {/* 1. Le guide */}
      <section className="card p-6 md:p-8">
        {paid ? (
          <>
            <p className="eyebrow">Paiement confirmé</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Votre {product} est prêt</h1>
            <p className="mt-3 text-foreground/75">Il est aussi dans votre boîte email. Gardez ce message : il vous permet de le retélécharger.</p>
            {data?.download && (
              <a href={data.download} data-cta={extrait ? "extrait_telecharger" : "guide_telecharger"} className="btn btn-cta mt-5 inline-flex px-6 py-4 text-base">
                Télécharger mon {extrait ? "extrait" : "guide"} (PDF)
              </a>
            )}
            {props.waDeliveryUrl ? (
              <a
                href={data?.waText && props.waDeliveryNumber ? `https://wa.me/${props.waDeliveryNumber}?text=${encodeURIComponent(data.waText)}` : props.waDeliveryUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-cta={extrait ? "extrait_merci_whatsapp" : "guide_merci_whatsapp"}
                onClick={() => phCapture("lead_merci_whatsapp", { offer: props.offer ?? "guide" })}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 py-3 font-semibold text-white hover:bg-[#1ebe5a] sm:w-auto sm:inline-flex sm:ml-3"
              >
                Recevoir aussi mon PDF sur WhatsApp
              </a>
            ) : null}
          </>
        ) : waiting ? (
          <>
            <h1 className="text-2xl font-bold tracking-tight">Confirmation de votre paiement…</h1>
            <p className="mt-3 text-foreground/75">Cela prend en général quelques secondes. Ne fermez pas cette page.</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight">Nous n&apos;avons pas encore reçu la confirmation du paiement</h1>
            <p className="mt-3 text-foreground/75">
              Si vous avez payé, le PDF arrivera par email dans quelques minutes. Sinon, écrivez-nous sur WhatsApp : nous vous aidons.
            </p>
            <a href={props.whatsappUrl} className="btn btn-primary mt-5 inline-flex">
              Écrire sur WhatsApp
            </a>
          </>
        )}
      </section>

      {/* 2. Le Catalogue Premium : ce que le guide ne montre pas (prix plein, aucune réduction ni compte à rebours). */}
      <section className="overflow-hidden rounded-2xl bg-primary text-white">
        <div className="p-6 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-highlight">L&apos;étape suivante</p>
          <h2 className="mt-2 text-2xl font-bold md:text-3xl">
            {extrait ? (
              <>Vous avez 5 maisons. Le Catalogue Premium vous les donne toutes.</>
            ) : (
              <>Votre guide montre l&apos;extérieur. Le Catalogue Premium montre l&apos;intérieur.</>
            )}
          </h2>
          <p className="mt-3 max-w-2xl text-white/85">
            {extrait
              ? `Les ${props.announcedModels} villas et duplex au même format que votre extrait : plan de distribution et devis poste par poste pour chacun.`
              : "Pour choisir votre maison en toute confiance, il vous faut voir la place de chaque pièce et le coût de chaque étape du chantier."}
          </p>
          {props.video ? (
            <video
              className="mx-auto mt-6 aspect-[9/16] w-full max-w-[340px] rounded-xl bg-black"
              controls
              playsInline
              preload="none"
              poster={props.videoPoster || undefined}
              onPlay={() => phCapture("guide_merci_video_play", { offer: props.offer ?? "guide" })}
            >
              <source src={props.video} type="video/mp4" />
            </video>
          ) : (
            <figure className="relative mt-6 max-w-3xl overflow-hidden rounded-xl bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/guide/premium-apercu.jpg" alt="Aperçu flouté d'un plan coté et d'un devis" loading="lazy" className="w-full" />
              <figcaption className="absolute inset-0 grid place-items-center">
                <span className="rounded-full bg-foreground/90 px-4 py-2 text-sm font-semibold text-white">Plans cotés et devis : dans le Catalogue Premium</span>
              </figcaption>
            </figure>
          )}
        </div>
        <div className="grid gap-px bg-white/15 md:grid-cols-2">
          <div className="bg-primary p-6 md:px-10">
            <p className="font-semibold text-white/80">Dans votre {extrait ? "extrait" : "guide"}</p>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              {(extrait
                ? ["5 maisons de budgets différents", "Le plan de distribution de chacune", "Le devis poste par poste de chacune"]
                : ["Le rendu de chaque maison", "Chambres, niveaux, surface", "Le terrain conseillé", "Le budget global estimé"]
              ).map((t) => (
                <li key={t} className="flex gap-2">
                  <span aria-hidden>✓</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-primary-dark p-6 md:px-10">
            <p className="font-semibold text-highlight">En plus dans le Catalogue Premium</p>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                "Le plan de distribution coté de chaque niveau",
                "La surface de chaque pièce",
                "Le devis poste par poste : fondation, élévations, toiture… jusqu'au carrelage",
                "La fiche PDF de chaque modèle, à montrer à votre maçon",
                "Le comparateur : 3 modèles côte à côte",
                `Les ${props.announcedModels} modèles, nouveaux modèles inclus`,
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="text-highlight" aria-hidden>
                    ✓
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="p-6 md:px-10 md:pb-10">
          <div className="flex flex-wrap items-center gap-4">
            <a href={props.catalogueUrl} data-cta={extrait ? "extrait_merci_catalogue" : "guide_merci_catalogue"} className="cta-pulse btn btn-cta w-full px-6 py-4 text-base sm:w-auto">
              Voir le Catalogue Premium
            </a>
            <p className="text-white/85">
              <strong className="text-white">{props.cataloguePrice}</strong> · paiement unique · version numérique (espace en ligne + fiches PDF)
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
