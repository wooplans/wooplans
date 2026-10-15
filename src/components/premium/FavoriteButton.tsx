"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function FavoriteButton({ planId, initial, compact = false }: { planId: string; initial: boolean; compact?: boolean }) {
  const [favorite, setFavorite] = useState(initial);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function toggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const next = !favorite;
    setFavorite(next);
    const res = await fetch("/api/premium/favoris", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId, favorite: next }),
    }).catch(() => null);
    if (!res?.ok) setFavorite(!next);
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={favorite}
      aria-label={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
      className={
        compact
          ? `flex h-9 w-9 items-center justify-center rounded-full bg-surface/95 text-lg shadow ${favorite ? "text-secondary" : "text-muted"}`
          : `btn-ghost ${favorite ? "border-secondary text-secondary" : ""}`
      }
    >
      <span aria-hidden>{favorite ? "♥" : "♡"}</span>
      {compact ? null : favorite ? "Dans mes favoris" : "Ajouter aux favoris"}
    </button>
  );
}
