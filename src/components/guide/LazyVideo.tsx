"use client";

import { useEffect, useRef } from "react";

/**
 * Vidéo muette en boucle chargée seulement quand elle arrive à l'écran (preload="none") : la vidéo de 5 Mo chargée
 * d'emblée ralentissait l'affichage de la page sur les connexions mobiles (31 % des clics perdus avant l'affichage).
 */
export function LazyVideo({ src, poster, className }: { src: string; poster?: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.25 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return <video ref={ref} className={className} src={src} poster={poster} muted loop playsInline preload="none" />;
}
