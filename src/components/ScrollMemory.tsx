"use client";

import { useEffect } from "react";

/**
 * Retour en arrière (catalogue, accueil…) : la page revient exactement à l'endroit du clic.
 * La position est notée au clic sur un lien interne, puis rétablie après un retour (bouton
 * « précédent » du navigateur ou du téléphone), une fois la page précédente réaffichée par Next.
 * Le navigateur seul n'y arrive pas toujours : il restaure avant que la liste soit rendue,
 * et le défilement doux du site rendait ce saut visible.
 */

const STORAGE_KEY = "wp_scroll";
const MAX_ENTRIES = 30;
/** Durée pendant laquelle la position est réappliquée, le temps que Next affiche la page. */
const RESTORE_MS = 1200;
const USER_SCROLL_EVENTS = ["wheel", "touchstart", "keydown", "mousedown"] as const;

const currentUrl = () => window.location.pathname + window.location.search;

function readPositions(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

function savePosition(url: string, y: number) {
  try {
    const positions = readPositions();
    delete positions[url];
    positions[url] = y;
    const urls = Object.keys(positions);
    for (const old of urls.slice(0, Math.max(0, urls.length - MAX_ENTRIES))) delete positions[old];
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // Stockage indisponible (navigation privée) : le navigateur garde sa restauration habituelle.
  }
}

function restorePosition(url: string) {
  const y = readPositions()[url];
  if (y === undefined) return;
  const start = performance.now();
  let stopped = false;
  const stop = () => {
    stopped = true;
    for (const name of USER_SCROLL_EVENTS) window.removeEventListener(name, stop);
  };
  // Le visiteur fait défiler lui-même : on le laisse faire.
  for (const name of USER_SCROLL_EVENTS) window.addEventListener(name, stop, { passive: true, once: true });
  const step = () => {
    if (stopped || currentUrl() !== url) return stop();
    if (Math.abs(window.scrollY - y) > 2) window.scrollTo({ top: y, behavior: "instant" });
    if (performance.now() - start < RESTORE_MS) requestAnimationFrame(step);
    else stop();
  };
  requestAnimationFrame(step);
}

export function ScrollMemory() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.origin !== window.location.origin) return;
      // Ancre de la même page (#faq…) : pas un changement de page.
      if (link.pathname === window.location.pathname && link.search === window.location.search) return;
      savePosition(currentUrl(), window.scrollY);
    };
    const onPopState = () => restorePosition(currentUrl());
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    // Page rechargée par le navigateur lors d'un retour (hors cache) : même restauration.
    const navigation = performance.getEntriesByType?.("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (navigation?.type === "back_forward") restorePosition(currentUrl());
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);
  return null;
}
