"use client";

import { useOffre } from "@/components/LocalPrice";

/**
 * Affiché seulement si le visiteur a une offre « plan et devis + Catalogue Premium offert » active
 * (selon le lien de la pub ou son pays) : jamais de bonus annoncé à qui paierait le plan et devis seul.
 */
export function IfOffre({ children }: { children: React.ReactNode }) {
  return useOffre() ? <>{children}</> : null;
}
