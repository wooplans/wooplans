"use client";

import { useEffect, useState } from "react";
import { phCapture } from "@/lib/posthog-browser";
import { TESTIMONIALS } from "@/lib/testimonials";

/**
 * Témoignages vidéo. variant="row" (fiche modèle) : une rangée qui défile au doigt, moins haute que la grille,
 * et les vidéos ne sont demandées qu'après le chargement de la page (rien ne concurrence la galerie).
 */
export function Testimonials({ variant = "grid", source = "home" }: { variant?: "grid" | "row"; source?: string }) {
  const [active, setActive] = useState<string | null>(null);
  const [ready, setReady] = useState(variant === "grid");
  const current = TESTIMONIALS.find((t) => t.id === active);
  useEffect(() => {
    if (ready) return;
    if (document.readyState === "complete") return setReady(true);
    const onLoad = () => setReady(true);
    window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, [ready]);
  const row = variant === "row";
  return (
    <>
      <div className={row ? "no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-4 md:px-0" : "grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5"}>
        {TESTIMONIALS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              phCapture("testimonial_open", { id: t.id, source });
              setActive(t.id);
            }}
            className={`group relative aspect-[9/16] overflow-hidden rounded-2xl bg-black text-left ${row ? "w-[40%] shrink-0 md:w-auto" : ""}`}
            aria-label={`Voir le témoignage de ${t.name}`}
          >
            {t.poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.poster} alt="" loading={row ? "lazy" : undefined} className="h-full w-full object-cover" />
            ) : ready ? (
              <video src={`${t.video}#t=1`} muted playsInline preload="metadata" className="h-full w-full object-cover opacity-85" />
            ) : null}
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/25 text-white backdrop-blur transition-transform group-hover:scale-110">
                <svg viewBox="0 0 24 24" className="h-6 w-6 translate-x-0.5" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </span>
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 text-white">
              <span className="block text-sm font-semibold">{t.name}</span>
              <span className="block text-xs text-white/75">{row ? t.location : t.quote}</span>
            </span>
          </button>
        ))}
      </div>
      {current ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setActive(null)}>
          <button type="button" className="absolute right-4 top-4 text-3xl text-white" aria-label="Fermer" onClick={() => setActive(null)}>
            ×
          </button>
          <video src={current.video} poster={current.poster} controls autoPlay playsInline className="max-h-[85vh] w-full max-w-sm rounded-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      ) : null}
    </>
  );
}
