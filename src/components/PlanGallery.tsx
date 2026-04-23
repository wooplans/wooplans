"use client";

import Image from "next/image";
import { useRef, useState } from "react";

type PlanGalleryProps = {
  images: string[];
  name: string;
};

export function PlanGallery({ images, name }: PlanGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  if (images.length === 0) {
    return null;
  }

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => setLightboxOpen(false);

  const goTo = (index: number) => {
    setLightboxIndex((index + images.length) % images.length);
  };

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current;
    touchStartRef.current = null;

    if (!start || images.length < 2) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const isHorizontalSwipe = Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5;

    if (!isHorizontalSwipe) return;

    goTo(deltaX < 0 ? lightboxIndex + 1 : lightboxIndex - 1);
  }

  return (
    <>
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-lg font-semibold text-foreground mb-5 tracking-tight">
          Vues 3D
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {images.slice(0, 4).map((img, i) => (
            <button
              key={i}
              onClick={() => openLightbox(i)}
              className="relative overflow-hidden bg-surface group cursor-pointer border border-outline/10 rounded-2xl"
            >
              <div className={i === 0 && images.length > 2 ? "aspect-[16/9]" : "aspect-[4/3]"}>
                <Image
                  src={img}
                  alt={`${name} — vue ${i + 1}`}
                  width={1200}
                  height={900}
                  sizes="(min-width: 768px) 50vw, 100vw"
                  quality={55}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  priority={i === 0}
                />
              </div>
              {i === 3 && images.length > 4 && (
                <div className="absolute inset-0 bg-foreground/60 flex items-center justify-center">
                  <span className="text-white text-lg font-semibold">
                    +{images.length - 4} photos
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl leading-none"
            onClick={closeLightbox}
            aria-label="Fermer"
          >
            &times;
          </button>
          <button
            type="button"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white text-4xl"
            onClick={(e) => {
              e.stopPropagation();
              goTo(lightboxIndex - 1);
            }}
            aria-label="Image precedente"
          >
            &#8249;
          </button>
          <button
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white text-4xl"
            onClick={(e) => {
              e.stopPropagation();
              goTo(lightboxIndex + 1);
            }}
            aria-label="Image suivante"
          >
            &#8250;
          </button>
          <div
            className="relative w-[90vw] h-[85vh] max-w-5xl touch-pan-y"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <Image
              src={images[lightboxIndex]}
              alt={`${name} — vue ${lightboxIndex + 1}`}
              fill
              sizes="90vw"
              quality={70}
              className="object-contain"
            />
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, i) => (
              <button
                type="button"
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(i);
                }}
                aria-label={`Voir l'image ${i + 1}`}
                className={`w-3 h-3 transition-colors ${
                  i === lightboxIndex ? "bg-primary" : "bg-white/30"
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
