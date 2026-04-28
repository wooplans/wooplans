"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { buildFunnelAttribution, type FunnelEventType, type FunnelSessionSnapshot } from "@/lib/funnel";

const STORAGE_KEY = "wooplans-funnel-state";

type StoredFunnelState = FunnelSessionSnapshot;

type FunnelEventPayload = {
  session_id: string;
  source: StoredFunnelState["source"];
  landing_path: string;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fbclid_present: boolean;
  event_type: FunnelEventType;
  path: string;
  cta_id?: string | null;
  metadata?: Record<string, unknown>;
};

type CheckoutStartPayload = Omit<FunnelEventPayload, "event_type" | "path"> & {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  country_code: string;
  discount_code?: string;
  cta_id: string;
};

function canUseBrowserStorage() {
  return typeof window !== "undefined";
}

function getCurrentPath() {
  if (!canUseBrowserStorage()) return "/";
  return `${window.location.pathname}${window.location.search}`;
}

function readStoredState(): StoredFunnelState | null {
  if (!canUseBrowserStorage()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredFunnelState;
  } catch {
    return null;
  }
}

function saveStoredState(state: StoredFunnelState) {
  if (!canUseBrowserStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage failures, tracking remains best-effort.
  }
}

export function getOrCreateFunnelState() {
  const existing = readStoredState();
  if (existing) return existing;

  if (!canUseBrowserStorage()) {
    return null;
  }

  const url = new URL(window.location.href);
  const attribution = buildFunnelAttribution({
    pathname: url.pathname,
    searchParams: url.searchParams,
    referrer: document.referrer || null,
  });

  const state: StoredFunnelState = {
    sessionId: crypto.randomUUID(),
    ...attribution,
  };

  saveStoredState(state);
  return state;
}

function sendPayload(payload: FunnelEventPayload | CheckoutStartPayload) {
  if (!canUseBrowserStorage()) return Promise.resolve(false);

  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    const ok = navigator.sendBeacon(
      "/api/funnel/event",
      new Blob([body], { type: "application/json" }),
    );
    if (ok) return Promise.resolve(true);
  }

  return fetch("/api/funnel/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  })
    .then((response) => response.ok)
    .catch(() => false);
}

export async function trackFunnelEvent(
  eventType: FunnelEventType,
  options: {
    path?: string;
    ctaId?: string | null;
    metadata?: Record<string, unknown>;
  } = {},
) {
  const state = getOrCreateFunnelState();
  if (!state) return false;

  const currentPath = options.path ?? getCurrentPath();
  return sendPayload({
    session_id: state.sessionId,
    source: state.source,
    landing_path: state.landingPath,
    referrer: state.referrer,
    utm_source: state.utmSource,
    utm_medium: state.utmMedium,
    utm_campaign: state.utmCampaign,
    utm_content: state.utmContent,
    utm_term: state.utmTerm,
    fbclid_present: state.fbclidPresent,
    event_type: eventType,
    path: currentPath,
    cta_id: options.ctaId ?? null,
    metadata: options.metadata ?? {},
  });
}

export async function startCheckoutWithFunnelTracking(input: {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  countryCode: string;
  discountCode?: string;
  ctaId: string;
}) {
  const state = getOrCreateFunnelState();
  if (!state) {
    throw new Error("Session de tunnel introuvable");
  }

  const payload: CheckoutStartPayload = {
    session_id: state.sessionId,
    source: state.source,
    landing_path: state.landingPath,
    referrer: state.referrer,
    utm_source: state.utmSource,
    utm_medium: state.utmMedium,
    utm_campaign: state.utmCampaign,
    utm_content: state.utmContent,
    utm_term: state.utmTerm,
    fbclid_present: state.fbclidPresent,
    cta_id: input.ctaId,
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    phone_number: input.phoneNumber,
    country_code: input.countryCode,
    discount_code: input.discountCode?.trim() || undefined,
  };

  const response = await fetch("/api/checkout/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => ({}))) as
    | { checkout_url?: string; redirect_url?: string; step?: string; error?: string; message?: string }
    | Record<string, never>;

  if (!response.ok) {
    throw new Error(
      typeof data.error === "string" && data.error
        ? data.error
        : typeof data.message === "string" && data.message
          ? data.message
          : "Impossible de creer le checkout Chariow",
    );
  }

  const checkoutUrl = typeof data.checkout_url === "string" ? data.checkout_url : "";
  const redirectUrl = typeof data.redirect_url === "string" ? data.redirect_url : "";
  if (!checkoutUrl && data.step === "completed" && redirectUrl) {
    return redirectUrl;
  }

  if (!checkoutUrl) {
    throw new Error("Le checkout Chariow n'a pas renvoye d'URL de paiement");
  }

  return checkoutUrl;
}

export function useFunnelTracker() {
  const lastTrackedPath = useRef<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const query = typeof window !== "undefined" ? window.location.search : "";
    const path = query ? `${pathname}${query}` : pathname;
    if (lastTrackedPath.current === path) return;
    lastTrackedPath.current = path;
    void trackFunnelEvent("page_view", { path });
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("[data-funnel-cta]") : null;
      if (!target) return;

      const ctaId = target.getAttribute("data-funnel-cta");
      if (!ctaId) return;

      void trackFunnelEvent("premium_cta_click", {
        ctaId,
        metadata: {
          href: target instanceof HTMLAnchorElement ? target.href : undefined,
          text: target.textContent?.trim().slice(0, 120) || "",
        },
      });
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
}
