"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

type TrackPayload = { type: string; ctaId?: string; planSlug?: string };

export function track(payload: TrackPayload) {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({ ...payload, url: window.location.href, referrer: document.referrer || null });
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/t", new Blob([body], { type: "application/json" }));
  } else {
    void fetch("/api/t", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
  }
}

/**
 * Suivi first-party du tunnel : une vue par page, et tout élément portant
 * data-cta="identifiant" est compté comme clic sur un appel à l'action.
 */
export function Tracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const firstView = useRef(true);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const planMatch = /^\/catalogue\/([^/]+)$/.exec(pathname);
    const type = pathname === "/catalogue-premium" ? "sales_page_view" : planMatch ? "plan_view" : "page_view";
    track({ type, planSlug: planMatch?.[1] });
    // La première vue est envoyée par le script du Pixel lui-même.
    if (!firstView.current) window.fbq?.("track", "PageView");
    firstView.current = false;
  }, [pathname, searchParams]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const el = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-cta],[data-whatsapp]");
      if (!el) return;
      if (el.dataset.whatsapp !== undefined) {
        track({ type: "whatsapp_click", ctaId: el.dataset.whatsapp || "whatsapp" });
        return;
      }
      track({ type: "cta_click", ctaId: el.dataset.cta, planSlug: el.dataset.plan });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
