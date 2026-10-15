import { filterEvent } from "@/lib/behavior";

type PostHogStub = unknown[] & {
  _i?: unknown[];
  __SV?: number;
  people?: unknown[];
  [method: string]: unknown;
};

export type PostHog = {
  capture: (event: string, properties?: Record<string, unknown>) => void;
  register: (properties: Record<string, unknown>) => void;
  register_once: (properties: Record<string, unknown>) => void;
  startSessionRecording: () => void;
  stopSessionRecording: () => void;
  opt_out_capturing: () => void;
};

declare global {
  interface Window {
    posthog?: PostHog;
  }
}

const STUB_METHODS = ["capture", "register", "register_once", "startSessionRecording", "stopSessionRecording", "opt_out_capturing"];

/**
 * Charge PostHog (script officiel array.js) : les appels faits avant le chargement sont mis en file
 * puis rejoués. L'identifiant est celui du suivi first-party (wp_vid), pour relier les achats serveur.
 */
const pending: [string, Record<string, unknown>][] = [];

/** Capture un événement ; avant le chargement de PostHog (consentement, chargement différé), il est mis en attente. */
export function phCapture(event: string, properties: Record<string, unknown> = {}) {
  if (window.posthog) window.posthog.capture(event, properties);
  else if (pending.length < 50) pending.push([event, properties]);
}

export function loadPostHog(opts: { key: string; host: string; distinctId: string | null; superProperties: Record<string, unknown> }) {
  if (window.posthog) return window.posthog;
  const stub = [] as unknown as PostHogStub;
  stub._i = [];
  stub.__SV = 1;
  stub.people = [];
  for (const method of STUB_METHODS) {
    stub[method] = (...args: unknown[]) => {
      stub.push([method, ...args]);
    };
  }
  stub._i.push([
    opts.key,
    {
      api_host: opts.host,
      person_profiles: "identified_only",
      capture_pageview: false,
      capture_pageleave: true,
      autocapture: true,
      enable_heatmaps: true,
      capture_dead_clicks: true,
      disable_surveys: true,
      ...(opts.distinctId ? { bootstrap: { distinctID: opts.distinctId } } : {}),
      session_recording: { maskAllInputs: true, maskTextSelector: "[data-ph-mask]" },
      before_send: (event: { event?: string; properties?: Record<string, unknown> } | null) => filterEvent(event, window.location.pathname),
    },
  ]);
  window.posthog = stub as unknown as PostHog;
  window.posthog.register(opts.superProperties);
  for (const [event, properties] of pending.splice(0)) window.posthog.capture(event, properties);

  const script = document.createElement("script");
  script.async = true;
  script.crossOrigin = "anonymous";
  script.src = `${opts.host.replace(".i.posthog.com", "-assets.i.posthog.com")}/static/array.js`;
  document.head.appendChild(script);
  return window.posthog;
}
