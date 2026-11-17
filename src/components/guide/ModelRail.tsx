"use client";

import { useEffect, useRef, useState } from "react";
import { GuideCheckoutButton } from "@/components/guide/GuideCheckoutButton";
import type { GuideModel } from "@/components/guide/GuideModelGrid";
import { phCapture } from "@/lib/posthog-browser";

const millions = (v: number | null) => (v === null ? "" : (v / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 }));

/**
 * « Notre top 20, en grand » (même galerie que la page de vente du Catalogue Premium) : défilement horizontal, une
 * maison s'ouvre en grand au toucher, puis une carte « +N autres modèles ». Sert de teaser sur la page de l'extrait.
 */
export function ModelRail({ models, total, price, enabled }: { models: GuideModel[]; total: number; price: number; enabled: boolean }) {
  const [open, setOpen] = useState<GuideModel | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  const rest = total - models.length;

  return (
    <>
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 md:mx-0 md:px-0">
        {models.map((m) => (
          <button
            key={m.slug}
            type="button"
            onClick={() => {
              phCapture("extrait_rail_open", { plan: m.slug });
              setOpen(m);
            }}
            className="w-[78%] max-w-[300px] shrink-0 snap-start overflow-hidden rounded-2xl border border-outline bg-white text-left shadow-sm md:w-[31%]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${m.image}?w=480`} alt={`Rendu 3D ${m.code}`} width={480} height={300} loading="lazy" decoding="async" className="aspect-[16/10] w-full bg-[#E7ECEF] object-cover" />
            <span className="block px-3.5 pb-3.5 pt-3">
              <span className="block text-[11px] font-extrabold uppercase tracking-wider text-secondary">{m.category === "duplex" ? "Duplex" : "Villa"}</span>
              <span className="block text-[17px] font-bold">{m.code}</span>
              <span className="block text-[13px] text-muted">
                {m.bedrooms} chambres · {m.levels === 1 ? "plain-pied" : `${m.levels} niveaux`} · {m.surfaceTotal} m²
              </span>
              {m.budgetMin && m.budgetMax ? (
                <span className="mt-2 block text-[13px] font-extrabold text-primary">
                  Budget indicatif : {millions(m.budgetMin)} à {millions(m.budgetMax)} M FCFA
                </span>
              ) : null}
            </span>
          </button>
        ))}
        {rest > 0 ? (
          <div className="grid w-[78%] max-w-[300px] shrink-0 snap-start place-items-center rounded-2xl bg-primary p-5 text-center text-white md:w-[31%]">
            <div className="grid gap-1.5">
              <b className="text-[42px] leading-none text-highlight">+{rest}</b>
              <span className="text-[15px] font-bold">autres modèles dans le Catalogue Premium</span>
            </div>
          </div>
        ) : null}
      </div>
      <dialog
        ref={dialog}
        onClose={() => setOpen(null)}
        onClick={(e) => e.target === dialog.current && setOpen(null)}
        className="m-auto w-[min(100%-24px,720px)] overflow-hidden rounded-2xl p-0 backdrop:bg-black/70"
        aria-label={open ? `Modèle ${open.code}` : "Modèle"}
      >
        {open ? (
          <div>
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${open.image}?w=960`} alt={`Rendu 3D ${open.code}`} className="aspect-video w-full object-cover" />
              <button type="button" onClick={() => setOpen(null)} className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-lg text-white" aria-label="Fermer">
                ✕
              </button>
            </div>
            <div className="p-5">
              <p className="text-lg font-bold">
                {open.category === "duplex" ? "Duplex" : "Villa"} {open.code} · {open.bedrooms} chambres · {open.surfaceTotal} m²
              </p>
              {open.budgetMin && open.budgetMax ? (
                <p className="mt-1 text-sm">
                  Budget de construction estimé : <strong className="text-primary">{millions(open.budgetMin)} à {millions(open.budgetMax)} millions FCFA</strong>
                </p>
              ) : null}
              <p className="mt-3 text-sm text-foreground/75">
                Son plan de distribution et son devis poste par poste sont dans le Catalogue Premium. Découvrez ce format avec l&apos;extrait : 5 maisons complètes.
              </p>
              <div className="cta-pulse mt-4">
                <GuideCheckoutButton
                  offer="extrait"
                  label={`Recevoir l'extrait · ${price.toLocaleString("fr-FR").replace(/ | /g, " ")} FCFA`}
                  ctaId={`extrait_rail_${open.code.toLowerCase()}`}
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
