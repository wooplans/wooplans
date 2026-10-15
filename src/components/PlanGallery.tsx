"use client";

import { useEffect, useRef, useState, type TouchEvent } from "react";

/** Distance minimale (px) pour qu'un glissement horizontal change d'image. */
const SWIPE_MIN_PX = 40;

export function PlanGallery({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const count = images.length;
  const current = images[Math.min(index, count - 1)];

  const go = (delta: number) => setIndex((i) => (i + delta + count) % count);

  // Précharge les images voisines : « Image suivante » s'affiche sans attente.
  useEffect(() => {
    if (count < 2) return;
    for (const i of [index + 1, index - 1]) {
      const img = new Image();
      img.src = images[(i + count) % count];
    }
  }, [index, count, images]);

  // Agrandissement : flèches du clavier et Échap.
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
      else if (e.key === "ArrowRight") setIndex((i) => (i + 1) % count);
      else if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + count) % count);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom, count]);

  if (count === 0) return <div className="aspect-video rounded-2xl bg-outline/40" />;

  const swipe = {
    onTouchStart: (e: TouchEvent) => {
      touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    },
    onTouchEnd: (e: TouchEvent) => {
      const start = touch.current;
      touch.current = null;
      if (!start || count < 2) return;
      const dx = e.changedTouches[0].clientX - start.x;
      const dy = e.changedTouches[0].clientY - start.y;
      if (Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    },
  };

  const arrow = "absolute top-1/2 -translate-y-1/2 grid h-11 w-11 place-items-center rounded-full bg-black/45 text-3xl leading-none text-white";

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-outline/40" {...swipe}>
        <button type="button" onClick={() => setZoom(true)} className="block w-full" aria-label="Agrandir l'image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current} alt={`${alt} — vue ${index + 1}`} className="aspect-video w-full object-cover" fetchPriority="high" decoding="async" />
        </button>
        {count > 1 ? (
          <>
            <button type="button" className={`${arrow} left-2`} aria-label="Image précédente" onClick={() => go(-1)}>‹</button>
            <button type="button" className={`${arrow} right-2`} aria-label="Image suivante" onClick={() => go(1)}>›</button>
            <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/55 px-2.5 py-0.5 text-xs font-medium text-white">
              {index + 1} / {count}
            </span>
          </>
        ) : null}
      </div>
      {count > 1 ? (
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
              <img src={src} alt="" loading="lazy" decoding="async" fetchPriority="low" className="aspect-video w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
      {zoom ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setZoom(false)} {...swipe}>
          <button type="button" className="absolute right-4 top-4 z-10 text-3xl text-white" aria-label="Fermer">×</button>
          {count > 1 ? (
            <>
              <button
                type="button"
                className={`${arrow} left-2 z-10`}
                aria-label="Image précédente"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
              >
                ‹
              </button>
              <button
                type="button"
                className={`${arrow} right-2 z-10`}
                aria-label="Image suivante"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
              >
                ›
              </button>
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/80">
                {index + 1} / {count}
              </span>
            </>
          ) : null}
          {/* Toucher l'image passe à la suivante (les visiteurs tapaient dessus sans effet). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current}
            alt={alt}
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
            onClick={(e) => {
              e.stopPropagation();
              if (count > 1) go(1);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
