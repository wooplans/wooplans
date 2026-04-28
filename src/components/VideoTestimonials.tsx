"use client";

import { useState } from "react";
import { TESTIMONIAL_VIDEOS, hasTestimonialVideos } from "@/lib/testimonials";

type VideoTestimonialsProps = {
  variant?: "landscape" | "vertical";
};

export function VideoTestimonials({ variant = "landscape" }: VideoTestimonialsProps) {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  if (!hasTestimonialVideos()) {
    return null;
  }

  const active = TESTIMONIAL_VIDEOS.find((t) => t.id === activeVideo);
  const isVertical = variant === "vertical";

  return (
    <div>
      <div
        className={
          isVertical ? "grid grid-cols-2 gap-3 md:gap-5" : "grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6"
        }
      >
        {TESTIMONIAL_VIDEOS.map((video) => (
          <button
            key={video.id}
            type="button"
            onClick={() => setActiveVideo(video.id)}
            aria-label={`Voir le témoignage vidéo : ${video.title}`}
            className={`group relative overflow-hidden rounded-2xl border border-outline/10 bg-background text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-2xl hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              isVertical ? "aspect-[9/16]" : "aspect-video"
            }`}
          >
            {video.poster ? (
              <img
                src={video.poster}
                alt={video.title}
                className="h-full w-full object-cover opacity-90 transition-opacity duration-300 group-hover:opacity-100"
              />
            ) : (
              <video
                src={video.url}
                muted
                playsInline
                preload="metadata"
                className="h-full w-full object-cover opacity-90 transition-opacity duration-300 group-hover:opacity-100"
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-white">
                <div
                  className={`relative flex items-center justify-center rounded-full bg-white/18 shadow-[0_0_0_1px_rgba(255,255,255,0.16),0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-md transition-transform duration-300 group-hover:scale-110 ${
                    isVertical ? "h-14 w-14" : "h-16 w-16"
                  }`}
                >
                  <span className="absolute inset-0 rounded-full border border-white/30 opacity-80" />
                  <span className="absolute inset-0 rounded-full bg-white/10 animate-ping" />
                  <svg
                    className={`${isVertical ? "h-6 w-6" : "h-7 w-7"} translate-x-0.5`}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <span
                  className={`rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/95 backdrop-blur-sm transition-colors duration-300 group-hover:bg-black/45 ${
                    isVertical ? "hidden sm:inline-flex" : "inline-flex"
                  }`}
                >
                  Voir le témoignage
                </span>
              </div>
            </div>

            <div
              className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent ${
                isVertical ? "p-3" : "p-4"
              }`}
            >
              <p className={`font-semibold text-white ${isVertical ? "text-xs" : "text-sm"}`}>
                {video.title}
              </p>
              <p className="text-xs text-white/75">{video.subtitle}</p>
            </div>
          </button>
        ))}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setActiveVideo(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 text-3xl leading-none text-white/80 hover:text-white"
            onClick={() => setActiveVideo(null)}
            aria-label="Fermer"
          >
            &times;
          </button>
          <div
            className={`${
              isVertical ? "aspect-[9/16] w-full max-w-sm" : "aspect-video w-full max-w-3xl"
            } overflow-hidden rounded-2xl bg-black`}
            onClick={(e) => e.stopPropagation()}
          >
            <video src={active.url} controls autoPlay className="h-full w-full">
              Votre navigateur ne supporte pas la lecture vidéo.
            </video>
          </div>
        </div>
      )}
    </div>
  );
}
