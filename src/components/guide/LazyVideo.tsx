"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Vidéo muette en boucle chargée seulement quand elle arrive à l'écran (preload="none") : la vidéo de 5 Mo chargée
 * d'emblée ralentissait l'affichage de la page sur les connexions mobiles (31 % des clics perdus avant l'affichage).
 */
export function LazyVideo({ src, poster, className }: { src: string; poster?: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  // L'image d'attente (60 Ko) ne se charge qu'à l'approche de la vidéo.
  const [near, setNear] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          void video.play().catch(() => {});
        } else video.pause();
      },
      { threshold: 0.01, rootMargin: "200px 0px" },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return <video ref={ref} className={className} src={near ? src : undefined} poster={near ? poster : undefined} muted loop playsInline preload="none" />;
}
