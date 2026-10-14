"use client";

import { useState } from "react";

export function PlanGallery({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  if (images.length === 0) return <div className="aspect-[4/3] rounded-2xl bg-outline/40" />;
  const current = images[Math.min(index, images.length - 1)];

  return (
    <div>
      <button type="button" onClick={() => setZoom(true)} className="block w-full overflow-hidden rounded-2xl bg-outline/40" aria-label="Agrandir l'image">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current} alt={`${alt} — vue ${index + 1}`} className="aspect-[4/3] w-full object-cover" fetchPriority="high" />
      </button>
      {images.length > 1 ? (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.slice(0, 10).map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setIndex(i)}
              className={`overflow-hidden rounded-lg border-2 ${i === index ? "border-primary" : "border-transparent"}`}
              aria-label={`Voir l'image ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" className="aspect-square w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
      {zoom ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setZoom(false)}>
          <button type="button" className="absolute right-4 top-4 text-3xl text-white" aria-label="Fermer">×</button>
          {images.length > 1 ? (
            <>
              <button
                type="button"
                className="absolute left-2 top-1/2 -translate-y-1/2 p-4 text-4xl text-white"
                aria-label="Image précédente"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex((i) => (i - 1 + images.length) % images.length);
                }}
              >
                ‹
              </button>
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-4 text-4xl text-white"
                aria-label="Image suivante"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex((i) => (i + 1) % images.length);
                }}
              >
                ›
              </button>
            </>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current} alt={alt} className="max-h-[90vh] max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      ) : null}
    </div>
  );
}
