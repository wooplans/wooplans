"use client";

import { useEffect, useRef, useState } from "react";
import { GuideCheckoutButton } from "@/components/guide/GuideCheckoutButton";
import { phCapture } from "@/lib/posthog-browser";

export type GuideModel = {
  slug: string;
  code: string;
  category: string;
  bedrooms: number;
  levels: number;
  surfaceTotal: number;
  landArea: number | null;
  budgetMin: number | null;
  budgetMax: number | null;
  image: string;
};

const millions = (v: number | null) => (v === null ? "" : (v / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 }));

/**
 * Grille des maisons préférées des clients (même message que la pub qui vend). Un toucher sur une maison l'ouvre en
 * grand avec ses chiffres et le bouton d'achat du guide : les visiteurs touchaient les photos sans résultat.
 */
export function GuideModelGrid({ models, price, enabled, compact = false }: { models: GuideModel[]; price: number; enabled: boolean; compact?: boolean }) {
  const [open, setOpen] = useState<GuideModel | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);

  return (
    <>
      <div className={`grid grid-cols-2 ${compact ? "gap-2" : "gap-3 md:grid-cols-3"}`}>
        {models.map((m) => (
          <button
            key={m.slug}
            type="button"
            onClick={() => {
              phCapture("guide_model_open", { plan: m.slug });
              setOpen(m);
            }}
            className="group overflow-hidden rounded-xl bg-white text-left text-foreground shadow-sm ring-primary transition hover:ring-2"
          >
            <span className="relative block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${m.image}?w=480`} alt={`Rendu 3D ${m.code}`} loading={compact ? "eager" : "lazy"} className="aspect-video w-full object-cover" />
              <span className="absolute bottom-1.5 left-1.5 rounded-md bg-primary/90 px-2 py-0.5 text-[11px] font-semibold text-white">
                {millions(m.budgetMin)} à {millions(m.budgetMax)} M FCFA
              </span>
            </span>
            <span className="block px-2.5 py-1.5 text-xs">
              <span className="font-semibold">{m.code}</span> · {m.bedrooms} ch. · {m.surfaceTotal} m²
            </span>
          </button>
        ))}
      </div>
      <dialog
        ref={dialog}
        onClose={() => setOpen(null)}
        onClick={(e) => e.target === dialog.current && setOpen(null)}
        className="m-auto w-[min(100%-24px,560px)] overflow-hidden rounded-2xl p-0 backdrop:bg-black/70"
        aria-label={open ? `Modèle ${open.code}` : "Modèle"}
      >
        {open ? (
          <div>
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${open.image}?w=960`} alt={`Rendu 3D ${open.code}`} className="aspect-video w-full object-cover" />
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-lg text-white"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>
            <div className="p-5">
              <p className="text-lg font-bold">
                {open.category === "duplex" ? "Duplex" : "Villa"} {open.code}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-background px-3 py-2">
                  <dt className="text-xs text-muted">Chambres</dt>
                  <dd className="font-semibold">{open.bedrooms}</dd>
                </div>
                <div className="rounded-lg bg-background px-3 py-2">
                  <dt className="text-xs text-muted">Niveaux</dt>
                  <dd className="font-semibold">{open.levels === 1 ? "Plain-pied" : `${open.levels} niveaux`}</dd>
                </div>
                <div className="rounded-lg bg-background px-3 py-2">
                  <dt className="text-xs text-muted">Surface habitable</dt>
                  <dd className="font-semibold">{open.surfaceTotal} m²</dd>
                </div>
                <div className="rounded-lg bg-background px-3 py-2">
                  <dt className="text-xs text-muted">Terrain conseillé</dt>
                  <dd className="font-semibold">{open.landArea ? `${open.landArea} m²` : "—"}</dd>
                </div>
              </dl>
              <p className="mt-3 text-sm">
                Budget de construction estimé :{" "}
                <strong className="text-primary">
                  {millions(open.budgetMin)} à {millions(open.budgetMax)} millions FCFA
                </strong>
              </p>
              <p className="mt-3 text-sm text-foreground/75">Ce modèle et 99 autres, classés par budget, sont dans le Guide WooPlans des maisons.</p>
              <div className="cta-pulse mt-4">
                <GuideCheckoutButton
                  label="Recevoir le guide · 1 900 FCFA"
                  ctaId={`guide_modele_${open.code.toLowerCase()}`}
                  price={price}
                  enabled={enabled}
                  className="btn-cta w-full py-4 text-base"
                />
              </div>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
