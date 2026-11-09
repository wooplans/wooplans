"use client";

import { useEffect, useState } from "react";

/**
 * Barre d'achat fixe en bas de l'écran (mobile). Si la fiche contient le bouton de la carte d'offre (#offre-bouton),
 * la barre n'apparaît qu'une fois ce bouton dépassé vers le haut, et disparaît quand on y revient : au début de la
 * fiche, l'offre est déjà à l'écran et la barre la cachait. Sans ce bouton (autres offres), la barre est toujours là.
 */
export function StickyOfferBar({ children }: { children: React.ReactNode }) {
  const [shown, setShown] = useState(false);
  const [watching, setWatching] = useState(true);

  useEffect(() => {
    const target = document.getElementById("offre-bouton");
    if (!target || typeof IntersectionObserver === "undefined") {
      setWatching(false);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setShown(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const visible = !watching || shown;
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-20 border-t border-outline bg-surface/95 px-3 pb-3 pt-2 backdrop-blur transition-transform duration-300 sm:hidden ${
        visible ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
      aria-hidden={!visible}
      inert={!visible}
    >
      {children}
    </div>
  );
}
