"use client";

import { useState } from "react";
import { TESTIMONIALS } from "@/lib/testimonials";

export function Testimonials() {
  const [active, setActive] = useState<string | null>(null);
  const current = TESTIMONIALS.find((t) => t.id === active);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        {TESTIMONIALS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id)}
            className="group relative aspect-[9/16] overflow-hidden rounded-2xl bg-black text-left"
            aria-label={`Voir le témoignage de ${t.name}`}
          >
            <video src={`${t.video}#t=1`} muted playsInline preload="metadata" className="h-full w-full object-cover opacity-85" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/25 text-white backdrop-blur transition-transform group-hover:scale-110">
                <svg viewBox="0 0 24 24" className="h-6 w-6 translate-x-0.5" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </span>
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 text-white">
              <span className="block text-sm font-semibold">{t.name}</span>
              <span className="block text-xs text-white/75">{t.quote}</span>
            </span>
          </button>
        ))}
      </div>
      {current ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setActive(null)}>
          <button type="button" className="absolute right-4 top-4 text-3xl text-white" aria-label="Fermer" onClick={() => setActive(null)}>
            ×
          </button>
          <video src={current.video} controls autoPlay playsInline className="max-h-[85vh] w-full max-w-sm rounded-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      ) : null}
    </>
  );
}
