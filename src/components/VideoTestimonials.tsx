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
      <div className={isVertical ? "grid grid-cols-2 gap-3 md:gap-5" : "grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6"}>
        {TESTIMONIAL_VIDEOS.map((video) => (
          <button
            key={video.id}
            onClick={() => setActiveVideo(video.id)}
            className={`group relative bg-background border border-outline/10 rounded-2xl overflow-hidden text-left hover:border-primary/30 transition-colors ${
              isVertical ? "aspect-[9/16]" : "aspect-video"
            }`}
          >
            {video.poster ? (
              <img
                src={video.poster}
                alt={video.title}
                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
              />
            ) : (
              <video
                src={video.url}
                muted
                playsInline
                preload="metadata"
                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
              />
            )}

            {/* Play overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`${isVertical ? "w-11 h-11" : "w-14 h-14"} rounded-full bg-primary/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                <svg className={`${isVertical ? "w-5 h-5" : "w-6 h-6"} ml-0.5`} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>

            {/* Title overlay */}
            <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 to-transparent ${isVertical ? "p-3" : "p-4"}`}>
              <p className={`text-white font-semibold ${isVertical ? "text-xs" : "text-sm"}`}>{video.title}</p>
              <p className="text-white/70 text-xs">{video.subtitle}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Modal */}
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
            className={`${isVertical ? "w-full max-w-sm aspect-[9/16]" : "w-full max-w-3xl aspect-video"} bg-black rounded-2xl overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={active.url}
              controls
              autoPlay
              className="w-full h-full"
            >
              Votre navigateur ne supporte pas la lecture vidéo.
            </video>
          </div>
        </div>
      )}
    </div>
  );
}
