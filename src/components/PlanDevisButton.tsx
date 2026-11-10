"use client";

import { useEffect, useRef, useState } from "react";
import projet from "@/config/projet.json";
import { offrePrice, planDevisPrice, useOffre, useRemise, useVisitorCountry } from "@/components/LocalPrice";
import { formatLocalAmount } from "@/lib/local-price";
import { FUNNEL_EVENTS } from "@/lib/behavior";
import { pixelTrack } from "@/lib/pixel";
import { phCapture } from "@/lib/posthog-browser";
import { currentPromoCode, paidBuyer, rememberBuyer, storedBuyer, usePromoCode, type Buyer } from "@/components/PromoCode";
import { upsellPrice } from "@/lib/upsell";
import { relanceDiscount } from "@/lib/offres";
import { PriceCountdown } from "@/components/PriceCountdown";
import { PHONE_COUNTRIES, phoneCountryOrDefault, type PhoneCountryCode as CountryCode } from "@/lib/phone";

/** Retire l'indicatif s'il a été saisi (+237…, 00237…) : le serveur attend le numéro national. */
/** Lien ?achat=1 (offre aux clients) : un seul formulaire s'ouvre, même si la fiche a plusieurs boutons. */
let autoOpenClaimed = false;

function nationalNumber(raw: string, dial: string) {
  const digits = raw.replace(/\D/g, "");
  const prefix = dial.replace("+", "");
  if (raw.trim().startsWith("+") && digits.startsWith(prefix)) return digits.slice(prefix.length);
  if (digits.startsWith(`00${prefix}`)) return digits.slice(prefix.length + 2);
  return digits;
}

type Props = {
  plan: { slug: string; code: string };
  label: React.ReactNode;
  ctaId: string;
  className: string;
  /** Paiement en ligne indisponible (produit Chariow non configuré) : le bouton ouvre WhatsApp. */
  fallbackHref?: string;
};

/**
 * Achat du plan et devis d'un modèle : formulaire court (nom, email, numéro) puis paiement Chariow ou Wajub.
 * Le modèle est enregistré avec l'achat, ce qui permet de livrer le bon document.
 */
export function PlanDevisButton({ plan, label, ctaId, className, fallbackHref }: Props) {
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState<CountryCode>("CM");
  const countryChosen = useRef(false);
  // Pays du visiteur (la page est en cache, partagée entre pays) : présélectionne l'indicatif tant que le
  // visiteur n'a pas choisi lui-même, et fixe le prix local affiché (celui du paiement Chariow).
  const visitorCountry = useVisitorCountry();
  // Offre « plan et devis + Catalogue Premium offert » (selon la pub ou le pays) : son prix remplace celui du plan seul.
  const offre = useOffre();
  // Lien du dernier email de relance (?remise=…) : prix réduit affiché, code rempli dans le formulaire.
  const remiseCode = useRemise();
  // Pas de réduction sur l'offre spéciale 19k : le code n'est ni affiché ni rempli.
  const remise = offre && relanceDiscount(offre.id) ? remiseCode : null;
  const local = offre ? offrePrice(offre, remise) : planDevisPrice(countryChosen.current ? country : visitorCountry ?? country);
  const [, , dial, example] = PHONE_COUNTRIES.find(([c]) => c === country) ?? PHONE_COUNTRIES[0];
  const [promoOpen, setPromoOpen] = useState(false);
  // Offre aux clients : code mémorisé (lien reçu par email ou WhatsApp) et coordonnées du premier achat.
  const promo = usePromoCode();
  const promoPrice = promo && !offre ? upsellPrice(local) : null;
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  // Paiement direct en cours (client déjà payé sur cet appareil).
  const [direct, setDirect] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  // Mesure du formulaire : quels champs ont été touchés avant l'abandon (jamais leur contenu).
  const openedAt = useRef(0);
  const touched = useRef<string[]>([]);
  const submitted = useRef(false);
  const track = (event: string, properties: Record<string, unknown> = {}) =>
    phCapture(event, { cta_id: ctaId, plan: plan.slug, offer: offre ? `catalogue_offert_${offre.id}` : "plan_devis", ...properties });

  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);

  // Page quittée formulaire ouvert (retour arrière, autre appli) : compté comme une fermeture.
  useEffect(() => {
    if (!open) return;
    const onLeave = () => closed(true);
    window.addEventListener("pagehide", onLeave);
    return () => window.removeEventListener("pagehide", onLeave);
  });

  function closed(pageLeft = false) {
    if (!openedAt.current || submitted.current) return;
    track(FUNNEL_EVENTS.planDevisFormClose, { open_ms: Date.now() - openedAt.current, fields: touched.current, page_left: pageLeft });
    openedAt.current = 0;
  }

  useEffect(() => {
    const saved = storedBuyer();
    if (saved) {
      setBuyer(saved);
      const code = PHONE_COUNTRIES.find(([c]) => c === saved.countryCode)?.[0];
      if (code) {
        countryChosen.current = true;
        setCountry(code);
      }
    }
    if (!autoOpenClaimed && new URLSearchParams(window.location.search).get("achat") === "1") {
      autoOpenClaimed = true;
      // « Obtenir ce plan » depuis /merci : client déjà payé sur cet appareil → paiement direct.
      const buyer = paidBuyer();
      if (buyer) {
        void directCheckout(buyer);
      } else {
        openedAt.current = Date.now();
        track(FUNNEL_EVENTS.planDevisFormOpen, { auto: true });
        setOpen(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (visitorCountry && !countryChosen.current) setCountry(phoneCountryOrDefault(visitorCountry));
  }, [visitorCountry]);

  if (fallbackHref) {
    return (
      <a href={fallbackHref} target="_blank" rel="noopener noreferrer" data-cta={ctaId} data-plan={plan.slug} className={className}>
        {label}
      </a>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    // Un seul champ « Nom complet » (3 champs au lieu de 5) ; l'API le découpe en prénom / nom pour Chariow.
    await startCheckout({ ...form, name: (form.name || "").trim(), phone: nationalNumber(form.phone || "", dial) });
  }

  /**
   * Client qui a déjà payé un plan et devis sur cet appareil : le bouton ouvre directement le paiement
   * (mêmes nom, email et numéro, code de l'offre si actif). En cas d'erreur, le formulaire s'ouvre avec le message.
   */
  async function directCheckout(buyer: NonNullable<ReturnType<typeof paidBuyer>>) {
    setDirect(true);
    track(FUNNEL_EVENTS.planDevisFormOpen, { direct: true });
    const promoCode = currentPromoCode();
    const ok = await startCheckout({ ...buyer, ...(promoCode ? { discountCode: promoCode } : {}) });
    if (!ok) {
      setDirect(false);
      openedAt.current = Date.now();
      setOpen(true);
    }
  }

  async function startCheckout(data: Record<string, string>): Promise<boolean> {
    setError(null);
    setSending(true);
    // Essai Wajub : ?paiement=wajub sur la fiche (sinon le cookie posé par la page de vente, ou le réglage du site).
    const provider = new URLSearchParams(window.location.search).get("paiement") || undefined;
    const response = await fetch("/api/plan-devis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, slug: plan.slug, provider, offre: offre?.id }),
    }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as { url?: string; mode?: string; error?: string; metaEventId?: string | null } | null;
    if (!response?.ok || !body?.url) {
      track(FUNNEL_EVENTS.planDevisError, { status: response?.status ?? "network" });
      setError(body?.error || "Le paiement n'a pas pu démarrer. Réessayez ou écrivez-nous sur WhatsApp.");
      setSending(false);
      return false;
    }
    // Adresse du propriétaire : le document se télécharge directement, rien n'est mesuré.
    if (body.mode === "owner") {
      submitted.current = true;
      window.location.href = body.url;
      setSending(false);
      setDirect(false);
      setOpen(false);
      return true;
    }
    // Aucune saisie transmise : seulement l'étape franchie et le modèle.
    submitted.current = true;
    phCapture(FUNNEL_EVENTS.checkoutOpen, { cta_id: ctaId, mode: "redirect", plan: plan.slug, offer: offre ? `catalogue_offert_${offre.id}` : "plan_devis", provider: body.mode === "wajub" ? "wajub" : "chariow" });
    // Pixel Meta : paiement réellement créé ; même event_id que l'API de conversion (un seul évènement compté).
    pixelTrack("InitiateCheckout", { content_name: `Plan et devis ${plan.code}`, content_ids: [plan.code], content_type: "product", value: offre?.price ?? projet.price, currency: "XAF" }, body.metaEventId);
    rememberBuyer({ name: data.name, email: data.email, phone: data.phone, countryCode: data.countryCode });
    const url = body.url;
    setTimeout(() => {
      window.location.href = url;
    }, 300);
    return true;
  }

  return (
    <>
      <button
        type="button"
        data-cta={ctaId}
        data-plan={plan.slug}
        className={className}
        disabled={direct}
        onClick={() => {
          const buyer = paidBuyer();
          if (buyer) {
            void directCheckout(buyer);
            return;
          }
          openedAt.current = Date.now();
          touched.current = [];
          submitted.current = false;
          track(FUNNEL_EVENTS.planDevisFormOpen);
          setOpen(true);
        }}
      >
        {direct ? "Ouverture du paiement…" : label}
      </button>
      <dialog
        ref={dialog}
        onClose={() => {
          closed();
          setOpen(false);
        }}
        onClick={(e) => e.target === dialog.current && setOpen(false)}
        className="m-auto w-[min(100%-24px,440px)] rounded-2xl p-0 backdrop:bg-black/60"
        aria-labelledby={`pd-title-${plan.slug}`}
      >
        <form
          key={buyer ? "prerempli" : "vide"}
          onSubmit={onSubmit}
          onFocusCapture={(e) => {
            const field = (e.target as Element).getAttribute("name");
            if (!field || touched.current.includes(field)) return;
            touched.current.push(field);
            track(FUNNEL_EVENTS.planDevisField, { field, order: touched.current.length });
          }}
          onInvalidCapture={(e) => track(FUNNEL_EVENTS.planDevisInvalid, { field: (e.target as Element).getAttribute("name") })}
          className="grid gap-4 p-5 text-left sm:p-6"
        >
          <div className="relative -mx-5 -mt-5 border-b border-outline bg-primary/5 px-5 pb-4 pt-5 text-center sm:-mx-6 sm:-mt-6 sm:px-6">
            <p className="eyebrow">{offre ? "Plan et devis + Catalogue Premium offert" : "Plan et devis"}</p>
            <h2 id={`pd-title-${plan.slug}`} className="mt-1 text-lg font-bold">{plan.code}</h2>
            {promoPrice ? (
              <>
                <p className="mt-1 text-base font-semibold text-foreground/50">
                  <s aria-label={`Au lieu de ${formatLocalAmount(local.amount)} ${local.currency}`}>
                    {formatLocalAmount(local.amount)} {local.currency}
                  </s>
                </p>
                <p className="mt-1 text-4xl font-bold tracking-tight text-secondary">
                  {promoPrice.approx ? "≈ " : ""}
                  {formatLocalAmount(promoPrice.amount)} <span className="text-base font-medium">{promoPrice.currency}</span>
                </p>
                <p className="mt-1 text-sm font-semibold">Code {promo} déjà rempli · Téléchargement instantané</p>
              </>
            ) : local.anchor ? (
              <p className="mt-1 text-base font-semibold text-foreground/50">
                <s aria-label={`Au lieu de ${formatLocalAmount(local.anchor)} ${local.currency}`}>
                  {formatLocalAmount(local.anchor)} {local.currency}
                </s>
              </p>
            ) : null}
            {promoPrice ? null : (
              <>
                <p className="mt-1 text-4xl font-bold tracking-tight">
                  {formatLocalAmount(local.amount)} <span className="text-base font-medium">{local.currency}</span>
                </p>
                <PriceCountdown className="mt-1" />
                <p className="mt-1 text-sm font-semibold">Téléchargement instantané</p>
              </>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-lg text-muted hover:bg-black/5"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>

          <div>
            <label className="label" htmlFor={`pd-name-${plan.slug}`}>Nom complet</label>
            <input id={`pd-name-${plan.slug}`} name="name" required minLength={2} autoComplete="name" defaultValue={buyer?.name} placeholder="Kouame Diallo" className="input" />
          </div>
          <div>
            <label className="label" htmlFor={`pd-email-${plan.slug}`}>Email</label>
            <input
              id={`pd-email-${plan.slug}`}
              name="email"
              required
              type="email"
              inputMode="email"
              autoComplete="email"
              defaultValue={buyer?.email}
              placeholder="vous@exemple.com"
              className="input"
            />
            <p className="mt-1 text-xs text-muted">{offre ? "Votre code d'accès à l'Espace Premium vous y est envoyé." : "Le document vous y est envoyé."}</p>
          </div>
          <div>
            <label className="label" htmlFor={`pd-phone-${plan.slug}`}>Téléphone (WhatsApp)</label>
            <div className="flex gap-2">
              {/* Indicatif seul à l'écran, la liste complète des pays s'ouvre au toucher. */}
              <div className="input relative flex w-auto shrink-0 items-center gap-1 pr-3 font-medium focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                <span>{dial}</span>
                <span aria-hidden className="text-xs text-muted">▾</span>
                <select
                  name="countryCode"
                  value={country}
                  onChange={(e) => {
                    countryChosen.current = true;
                    setCountry(e.target.value as CountryCode);
                  }}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Pays"
                >
                  {PHONE_COUNTRIES.map(([code, name, prefix]) => (
                    <option key={code} value={code}>
                      {name} {prefix}
                    </option>
                  ))}
                </select>
              </div>
              <input
                id={`pd-phone-${plan.slug}`}
                name="phone"
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                defaultValue={buyer?.phone}
                placeholder={example}
                className="input min-w-0"
              />
            </div>
          </div>
          {promoOpen || promo || remise ? (
            <div>
              <label className="label" htmlFor={`pd-promo-${plan.slug}`}>Code promo</label>
              <input id={`pd-promo-${plan.slug}`} name="discountCode" defaultValue={remise?.code ?? promo ?? undefined} autoFocus={!promo && !remise} autoComplete="off" autoCapitalize="characters" spellCheck={false} className="input" />
            </div>
          ) : (
            <button type="button" onClick={() => setPromoOpen(true)} className="-mt-2 justify-self-start text-sm font-semibold text-primary underline">
              Code promo
            </button>
          )}
          {error ? <p className="rounded-xl bg-secondary/10 px-4 py-3 text-sm text-secondary">{error}</p> : null}
          <button type="submit" disabled={sending} className="btn-cta mt-1 w-full py-3.5 text-base">
            {sending ? "Ouverture du paiement…" : "Procéder au paiement →"}
          </button>
          <p className="-mt-1 text-center text-xs text-muted">🔒 Vous serez redirigé vers la page de paiement sécurisée (Mobile Money ou carte bancaire)</p>
        </form>
      </dialog>
    </>
  );
}
