"use client";

import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";

const CHECKOUT = "https://wooplans.mychariow.shop/prd_kufwer/checkout";

/* ─── Geolocation data ──────────────────────────────────────────── */
type CountryCode = "cm" | "sn" | "ci" | "ml";
const COUNTRIES: Record<CountryCode, {
  name: string; adj: string; adjLoc: string;
  momoShort: string; momoStep: string; momoList: string[];
}> = {
  cm: { name: "Cameroun",      adj: "pour le Cameroun",      adjLoc: "au Cameroun",
        momoShort: "Orange Money · MTN",
        momoStep:  "Orange Money ou MTN MoMo — en moins de 2 minutes.",
        momoList:  ["Orange Money", "MTN MoMo"] },
  sn: { name: "Sénégal",       adj: "pour le Sénégal",       adjLoc: "au Sénégal",
        momoShort: "Wave · Orange Money",
        momoStep:  "Wave, Orange Money ou Free Money — en moins de 2 minutes.",
        momoList:  ["Wave", "Orange Money", "Free Money"] },
  ci: { name: "Côte d'Ivoire", adj: "pour la Côte d'Ivoire", adjLoc: "en Côte d'Ivoire",
        momoShort: "Wave · Orange · MTN",
        momoStep:  "Wave, Orange Money, MTN ou Moov — en moins de 2 minutes.",
        momoList:  ["Wave", "Orange Money", "MTN MoMo", "Moov"] },
  ml: { name: "Mali",          adj: "pour le Mali",          adjLoc: "au Mali",
        momoShort: "Orange · Moov",
        momoStep:  "Orange Money, Moov Money ou Wave — en moins de 2 minutes.",
        momoList:  ["Orange Money", "Moov Money", "Wave"] },
};

/* ─── Plans with real images ────────────────────────────────────── */
const PLANS = [
  { type: "Villa",  code: "V3-030", ch: 3, m2: 178, img: "/images/plans/V3-030.webp" },
  { type: "Duplex", code: "D4-006", ch: 4, m2: 195, img: "/images/plans/D4-006.webp" },
  { type: "Villa",  code: "V3-037", ch: 3, m2: 180, img: "/images/plans/V3-037.webp" },
  { type: "Duplex", code: "D4-016", ch: 4, m2: 286, img: "/images/plans/D4-016.webp" },
  { type: "Duplex", code: "D4-035", ch: 4, m2: 210, img: "/images/plans/D4-035.webp" },
  { type: "Duplex", code: "D5-020", ch: 5, m2: 307, img: "/images/plans/D5-020.webp" },
];

/* ─── Video testimonials ────────────────────────────────────────── */
const VIDEOS = [
  { src: "https://wooplans.b-cdn.net/VID-20250121-WA0013-original.mp4",            name: "Client satisfait",  loc: "Cameroun" },
  { src: "https://wooplans.b-cdn.net/T%C3%A9moignages_Francis-original%20(1).mp4", name: "Francis",           loc: "Cameroun" },
  { src: "https://wooplans.b-cdn.net/T%C3%A9moignage_Michel-original%20(1).mp4",   name: "Michel",            loc: "Cameroun" },
  { src: "https://wooplans.b-cdn.net/T%C3%A9moignage_Ibrahim-original%20(1).mp4",  name: "Ibrahim",           loc: "Cameroun" },
  { src: "https://wooplans.b-cdn.net/temoignage%20audio%20video.mp4",              name: "Client satisfait",  loc: "Cameroun" },
];

/* ─── Gauge hook ────────────────────────────────────────────────── */
function useGauge() {
  const calc = useCallback(() => {
    const now = new Date();
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
    const progress = Math.min((now.getTime() - dayStart.getTime()) / (23 * 3600 * 1000), 1);
    const dayBase  = Math.floor((now.getTime() - new Date("2026-01-01").getTime()) / 86400000);
    const total = 500 + Math.max(0, dayBase) * 20 + Math.floor(progress * 20);
    const rem   = Math.max(5, 25 - Math.floor(progress * 20));
    const pct   = 88 + ((25 - rem) / 20) * 8;
    return { total, rem, pct };
  }, []);
  const [g, setG] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setG(calc()), 60000);
    return () => clearInterval(id);
  }, [calc]);
  return g;
}

/* ─── Icons ─────────────────────────────────────────────────────── */
function FlameFilled({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden>
      <path d="M16 2C13.5 6.5 14 10 12 12.5 11.2 11.6 11 10.5 11 9.5 8 12 6 15.5 6 19.5 6 25.3 10.5 30 16 30s10-4.7 10-10.5C26 12 20 7 16 2zm0 24c-3.3 0-6-2.7-6-6 0-2 1-3.5 2.5-4.5 0 1 .5 2 1.2 2.7C14.5 16.5 16 14.5 16 12c1.5 2 4 4.5 4 7 0 3.3-2.7 6-4 6-.5-1-.5-2.2-.5-3C14 23.2 12.5 24.5 12 26c1.1.6 2.5 1 4 1z"/>
    </svg>
  );
}
function ICheck({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12l5 5L20 6" />
    </svg>
  );
}
function IShield({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" />
    </svg>
  );
}

/* ─── Shared components ─────────────────────────────────────────── */
function SectionLabel({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-5 h-px bg-muted/40" />
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{text}</span>
    </div>
  );
}

function CtaButton({ label, className = "" }: { label: string; className?: string }) {
  return (
    <a
      href={CHECKOUT}
      target="_blank"
      rel="noopener noreferrer"
      className={`sp-cta block w-full text-center py-4 px-6 bg-accent text-white font-bold text-[15px] rounded-full border-2 border-accent transition-colors ${className}`}
    >
      {label}
    </a>
  );
}

function Guarantee({ light = false }: { light?: boolean }) {
  return (
    <div className={`flex items-center justify-center gap-2 mt-3 text-xs rounded-full px-4 py-2.5 font-semibold ${light ? "bg-white/15 text-white" : "bg-[#DCEAE9] text-primary"}`}>
      <IShield size={13} />
      Satisfait ou remboursé · 14 jours — Aucune question posée
    </div>
  );
}

function MomoLogos({ list }: { list: string[] }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center my-3">
      {list.map(m => (
        <span key={m} className="text-[11px] font-semibold px-3 py-1.5 border border-outline/10 rounded-lg text-muted bg-background">{m}</span>
      ))}
    </div>
  );
}

function Gauge({ total, rem, pct, light = false, foot }: { total: number; rem: number; pct: number; light?: boolean; foot?: string }) {
  return (
    <div className={`rounded-xl border p-3 mt-4 ${light ? "border-white/15 bg-white/10" : "border-outline/10 bg-background"}`}>
      <div className="flex justify-between items-center text-xs mb-2 gap-2 flex-wrap">
        <span className={`flex items-center gap-1.5 ${light ? "text-white/65" : "text-muted"}`}>
          <span className={`w-2 h-2 rounded-full inline-block ${light ? "bg-highlight" : "bg-primary"}`} />
          {total} personnes ont rejoint
        </span>
        <span className={`sp-remain flex items-center gap-1 font-semibold ${light ? "text-[#F08A2E]" : "text-secondary"}`}>
          <FlameFilled size={12} />
          {rem} places restantes
        </span>
      </div>
      <div className={`h-1.5 rounded-full overflow-hidden ${light ? "bg-white/20" : "bg-outline/10"}`}>
        <div
          className={`h-full rounded-full transition-all duration-700 ${light ? "bg-accent" : "bg-secondary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {foot && <p className={`text-center text-[11px] mt-2 ${light ? "text-white/40" : "text-muted"}`}>{foot}</p>}
    </div>
  );
}

/* ─── Video card with lazy play ─────────────────────────────────── */
function VideoCard({ src, name, loc }: { src: string; name: string; loc: string }) {
  const [active, setActive] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  const handlePlay = useCallback(() => {
    setActive(true);
    // small delay lets the controls render before play
    setTimeout(() => ref.current?.play(), 50);
  }, []);

  return (
    <div>
      <div className="aspect-[9/16] rounded-2xl overflow-hidden bg-foreground/5 border border-outline/10 relative">
        <video
          ref={ref}
          src={src}
          preload="metadata"
          controls={active}
          playsInline
          className="w-full h-full object-cover"
        />
        {!active && (
          <button
            onClick={handlePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors"
            aria-label={`Lire le témoignage de ${name}`}
          >
            <span className="w-14 h-14 rounded-full bg-white/90 border border-white/30 flex items-center justify-center shadow-lg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-accent translate-x-0.5">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </button>
        )}
      </div>
      <div className="mt-2 px-0.5">
        <p className="text-sm font-semibold text-foreground">{name}</p>
        <p className="text-xs text-muted">{loc}</p>
      </div>
    </div>
  );
}

/* ─── Animations CSS ────────────────────────────────────────────── */
const ANIM_CSS = `
  .sp-cta { position:relative; overflow:hidden; animation: sp-shake 7s ease-in-out 3s infinite; }
  .sp-cta:hover { background: #d9781d !important; border-color: #d9781d !important; }
  .sp-cta::after {
    content:''; position:absolute; inset:0; pointer-events:none;
    background: linear-gradient(100deg, transparent 20%, rgba(255,255,255,.38) 50%, transparent 80%);
    transform: translateX(-130%) skewX(-15deg);
    animation: sp-shimmer 7s ease-in-out 3s infinite;
  }
  .sp-cta-final { animation: sp-shake-hard 4s ease-in-out infinite, sp-pulse 2.5s ease-in-out infinite !important; }
  @keyframes sp-shake {
    0%,14%,100%{transform:translateX(0)}
    2%{transform:translateX(-4px)} 4%{transform:translateX(4px)}
    6%{transform:translateX(-3px)} 8%{transform:translateX(3px)}
    10%{transform:translateX(-1px)} 12%{transform:translateX(1px)}
  }
  @keyframes sp-shake-hard {
    0%,18%,100%{transform:translateX(0)}
    3%{transform:translateX(-6px)} 6%{transform:translateX(6px)}
    9%{transform:translateX(-4px)} 12%{transform:translateX(4px)}
    15%{transform:translateX(-2px)}
  }
  @keyframes sp-shimmer {
    0%,44%,100%{transform:translateX(-130%) skewX(-15deg);opacity:0}
    5%{opacity:1} 30%{transform:translateX(130%) skewX(-15deg);opacity:0}
  }
  @keyframes sp-pulse {
    0%,100%{box-shadow:0 0 0 0 rgba(240,138,46,.6)}
    50%{box-shadow:0 0 0 14px rgba(240,138,46,0)}
  }
  @keyframes sp-blink {
    0%,54%,100%{opacity:1} 64%{opacity:.15} 74%{opacity:1} 84%{opacity:.15} 94%{opacity:1}
  }
  .sp-remain { animation: sp-blink 3.5s ease-in-out infinite; }
  .sp-faq details { border-bottom:1px solid rgba(30,41,51,.08); }
  .sp-faq details:first-of-type { border-top:1px solid rgba(30,41,51,.08); }
  .sp-faq summary { list-style:none; cursor:pointer; padding:15px 0; font-size:14px; font-weight:600; display:flex; justify-content:space-between; align-items:center; gap:12px; color:#1E2933; }
  .sp-faq summary::-webkit-details-marker { display:none; }
  .sp-faq summary::after { content:"+"; font-size:20px; color:#9CA3AF; flex-shrink:0; line-height:1; }
  .sp-faq details[open] summary::after { content:"–"; }
  .sp-faq details p { font-size:13px; color:#6B7280; line-height:1.6; padding-bottom:14px; }
`;

/* ═══════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════ */
export default function AbonnementPage() {
  const { total, rem, pct } = useGauge();
  // Default country — Cameroun; no selector shown
  const c = COUNTRIES["cm"];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ANIM_CSS }} />

      {/* ── Geobar ─────────────────────────────────────────────── */}
      <div className="bg-surface border-b border-outline/10 px-4 py-2 flex items-center justify-between text-[11px] text-muted">
        <span className="flex items-center gap-1.5 font-medium">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0">
            <path d="M12 22s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>
          </svg>
          <span className="font-semibold text-foreground/80">{c.name}</span>
        </span>
        <span className="font-medium">{c.momoShort}</span>
      </div>

      {/* ── 1. HERO ────────────────────────────────────────────── */}
      <section className="bg-primary px-4 pt-10 pb-12">
        <div className="max-w-xl mx-auto">
          {/* Pills */}
          <div className="flex flex-wrap gap-2 mb-5">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full bg-secondary/80 text-white">
              <FlameFilled size={11} /> Prix de lancement
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full bg-white/15 text-white">
              <ICheck size={10} /> Accès immédiat
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-semibold text-white leading-tight tracking-tight mb-3">
            50 plans de maison pensés {c.adj}, avec devis inclus.
          </h1>
          <p className="text-white/70 text-[15px] mb-6 leading-relaxed">
            Explorez. Choisissez. Construisez sereinement.
          </p>

          {/* Hero image */}
          <div className="relative w-full rounded-2xl overflow-hidden border border-white/15 mb-6">
            <Image
              src="/images/catalogue-premium-banner.jpg"
              alt="Catalogue Premium Wooplans — 50 plans de maison avec devis"
              width={1200}
              height={675}
              className="w-full h-auto"
              priority
            />
          </div>

          {/* CTA */}
          <CtaButton label="Accéder à tous les plans · 29 900 FCFA →" />
          <p className="text-center text-[11px] text-white/40 mt-2">Paiement Mobile Money · Accès à vie</p>

          {/* Gauge */}
          <Gauge light total={total} rem={rem} pct={pct} foot="Prix de lancement · Profitez avant la fin des places disponibles" />
        </div>
      </section>

      {/* ── 2. PROBLÈME ────────────────────────────────────────── */}
      <section className="bg-surface border-b border-outline/10 px-4 py-12">
        <div className="max-w-xl mx-auto">
          <SectionLabel text="Le problème" />
          <h2 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight mb-3">
            Trouver un plan adapté à votre terrain et votre budget n&apos;est pas facile.
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            Devis flous, plans inadaptés au climat sur internet, allers-retours coûteux avec l&apos;architecte. Vous perdez du temps et de l&apos;argent avant même de poser la première pierre.
          </p>
        </div>
      </section>

      {/* ── 3. SOLUTION ────────────────────────────────────────── */}
      <section className="bg-background border-b border-outline/10 px-4 py-12">
        <div className="max-w-xl mx-auto">
          <SectionLabel text="La solution" />
          <h2 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight mb-2">
            Le catalogue Premium que vous attendiez.
          </h2>
          <p className="text-sm text-muted mb-5">
            Tout ce qu&apos;il faut pour démarrer votre projet — au même endroit.
          </p>

          {/* Solution image */}
          <div className="relative w-full rounded-2xl overflow-hidden border border-outline/10 mb-6">
            <Image
              src="/images/catalogue-premium-banner.jpg"
              alt="Catalogue Premium Wooplans — 50 plans de maison"
              width={1200}
              height={675}
              className="w-full h-auto"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Full-width benefit */}
            <div className="col-span-2 bg-surface border border-outline/10 rounded-2xl p-4 flex gap-4 items-start">
              <div className="shrink-0 w-9 h-9 rounded-xl border border-outline/10 text-primary flex items-center justify-center bg-[#DCEAE9]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">+50 plans Villa &amp; Duplex</p>
                <p className="text-xs text-muted leading-relaxed">Un catalogue complet, conçu par des architectes professionnels, régulièrement enrichi.</p>
              </div>
            </div>
            {[
              {
                icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
                title: "Plans de distribution", desc: "Vue intérieure détaillée, pièce par pièce.",
              },
              {
                icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>,
                title: "Devis estimatif", desc: "Budgétisez précisément avant de construire.",
              },
              {
                icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>,
                title: `Adapté ${c.adjLoc}`, desc: "Conçu pour le climat et les réalités locales.",
              },
              {
                icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>,
                title: "Accès immédiat", desc: "Code WhatsApp + email après paiement.",
              },
            ].map((b, i) => (
              <div key={i} className="bg-surface border border-outline/10 rounded-2xl p-4">
                <div className="w-9 h-9 rounded-xl border border-outline/10 text-primary flex items-center justify-center bg-[#DCEAE9] mb-3">{b.icon}</div>
                <p className="text-sm font-semibold text-foreground mb-1">{b.title}</p>
                <p className="text-xs text-muted leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. PLANS PREVIEW ───────────────────────────────────── */}
      <section className="bg-surface border-b border-outline/10 px-4 py-12">
        <div className="max-w-xl mx-auto">
          <SectionLabel text="Ce que vous débloquez" />
          <h2 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight mb-5">
            Un seul accès. 50 plans débloqués.
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {PLANS.map((p) => (
              <div key={p.code} className="bg-background border border-outline/10 rounded-xl overflow-hidden">
                <div className="relative aspect-[16/9] overflow-hidden">
                  <Image
                    src={p.img}
                    alt={`${p.type} ${p.code} — ${p.ch} ch. ${p.m2} m²`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, 280px"
                  />
                </div>
                <div className="px-3 py-2.5">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-muted/60">{p.type}</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{p.code} · {p.ch} ch.</p>
                  <p className="text-xs text-muted">{p.m2} m²</p>
                </div>
              </div>
            ))}
            {/* +44 more */}
            <div className="col-span-2 bg-[#DCEAE9] border border-[#DCEAE9] rounded-xl px-5 py-5 flex items-center justify-center gap-4">
              <span className="text-4xl font-bold text-primary leading-none">+44</span>
              <span className="text-sm text-primary/70 leading-snug">autres plans<br />inclus dans votre accès</span>
            </div>
          </div>

          <div className="mt-5">
            <CtaButton label="Débloquer les 50 plans · 29 900 FCFA →" />
          </div>
        </div>
      </section>

      {/* ── 5. TÉMOIGNAGES VIDÉO ───────────────────────────────── */}
      <section className="bg-[#DCEAE9] border-b border-primary/10 px-4 py-12">
        <div className="max-w-xl mx-auto">
          <SectionLabel text="Ils ont trouvé leur plan" />
          <h2 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight mb-2">
            Ils ont construit avec Wooplans.
          </h2>
          <p className="text-sm text-muted mb-5">Des propriétaires qui ont utilisé nos plans pour concrétiser leur projet.</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { val: `${total}+`, label: "Clients satisfaits" },
              { val: "500+",      label: "Projets démarrés"   },
              { val: "4,8/5",     label: "Satisfaction"       },
            ].map((s, i) => (
              <div key={i} className="bg-surface border border-outline/10 rounded-xl py-3 px-2 text-center">
                <p className="text-xl font-bold text-foreground tracking-tight">{s.val}</p>
                <p className="text-[11px] text-muted mt-0.5 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Video grid — 2 cols, row of 3 then 2 */}
          <div className="grid grid-cols-2 gap-4">
            {VIDEOS.slice(0, 4).map((v, i) => (
              <VideoCard key={i} src={v.src} name={v.name} loc={v.loc} />
            ))}
          </div>
          {/* 5th video centered */}
          <div className="mt-4 max-w-[calc(50%-8px)] mx-auto">
            <VideoCard src={VIDEOS[4].src} name={VIDEOS[4].name} loc={VIDEOS[4].loc} />
          </div>
        </div>
      </section>

      {/* ── 6. OFFRE ───────────────────────────────────────────── */}
      <section className="bg-background border-b border-outline/10 px-4 py-12" id="offre">
        <div className="max-w-xl mx-auto">
          <SectionLabel text="L'offre" />
          <h2 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight mb-4">
            Tout ce qui est inclus dans votre Catalogue Premium.
          </h2>

          <div className="bg-surface border border-outline/10 rounded-2xl p-5">
            <ul className="divide-y divide-outline/8">
              {[
                "50 plans Villa & Duplex",
                "Devis estimatif détaillé par plan",
                "Plans de distribution",
                "Accès à vie · mises à jour incluses",
                "Support WhatsApp prioritaire",
                "Garantie satisfait ou remboursé 14 jours",
              ].map((item, i) => (
                <li key={i} className="flex justify-between items-center py-3 gap-3 text-sm">
                  <span className="flex items-center gap-2.5 text-foreground">
                    <span className="text-primary shrink-0"><ICheck size={14} /></span>
                    {item}
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-primary whitespace-nowrap shrink-0">Inclus</span>
                </li>
              ))}
            </ul>

            <div className="flex justify-between items-baseline pt-3 border-t border-outline/10 mt-1 mb-4 text-sm">
              <span className="text-muted">Valeur totale</span>
              <span className="font-semibold text-muted line-through">300 000 FCFA</span>
            </div>

            {/* Price */}
            <div className="bg-primary rounded-xl px-5 py-4 mb-4 text-center">
              <p className="text-2xl font-bold text-white tracking-tight">Maintenant : 29 900 FCFA</p>
              <p className="text-xs text-white/60 mt-1">paiement unique · accès à vie</p>
            </div>

            <MomoLogos list={c.momoList} />
            <CtaButton label="Tout débloquer · 29 900 FCFA →" />
            <Guarantee />
          </div>
        </div>
      </section>

      {/* ── 7. COMMENT ÇA MARCHE ───────────────────────────────── */}
      <section className="bg-surface border-b border-outline/10 px-4 py-12">
        <div className="max-w-xl mx-auto">
          <SectionLabel text="Comment ça marche" />
          <h2 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight mb-5">En 3 étapes.</h2>

          <div className="flex flex-col gap-3">
            {[
              { n: "1", title: "Vous réglez en Mobile Money",   desc: c.momoStep },
              { n: "2", title: "Vous recevez votre code",       desc: "Par WhatsApp et par email, immédiatement après le paiement." },
              { n: "3", title: "Vous accédez à tous les plans", desc: "Entrez votre code et explorez. Pas de compte, pas de mot de passe." },
            ].map((s, i) => (
              <div key={i} className="flex gap-4 items-start bg-background border border-outline/10 rounded-2xl p-4">
                <span className="shrink-0 w-8 h-8 rounded-full bg-[#DCEAE9] text-primary font-bold text-sm flex items-center justify-center">{s.n}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-0.5">{s.title}</p>
                  <p className="text-xs text-muted leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. FAQ ─────────────────────────────────────────────── */}
      <section className="bg-background border-b border-outline/10 px-4 py-12">
        <div className="max-w-xl mx-auto">
          <SectionLabel text="FAQ" />
          <h2 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight mb-5">Une question ?</h2>
          <div className="sp-faq">
            <details><summary>C&apos;est quoi exactement le Catalogue Premium ?</summary>
              <p>Un catalogue de 50 plans (villas et duplex) conçus pour l&apos;Afrique, avec devis estimatifs et plans de distribution inclus.</p>
            </details>
            <details><summary>Comment je reçois mon accès ?</summary>
              <p>Dès le paiement confirmé, un code à 4 caractères vous est envoyé par WhatsApp et par email. Vous l&apos;entrez sur le site, accès immédiat.</p>
            </details>
            <details><summary>Les plans sont-ils adaptés à mon pays ?</summary>
              <p>Oui. Tous nos plans sont conçus pour les réalités africaines : climat local, matériaux disponibles, configurations de terrain courantes.</p>
            </details>
            <details><summary>Est-ce un paiement unique ou un abonnement ?</summary>
              <p>C&apos;est un paiement unique. Accès à vie, aucun renouvellement automatique.</p>
            </details>
            <details><summary>Et si ça ne me convient pas ?</summary>
              <p>Garantie 14 jours, remboursement sans condition. Vous pouvez nous écrire à tout moment sur WhatsApp.</p>
            </details>
          </div>
        </div>
      </section>

      {/* ── 9. CTA FINAL ───────────────────────────────────────── */}
      <section className="bg-[#FAF1D6] border-b border-[#E7C36C]/40 px-4 py-14">
        <div className="max-w-xl mx-auto">
          <h2 className="text-xl md:text-2xl font-semibold text-primary tracking-tight mb-2">
            Votre projet mérite un vrai plan.<br />Profitez du prix de lancement.
          </h2>

          <div className="flex items-baseline gap-3 mt-4 mb-1">
            <span className="text-3xl font-bold text-foreground tracking-tight">29 900 FCFA</span>
            <span className="text-base text-muted line-through">300 000 FCFA</span>
            <span className="text-xs font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">−90&nbsp;%</span>
          </div>

          <Gauge total={total} rem={rem} pct={pct} />

          <div className="mt-5">
            <a
              href={CHECKOUT}
              target="_blank"
              rel="noopener noreferrer"
              className="sp-cta sp-cta-final block w-full text-center py-4 px-6 bg-accent text-white font-bold text-[15px] rounded-full border-2 border-accent"
            >
              Je rejoins maintenant · 29 900 FCFA →
            </a>
          </div>

          <div className="flex items-center justify-center gap-2 mt-3 text-xs text-primary bg-white/60 border border-primary/10 rounded-full px-4 py-2.5 font-semibold">
            <IShield size={13} />
            Satisfait ou remboursé · 14 jours — Aucune question posée
          </div>
        </div>
      </section>
    </>
  );
}
