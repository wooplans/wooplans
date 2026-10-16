"use client";

import { useEffect } from "react";

/**
 * Dissuade l'enregistrement des images du catalogue (visiteurs et espace Premium) :
 * clic droit, glisser-déposer et appui long désactivés sur les images. L'admin n'est pas concerné.
 * Ce n'est pas une protection absolue (capture d'écran, outils du navigateur) : les
 * distributions Premium sont en plus filigranées au nom du membre côté serveur.
 */
export function ImageGuard() {
  useEffect(() => {
    const isImage = (target: EventTarget | null) =>
      target instanceof Element && !window.location.pathname.startsWith("/admin") && (target.tagName === "IMG" || target.tagName === "PICTURE" || target.closest("picture, [data-protect]") !== null);
    const block = (event: Event) => {
      if (isImage(event.target)) event.preventDefault();
    };
    document.addEventListener("contextmenu", block, { capture: true });
    document.addEventListener("dragstart", block, { capture: true });
    return () => {
      document.removeEventListener("contextmenu", block, { capture: true });
      document.removeEventListener("dragstart", block, { capture: true });
    };
  }, []);
  return null;
}
