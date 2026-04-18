"use client";

import { useState } from "react";

type PlanGalleryProps = {
  images: string[];
  name: string;
};

export function PlanGallery({ images, name }: PlanGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

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
              <img
                src={img}
                alt={`${name} — vue ${i + 1}`}
                className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                  i === 0 && images.length > 2 ? "aspect-[16/9]" : "aspect-[4/3]"
                }`}
                loading={i === 0 ? "eager" : "lazy"}
              />
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
            className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl leading-none"
            onClick={closeLightbox}
          >
            &times;
          </button>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white text-4xl"
            onClick={(e) => { e.stopPropagation(); goTo(lightboxIndex - 1); }}
          >
            &#8249;
          </button>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white text-4xl"
            onClick={(e) => { e.stopPropagation(); goTo(lightboxIndex + 1); }}
          >
            &#8250;
          </button>
          <img
            src={images[lightboxIndex]}
            alt={`${name} — vue ${lightboxIndex + 1}`}
            className="max-w-[90vw] max-h-[85vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); goTo(i); }}
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
