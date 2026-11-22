"use client";

import { useEffect } from "react";

/**
 * Suivi de l'extrait en ligne : ouverture de la page (une fois par onglet) et maison regardée. Au premier passage,
 * le navigateur est aussi reconnu pour le prix réservé du catalogue (cookie posé par /api/offre-reservee).
 */
export function ExtraitTracker({ id, slug }: { id: string; slug?: string }) {
  useEffect(() => {
    const send = (type: string) =>
      fetch(`/api/extrait/${encodeURIComponent(id)}/suivi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, slug }),
        keepalive: true,
      }).catch(() => {});
    if (slug) void send("view");
    else {
      try {
        const key = `wp_extrait_open_${id}`;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          void send("open");
        }
      } catch {
        void send("open");
      }
      void fetch("/api/offre-reservee", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intentId: id }) }).catch(() => {});
    }
  }, [id, slug]);
  return null;
}

/** Lien vers un contenu verrouillé ou vers l'offre : clic noté (score d'intérêt) puis page du prix du catalogue. */
export function TrackedLink({
  id,
  type,
  slug,
  href,
  className,
  children,
}: {
  id: string;
  type: "locked" | "offer";
  slug?: string;
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={className}
      data-cta={`mon_extrait_${type}`}
      onClick={() => {
        void fetch(`/api/extrait/${encodeURIComponent(id)}/suivi`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, slug }),
          keepalive: true,
        }).catch(() => {});
      }}
    >
      {children}
    </a>
  );
}
