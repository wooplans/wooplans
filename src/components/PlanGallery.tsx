"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { phCapture } from "@/lib/posthog-browser";

/**
 * Galerie de la fiche modèle : défilement natif (scroll-snap) au doigt, comme une galerie de téléphone.
 *
 * Avant (campagne Facebook du 7 nov.) : une seule image dont on remplaçait la source. Sur mobile, la flèche « › »
 * semblait sans effet tant que l'image suivante chargeait (577 clics de 45 visiteurs, nombreux clics de rage) et
 * les glissements mal reconnus étaient perdus (68 glissements sans effet). Ici toutes les vues sont posées côte à
 * côte : le doigt fait défiler directement, la flèche fait glisser la vue suivante immédiatement (l'image se
 * dessine pendant le glissement), et les vignettes défilent aussi.
 */
export function PlanGallery({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const count = images.length;
  const track = useRef<HTMLDivElement>(null);
  const zoomTrack = useRef<HTMLDivElement>(null);
  const thumbs = useRef<HTMLDivElement>(null);
  const seen = useRef(new Set<number>([0]));

  /** Fait défiler une piste jusqu'à la vue i (avec bouclage) ; l'index suit via onScroll. */
  const scrollTo = useCallback(
    (el: HTMLDivElement | null, i: number, smooth = true) => {
      if (!el || count === 0) return;
      const target = (i + count) % count;
      el.scrollTo({ left: target * el.clientWidth, behavior: smooth ? "smooth" : "auto" });
      setIndex(target);
    },
    [count],
  );

  const onScroll = (el: HTMLDivElement | null) => {
    if (!el || el.clientWidth === 0) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index && i >= 0 && i < count) setIndex(i);
  };

  // Mesure de l'usage : combien de vues différentes chaque visiteur regarde.
  useEffect(() => {
    if (seen.current.has(index)) return;
    seen.current.add(index);
    phCapture("gallery_view", { position: index + 1, seen: seen.current.size, total: count, zoom });
  }, [index, count, zoom]);

  // La vignette active reste visible dans la bande de vignettes (sans faire défiler la page).
  useEffect(() => {
    const row = thumbs.current;
    const thumb = row?.children[index] as HTMLElement | undefined;
    if (!row || !thumb) return;
    const left = thumb.offsetLeft - row.offsetLeft;
    if (left < row.scrollLeft || left + thumb.offsetWidth > row.scrollLeft + row.clientWidth) {
      row.scrollTo({ left: left - row.clientWidth / 2 + thumb.offsetWidth / 2, behavior: "smooth" });
    }
  }, [index]);

  // Ouverture en plein écran sur la vue courante ; à la fermeture, la galerie de la fiche est sur la même vue.
  useLayoutEffect(() => {
    if (zoom) scrollTo(zoomTrack.current, index, false);
    else scrollTo(track.current, index, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  // Plein écran : page bloquée derrière, flèches du clavier et Échap.
  useEffect(() => {
    if (!zoom) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
      else if (e.key === "ArrowRight") scrollTo(zoomTrack.current, index + 1);
      else if (e.key === "ArrowLeft") scrollTo(zoomTrack.current, index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [zoom, index, scrollTo]);

  if (count === 0) return <div className="aspect-video rounded-2xl bg-outline/40" />;

  const arrow =
    "absolute top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-3xl leading-none text-white shadow transition active:scale-90 active:bg-black/70";
  const trackClass = "no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain";

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-outline/40">
        <div ref={track} className={trackClass} onScroll={() => onScroll(track.current)} aria-roledescription="carrousel" aria-label={alt}>
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setZoom(true)}
              className="w-full shrink-0 snap-center snap-always"
              aria-label={`Agrandir la vue ${i + 1} sur ${count}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`${alt} — vue ${i + 1}`}
                className="aspect-video w-full object-cover"
                // Les deux premières vues sont chargées tout de suite : la flèche « › » affiche la suivante sans attente.
                loading={i < 2 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "low"}
                decoding="async"
                draggable={false}
              />
            </button>
          ))}
        </div>
        {count > 1 ? (
          <>
            <button type="button" className={`${arrow} left-2`} aria-label="Image précédente" onClick={() => scrollTo(track.current, index - 1)}>‹</button>
            <button type="button" className={`${arrow} right-2`} aria-label="Image suivante" onClick={() => scrollTo(track.current, index + 1)}>›</button>
            <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-medium text-white">
              {index + 1} / {count}
            </span>
            {index === 0 ? (
              <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-medium text-white sm:hidden">
                Glissez pour voir les {count} vues
              </span>
            ) : null}
          </>
        ) : null}
      </div>
      {count > 1 ? (
        <div ref={thumbs} className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => scrollTo(track.current, i)}
              className={`w-[18%] shrink-0 overflow-hidden rounded-lg border-2 transition ${i === index ? "border-primary" : "border-transparent opacity-80"}`}
              aria-label={`Voir l'image ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" decoding="async" fetchPriority="low" className="aspect-video w-full object-cover" draggable={false} />
            </button>
          ))}
        </div>
      ) : null}
      {zoom ? (
        <div className="fixed inset-0 z-50 bg-black/95" role="dialog" aria-modal="true" aria-label={alt}>
          <div ref={zoomTrack} className={`${trackClass} h-full`} onScroll={() => onScroll(zoomTrack.current)}>
            {images.map((src, i) => (
              // Toucher à côté de l'image ferme le plein écran ; toucher l'image passe à la suivante.
              <div key={src} className="flex h-full w-full shrink-0 snap-center snap-always items-center justify-center p-4" onClick={() => setZoom(false)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`${alt} — vue ${i + 1}`}
                  className="max-h-[85vh] max-w-full rounded-lg object-contain"
                  loading={Math.abs(i - index) <= 1 ? "eager" : "lazy"}
                  decoding="async"
                  draggable={false}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (count > 1) scrollTo(zoomTrack.current, i + 1);
                  }}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-black/50 text-3xl leading-none text-white"
            aria-label="Fermer"
            onClick={() => setZoom(false)}
          >
            ×
          </button>
          {count > 1 ? (
            <>
              <button type="button" className={`${arrow} left-2`} aria-label="Image précédente" onClick={() => scrollTo(zoomTrack.current, index - 1)}>‹</button>
              <button type="button" className={`${arrow} right-2`} aria-label="Image suivante" onClick={() => scrollTo(zoomTrack.current, index + 1)}>›</button>
              <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm text-white">
                {index + 1} / {count}
              </span>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
