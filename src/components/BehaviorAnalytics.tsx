"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { visitorIdPromise } from "@/components/Tracker";
import { classifySource } from "@/lib/attribution";
import { CONSENT_COOKIE, isPrivatePath, measurementAllowed, readConsent, timeZoneRequiresConsent, type Consent } from "@/lib/behavior";
import { loadPostHog } from "@/lib/posthog-browser";

const CONSENT_MAX_AGE = 60 * 60 * 24 * 395; // 13 mois

/** Un ou plusieurs identifiants séparés par des virgules : chaque événement fbq est envoyé à tous les pixels. */
function loadPixel(pixelIds: string) {
  const ids = pixelIds.split(",").map((id) => id.trim()).filter((id) => /^\d+$/.test(id));
  if (window.fbq || ids.length === 0) return;
  // Code d'installation officiel du Pixel Meta.
  const script = document.createElement("script");
  script.text = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');${ids.map((id) => `fbq('init','${id}');`).join("")}fbq('track','PageView');`;
  document.head.appendChild(script);
}

/** Attribution de la première page vue (source classée comme dans le suivi first-party, campagne UTM). */
function landingAttribution() {
  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source");
  const utmMedium = params.get("utm_medium");
  return {
    wp_source: classifySource({ utmSource, utmMedium, fbclid: params.has("fbclid"), referrer: document.referrer || null }),
    wp_campaign: params.get("utm_campaign"),
  };
}

function whenIdle(callback: () => void) {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    callback();
  };
  for (const name of ["pointerdown", "keydown", "touchstart", "scroll"]) window.addEventListener(name, run, { once: true, passive: true });
  if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 4000);
}

/**
 * Mesure du comportement (PostHog : enregistrements masqués, cartes de chaleur, tunnel) et Pixel Meta.
 * Jamais sur les pages privées ; en Europe (fuseau horaire), seulement après accord via le bandeau.
 */
export function BehaviorAnalytics({ posthogKey, posthogHost, pixelId }: { posthogKey?: string; posthogHost: string; pixelId?: string }) {
  const pathname = usePathname();
  const [banner, setBanner] = useState(false);
  const [consent, setConsent] = useState<Consent | null | undefined>(undefined);
  const started = useRef(false);
  const recordingStopped = useRef(false);
  const landing = useRef<ReturnType<typeof landingAttribution> | null>(null);

  useEffect(() => {
    landing.current = landingAttribution();
    const current = readConsent(document.cookie);
    setConsent(current);
    setBanner(current === null && timeZoneRequiresConsent(Intl.DateTimeFormat().resolvedOptions().timeZone));
  }, []);

  useEffect(() => {
    if (consent === undefined || started.current || isPrivatePath(pathname)) return;
    const requiresConsent = timeZoneRequiresConsent(Intl.DateTimeFormat().resolvedOptions().timeZone);
    if (!measurementAllowed({ requiresConsent, consent })) return;
    started.current = true;
    if (pixelId) loadPixel(pixelId);
    if (!posthogKey) return;
    whenIdle(() => {
      const timeout = new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 3000));
      void Promise.race([visitorIdPromise, timeout]).then((distinctId) => {
        const ph = loadPostHog({ key: posthogKey, host: posthogHost, distinctId, superProperties: {} });
        if (landing.current) ph.register_once(landing.current);
      });
    });
  }, [consent, pathname, pixelId, posthogHost, posthogKey]);

  // Navigation interne vers une page privée : l'enregistrement s'arrête (les événements y sont déjà filtrés).
  useEffect(() => {
    const ph = window.posthog;
    if (!ph || !started.current) return;
    if (isPrivatePath(pathname)) {
      ph.stopSessionRecording();
      recordingStopped.current = true;
    } else if (recordingStopped.current) {
      ph.startSessionRecording();
      recordingStopped.current = false;
    }
  }, [pathname]);

  const choose = (value: Consent) => {
    saveConsent(value);
    setConsent(value);
    setBanner(false);
  };

  if (!banner || isPrivatePath(pathname)) return null;
  return (
    <div role="dialog" aria-label="Mesure d'audience" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-xl bg-white p-4 text-sm shadow-xl ring-1 ring-black/10">
      <p className="text-foreground/80">
        Nous mesurons l&apos;utilisation du site (pages vues, clics, enregistrements anonymisés de navigation) pour l&apos;améliorer.
        Aucune saisie n&apos;est enregistrée. <Link href="/confidentialite" className="underline">En savoir plus</Link>
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={() => choose("denied")} className="rounded-lg px-4 py-2 font-semibold text-foreground/70 ring-1 ring-black/15">
          Refuser
        </button>
        <button type="button" onClick={() => choose("granted")} className="rounded-lg bg-primary px-4 py-2 font-semibold text-white">
          Accepter
        </button>
      </div>
    </div>
  );
}

function saveConsent(value: Consent) {
  document.cookie = `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${CONSENT_MAX_AGE}; SameSite=Lax; Secure`;
}

/** Choix de mesure d'audience modifiable à tout moment (page de confidentialité). */
export function ConsentSettings() {
  const [consent, setConsent] = useState<Consent | null>(null);
  useEffect(() => setConsent(readConsent(document.cookie)), []);
  const choose = (value: Consent) => {
    saveConsent(value);
    if (value === "denied") window.posthog?.opt_out_capturing();
    window.location.reload();
  };
  return (
    <p>
      Votre choix actuel : {consent === "granted" ? "accepté" : consent === "denied" ? "refusé" : "aucun"}.{" "}
      <button type="button" className="underline" onClick={() => choose("granted")}>Accepter</button>
      {" · "}
      <button type="button" className="underline" onClick={() => choose("denied")}>Refuser</button>
    </p>
  );
}
