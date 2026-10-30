"use client";

import { useEffect, useRef, useState } from "react";
import { FUNNEL_EVENTS } from "@/lib/behavior";
import { phCapture } from "@/lib/posthog-browser";
import { pixelTrack } from "@/lib/pixel";

/** Étape suivante proposée quand le cadeau a déjà été reçu (2e modèle demandé) : le Catalogue Premium. */
type NextStep = { text: string; href: string; label: string };

type Props = {
  plan: { slug: string; code: string };
  label: string;
  ctaId: string;
  className: string;
};

/**
 * « Recevez gratuitement le plan et devis » : formulaire court (nom, email), document envoyé par email.
 * Point d'entrée de la séquence de bienvenue vers le Catalogue Premium.
 */
export function GiftPlanButton({ plan, label, ctaId, className }: Props) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ message: string; next?: NextStep } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const track = (event: string, properties: Record<string, unknown> = {}) =>
    phCapture(event, { cta_id: ctaId, plan: plan.slug, offer: "cadeau", ...properties });

  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSending(true);
    const form = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const response = await fetch("/api/cadeau", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, slug: plan.slug }),
    }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as { status?: string; message?: string; next?: NextStep; error?: string } | null;
    setSending(false);
    if (!response?.ok || !body?.message) {
      track(FUNNEL_EVENTS.giftError, { status: response?.status ?? "network" });
      setError(body?.error || "L'envoi n'a pas abouti. Réessayez dans un instant.");
      return;
    }
    track(FUNNEL_EVENTS.giftSent, { result: body.status });
    // Contact gagné (premier cadeau de cette adresse) : évènement Lead du Pixel, objectif des publicités Meta.
    if (body.status === "sent") pixelTrack("Lead", { content_name: `Plan et devis ${plan.code}`, content_ids: [plan.slug], content_category: "Plan et devis offert" });
    setDone({ message: body.message, next: body.next });
  }

  return (
    <>
      <button
        type="button"
        data-cta={ctaId}
        data-plan={plan.slug}
        className={className}
        onClick={() => {
          track(FUNNEL_EVENTS.giftFormOpen);
          setOpen(true);
        }}
      >
        {label}
      </button>
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === dialog.current && setOpen(false)}
        className="m-auto w-[min(100%-24px,440px)] rounded-2xl p-0 backdrop:bg-black/60"
        aria-labelledby={`gift-title-${plan.slug}`}
      >
        <div className="grid gap-4 p-5 text-left sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Modèle {plan.code}</p>
              <h2 id={`gift-title-${plan.slug}`} className="mt-1 text-xl font-bold leading-tight">Recevez gratuitement le plan et devis</h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="-mr-2 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg text-muted hover:bg-black/5"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>

          {done ? (
            <div className="grid gap-4">
              <p className="rounded-xl bg-primary/10 px-4 py-3 font-semibold leading-snug text-primary">{done.message}</p>
              {done.next ? (
                <>
                  <p className="text-sm leading-relaxed text-foreground/80">{done.next.text}</p>
                  <a href={done.next.href} data-cta="cadeau_catalogue" data-plan={plan.slug} className="btn-cta w-full py-3.5 text-center text-base">
                    {done.next.label}
                  </a>
                </>
              ) : (
                <p className="text-sm text-muted">L&apos;email part de WOOPLANS. S&apos;il n&apos;arrive pas d&apos;ici quelques minutes, regardez dans vos spams ou l&apos;onglet Promotions.</p>
              )}
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost w-full py-3">
                Continuer la visite
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-4">
              <p className="rounded-xl bg-primary/5 px-4 py-3 text-sm leading-snug text-foreground/80">
                Plan de distribution avec les dimensions, surfaces des pièces et devis détaillé, envoyés par email.
              </p>
              <div>
                <label className="label" htmlFor={`gift-name-${plan.slug}`}>Nom complet</label>
                <input id={`gift-name-${plan.slug}`} name="name" required minLength={2} autoComplete="name" placeholder="Jean Dupont" className="input" />
              </div>
              <div>
                <label className="label" htmlFor={`gift-email-${plan.slug}`}>Email</label>
                <input
                  id={`gift-email-${plan.slug}`}
                  name="email"
                  required
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="vous@exemple.com"
                  className="input"
                />
                <p className="mt-1 text-xs text-muted">Le document vous y est envoyé. Un plan et devis offert par adresse email.</p>
              </div>
              {error ? <p className="rounded-xl bg-secondary/10 px-4 py-3 text-sm text-secondary">{error}</p> : null}
              <button type="submit" disabled={sending} className="btn-cta mt-1 w-full py-3.5 text-base">
                {sending ? "Envoi…" : "Recevoir gratuitement"}
              </button>
              <p className="-mt-1 text-center text-xs text-muted">Vous recevrez aussi nos conseils pour choisir votre plan. Désinscription en un clic.</p>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
