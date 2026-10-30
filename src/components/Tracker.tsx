"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { FUNNEL_EVENTS, isPrivatePath, pageType, planSlugFromPath } from "@/lib/behavior";
import { phCapture, phRegisterPage } from "@/lib/posthog-browser";
import { pixelTrack } from "@/lib/pixel";

/** Adresse de la page sans fragment (#) : le lien de connexion y transporte le code d'accès. */
const pageUrl = () => window.location.origin + window.location.pathname + window.location.search;

type TrackPayload = { type: string; ctaId?: string; planSlug?: string };

let resolveVisitorId: (id: string | null) => void = () => {};
/** Identifiant first-party du visiteur (cookie wp_vid), renvoyé par /api/t à la première vue. */
export const visitorIdPromise: Promise<string | null> =
  typeof window === "undefined" ? Promise.resolve(null) : new Promise((resolve) => (resolveVisitorId = resolve));

export function track(payload: TrackPayload) {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({ ...payload, url: pageUrl(), referrer: document.referrer || null });
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/t", new Blob([body], { type: "application/json" }));
  } else {
    void fetch("/api/t", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
  }
}

function trackAndIdentify(payload: TrackPayload) {
  const body = JSON.stringify({ ...payload, url: pageUrl(), referrer: document.referrer || null });
  fetch("/api/t", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true })
    .then((res) => res.json() as Promise<{ vid?: string }>)
    .then((data) => resolveVisitorId(data.vid ?? null))
    .catch(() => resolveVisitorId(null));
}

/**
 * Suivi first-party du tunnel : une vue par page, et tout élément portant
 * data-cta="identifiant" est compté comme clic sur un appel à l'action.
 * Les mêmes étapes sont transmises à PostHog (si la mesure est autorisée, voir BehaviorAnalytics).
 */
export function Tracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const firstView = useRef(true);
  const lastPathname = useRef<string | null>(null);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    // Filtres du catalogue : l'URL change sur place, ce n'est pas une nouvelle page (mesuré par catalogue_filter).
    const filterChange = lastPathname.current === pathname && pageType(pathname) === "catalogue";
    lastPathname.current = pathname;
    if (filterChange) return;
    const planSlug = planSlugFromPath(pathname) ?? undefined;
    const type = pathname === "/catalogue-premium" ? "sales_page_view" : planSlug ? "plan_view" : "page_view";
    if (firstView.current) trackAndIdentify({ type, planSlug });
    else track({ type, planSlug });
    if (!isPrivatePath(pathname)) {
      const page = { page_type: pageType(pathname), plan: planSlug ?? null };
      phRegisterPage(page);
      phCapture("$pageview", page);
    }
    // La première vue est envoyée par le script du Pixel lui-même.
    if (!firstView.current) window.fbq?.("track", "PageView");
    // Fiche modèle : ViewContent, pour le reciblage et l'optimisation des publicités Meta.
    if (planSlug && !isPrivatePath(pathname)) pixelTrack("ViewContent", { content_ids: [planSlug], content_type: "product", content_category: "Modèle" });
    firstView.current = false;
  }, [pathname, searchParams]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const el = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-cta],[data-whatsapp]");
      if (!el) return;
      const path = window.location.pathname;
      const context = { page_type: pageType(path), plan: el.dataset.plan || planSlugFromPath(path) };
      if (el.dataset.whatsapp !== undefined) {
        const ctaId = el.dataset.whatsapp || "whatsapp";
        track({ type: "whatsapp_click", ctaId });
        if (!isPrivatePath(path)) phCapture(FUNNEL_EVENTS.whatsapp, { ...context, cta_id: ctaId });
        return;
      }
      track({ type: "cta_click", ctaId: el.dataset.cta, planSlug: el.dataset.plan });
      if (!isPrivatePath(path)) phCapture(FUNNEL_EVENTS.ctaClick, { ...context, cta_id: el.dataset.cta ?? null });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
