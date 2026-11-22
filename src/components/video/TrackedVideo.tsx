"use client";

import { useEffect, useRef } from "react";

function send(video: string, event: string) {
  void fetch("/api/video/suivi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ video, event }),
    keepalive: true,
  }).catch(() => {});
}

/** Ouverture de la page vidéo (une fois par onglet). */
export function VideoOpen({ video }: { video: string }) {
  useEffect(() => {
    try {
      const key = `wp_video_open_${video}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    send(video, "open");
  }, [video]);
  return null;
}

/** Lecteur suivi : lecture, moitié, fin (une fois chacun). */
export function TrackedVideo({ video, src, poster, className }: { video: string; src: string; poster?: string; className?: string }) {
  const sent = useRef(new Set<string>());
  const once = (event: string) => {
    if (sent.current.has(event)) return;
    sent.current.add(event);
    send(video, event);
  };
  return (
    <video
      className={className}
      controls
      playsInline
      preload="metadata"
      poster={poster}
      onPlay={() => once("play")}
      onTimeUpdate={(e) => {
        const v = e.currentTarget;
        if (v.duration && v.currentTime / v.duration >= 0.5) once("half");
      }}
      onEnded={() => once("end")}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}

/** Bouton vers l'offre : clic noté. */
export function VideoCta({ video, href, className, children }: { video: string; href: string; className?: string; children: React.ReactNode }) {
  return (
    <a href={href} className={className} data-cta={`video_${video}`} onClick={() => send(video, "cta")}>
      {children}
    </a>
  );
}
