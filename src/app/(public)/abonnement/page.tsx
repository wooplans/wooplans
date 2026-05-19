"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const CHECKOUT = "https://wooplans.mychariow.shop/prd_kufwer/checkout";

const ANIM_CSS = `
  .sp-cta {
    position: relative;
    overflow: hidden;
    animation: sp-shake 7s ease-in-out 3s infinite;
  }
  .sp-cta::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(100deg, transparent 20%, rgba(255,255,255,.4) 50%, transparent 80%);
    transform: translateX(-130%) skewX(-15deg);
    animation: sp-shimmer 7s ease-in-out 3s infinite;
    pointer-events: none;
  }
  .sp-cta-final {
    animation: sp-shake-hard 4s ease-in-out infinite, sp-pulse 2.5s ease-in-out infinite !important;
  }
  @keyframes sp-shake {
    0%,14%,100% { transform: translateX(0); }
    2%  { transform: translateX(-4px); }
    4%  { transform: translateX(4px);  }
    6%  { transform: translateX(-3px); }
    8%  { transform: translateX(3px);  }
    10% { transform: translateX(-1px); }
    12% { transform: translateX(1px);  }
  }
  @keyframes sp-shake-hard {
    0%,18%,100% { transform: translateX(0); }
    3%  { transform: translateX(-6px); }
    6%  { transform: translateX(6px);  }
    9%  { transform: translateX(-4px); }
    12% { transform: translateX(4px);  }
    15% { transform: translateX(-2px); }
  }
  @keyframes sp-shimmer {
    0%,44%,100% { transform: translateX(-130%) skewX(-15deg); opacity:0; }
    5%          { opacity: 1; }
    30%         { transform: translateX(130%) skewX(-15deg); opacity:0; }
  }
  @keyframes sp-pulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(240,138,46,.6); }
    50%     { box-shadow: 0 0 0 14px rgba(240,138,46,0); }
  }
  @keyframes sp-blink {
    0%,54%,100% { opacity:1; }
    64% { opacity:.15; }
    74% { opacity:1;   }
    84% { opacity:.15; }
    94% { opacity:1;   }
  }
  .sp-remain { animation: sp-blink 3.5s ease-in-out infinite; }

  /* Slider */
  .sp-viewport { overflow: hidden; }
  .sp-track    { display: flex; transition: transform .35s ease; }
  .sp-slide    { min-width: 100%; flex-shrink: 0; }

  /* FAQ accordion */
  .sp-faq details { border-bottom: 1px solid rgba(30,41,51,.08); }
  .sp-faq details:first-of-type { border-top: 1px solid rgba(30,41,51,.08); }
  .sp-faq summary {
    list-style: none; cursor: pointer;
    padding: 16px 0;
    font-size: 14px; font-weight: 600;
    display: flex; justify-content: space-between; align-items: center; gap: 12px;
  }
  .sp-faq summary::-webkit-details-marker { display: none; }
  .sp-faq summary::after { content:"+"; font-size:20px; color:#9CA3AF; flex-shrink:0; }
  .sp-faq details[open] summary::after { content:"–"; }
  .sp-faq details p { font-size: 13px; color: #6B7280; line-height: 1.6; padding-bottom: 14px; }
`;

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

function Gauge({ total, rem, pct, foot }: { total: number; rem: number; pct: number; foot?: string }) {
  return (
    <div className="rounded-xl border border-outline/10 bg-surface/10 backdrop-blur-sm p-3 mt-4">
      <div className="flex justify-between items-center text-xs mb-2 gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 text-white/70">
          <span className="w-2 h-2 rounded-full bg-highlight inline-block" />
          {total} personnes ont rejoint
        </span>
        <span className="sp-remain flex items-center gap-1 font-semibold text-accent">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3c2 3 1 5-1 7s-3 4-1 7c-3 0-6-3-6-7 0-3 2-4 3-2 0-4 3-7 5-5z"/></svg>
          {rem} places restantes
        </span>
      </div>
      <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
        <div className="h-full bg-accent rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      {foot && <p className="text-center text-[11px] text-white/40 mt-2">{foot}</p>}
    </div>
  );
}

function GaugeDark({ total, rem, pct }: { total: number; rem: number; pct: number }) {
  return (
    <div className="rounded-xl border border-outline/10 bg-background p-3 mt-4">
      <div className="flex justify-between items-center text-xs mb-2 gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 text-muted">
          <span className="w-2 h-2 rounded-full bg-primary inline-block" />
          {total} personnes ont rejoint
        </span>
        <span className="sp-remain flex items-center gap-1 font-semibold text-secondary">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3c2 3 1 5-1 7s-3 4-1 7c-3 0-6-3-6-7 0-3 2-4 3-2 0-4 3-7 5-5z"/></svg>
          {rem} places restantes
        </span>
      </div>
      <div className="h-1.5 bg-outline/10 rounded-full overflow-hidden">
        <div className="h-full bg-secondary rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CtaButton({ label, className = "" }: { label: string; className?: string }) {
  return (
    <a
      href={CHECKOUT}
      target="_blank"
      rel="noopener noreferrer"
      className={`sp-cta block w-full text-center py-4 px-6 bg-accent text-white font-bold text-base rounded-full border-2 border-accent hover:bg-[#d9781d] hover:border-[#d9781d] transition-colors ${className}`}
    >
      {label}
    </a>
  );
}

function Guarantee() {
  return (
    <div className="flex items-center justify-center gap-2.5 mt-3 text-xs text-primary bg-[#DCEAE9] rounded-full px-4 py-2.5">
      <svg className="shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>
      </svg>
      <span className="font-semibold">Satisfait ou remboursé · 14 jours</span>
    </div>
  );
}

function SalesSlider() {
  const slides = [
    { tag: "render 3D — V-023", label: "vue extérieure",       title: "Vue extérieure 3D",    desc: "Façades · perspectives" },
    { tag: "plan — V-023",      label: "distribution intérieure", title: "Plan de distribution", desc: "Pièces · surfaces · circulation" },
    { tag: "devis — V-023",     label: "tableau estimatif",    title: "Devis estimatif",      desc: "Matériaux · main d'œuvre · total" },
    { tag: null,                label: null,                   title: "Un seul accès. Tout débloqué.", desc: "Villas · duplex · surfaces variées", special: true },
  ];
  const [idx, setIdx] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const n = slides.length;
  const go = useCallback((k: number) => setIdx(((k % n) + n) % n), [n]);
  const reset = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => setIdx(i => (i + 1) % n), 4500);
  }, [n]);
  useEffect(() => { reset(); return () => { if (timer.current) clearInterval(timer.current); }; }, [reset]);

  return (
    <div className="relative border border-outline/10 rounded-2xl overflow-hidden bg-surface mt-4">
      <div className="sp-viewport">
        <div className="sp-track" style={{ transform: `translateX(-${idx * 100}%)` }}>
          {slides.map((s, i) => (
            <div key={i} className="sp-slide">
              {s.special ? (
                <div className="aspect-[16/10] bg-[#DCEAE9] flex flex-col items-center justify-center gap-1">
                  <span className="text-3xl font-bold text-primary">+50</span>
                  <span className="text-xs text-primary/60 font-medium tracking-wide">plans inclus</span>
                </div>
              ) : (
                <div className="aspect-[16/10] bg-background border-b border-outline/10 flex items-center justify-center relative">
                  <span className="absolute top-2 left-2 text-[10px] bg-surface border border-outline/10 px-2 py-0.5 rounded text-muted">{s.tag}</span>
                  <span className="text-xs text-muted/60 font-mono">{s.label}</span>
                </div>
              )}
              <div className="px-4 py-3">
                <p className="text-sm font-semibold text-foreground">{s.title}</p>
                <p className="text-xs text-muted mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Arrows */}
      <div className="absolute top-[38%] left-0 right-0 flex justify-between px-2 pointer-events-none">
        {[{ dir: -1, path: "M15 6l-6 6 6 6" }, { dir: 1, path: "M9 6l6 6-6 6" }].map(({ dir, path }) => (
          <button key={dir} onClick={() => { go(idx + dir); reset(); }} className="pointer-events-auto w-8 h-8 rounded-full border border-outline/10 bg-surface flex items-center justify-center text-muted hover:text-foreground transition-colors" aria-label={dir < 0 ? "précédent" : "suivant"}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={path}/></svg>
          </button>
        ))}
      </div>
      {/* Dots */}
      <div className="flex justify-center gap-1.5 py-3 bg-surface">
        {slides.map((_, i) => (
          <button key={i} onClick={() => { go(i); reset(); }} aria-label={`slide ${i + 1}`}
            className={`rounded-full border-none cursor-pointer transition-all duration-200 ${i === idx ? "w-4 h-2 bg-accent" : "w-2 h-2 bg-outline/20"}`}
          />
        ))}
      </div>
    </div>
  );
}

const PLANS = [
  { type: "Villa",  code: "V-001", ch: 4, m2: 120 },
  { type: "Duplex", code: "D-005", ch: 5, m2: 180 },
  { type: "Villa",  code: "V-012", ch: 3, m2:  95 },
  { type: "Duplex", code: "D-018", ch: 6, m2: 210 },
  { type: "Villa",  code: "V-023", ch: 4, m2: 140 },
  { type: "Duplex", code: "D-031", ch: 4, m2: 160 },
];

function SectionLabel({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-5 h-px bg-muted/40 inline-block" />
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{text}</span>
    </div>
  );
}

export default function AbonnementPage() {
  const { total, rem, pct } = useGauge();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ANIM_CSS }} />

      {/* ── 1. HERO ────────────────────────────────────────────── */}
      <section className="bg-primary px-4 py-14 md:py-20">
        <div className="max-w-xl mx-auto">
          <div className="flex flex-wrap gap-2 mb-5">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full bg-secondary/80 text-white">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3c2 3 1 5-1 7s-3 4-1 7c-3 0-6-3-6-7 0-3 2-4 3-2 0-4 3-7 5-5z"/></svg>
              Prix de lancement
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full bg-white/15 text-white">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6"/></svg>
              Accès immédiat
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-semibold text-white leading-tight tracking-tight mb-3">
            50 plans de maison pensés pour l&apos;Afrique, avec devis inclus.
          </h1>
          <p className="text-white/70 text-base mb-6">
            Explorez. Choisissez. Construisez sereinement.
          </p>

          {/* Hero image placeholder */}
          <div className="aspect-[4/3] rounded-2xl border border-white/15 bg-white/5 flex items-center justify-center mb-6 relative">
            <span className="absolute top-2 left-2 text-[10px] bg-white/10 border border-white/15 px-2 py-0.5 rounded text-white/50">image — render 3D villa</span>
            <span className="text-white/30 text-sm font-mono">visuel principal</span>
          </div>

          <CtaButton label="Accéder à tous les plans · 29 900 FCFA →" />
          <p className="text-center text-[11px] text-white/40 mt-2">Paiement Mobile Money · Accès à vie</p>

          <Gauge total={total} rem={rem} pct={pct} foot="Prix de lancement · Profitez avant la fin des places disponibles" />
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
            Devis flous, plans inadaptés au climat sur internet, allers-retours avec l&apos;architecte. Vous perdez du temps et de l&apos;argent avant même de commencer.
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
          <p className="text-sm text-muted mb-6">Tout ce qu&apos;il faut pour démarrer votre projet — au même endroit.</p>

          <div className="grid grid-cols-2 gap-3">
            {/* Full-width card */}
            <div className="col-span-2 bg-surface border border-outline/10 rounded-2xl p-4">
              <div className="w-7 h-7 rounded-lg border border-outline/10 text-primary flex items-center justify-center mb-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">+50 plans Villa &amp; Duplex</p>
              <p className="text-xs text-muted leading-relaxed">Un catalogue varié, régulièrement enrichi.</p>
            </div>
            {[
              { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>, title: "Plans de distribution", desc: "Vue intérieure détaillée." },
              { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>, title: "Devis estimatif", desc: "Budgétisez avant de construire." },
              { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>, title: "Adapté à l'Afrique", desc: "Conçu pour les réalités locales." },
              { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>, title: "Accès immédiat", desc: "Code SMS + email après paiement." },
            ].map((b, i) => (
              <div key={i} className="bg-surface border border-outline/10 rounded-2xl p-4">
                <div className="w-7 h-7 rounded-lg border border-outline/10 text-primary flex items-center justify-center mb-3">{b.icon}</div>
                <p className="text-sm font-semibold text-foreground mb-1">{b.title}</p>
                <p className="text-xs text-muted leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted mt-6 mb-1">Exemple sur un plan :</p>
          <SalesSlider />
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
            {PLANS.map((p, i) => (
              <div key={i} className="bg-background border border-outline/10 rounded-xl overflow-hidden">
                <div className="aspect-[5/3] bg-[repeating-linear-gradient(135deg,#F1F4F7_0_12px,#FFFFFF_12px_24px)] flex items-center justify-center">
                  <span className="text-xs text-muted/50 font-mono">{p.type.toLowerCase()}</span>
                </div>
                <div className="px-3 py-2.5">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-muted/60">{p.type}</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{p.code} · {p.ch} ch.</p>
                  <p className="text-xs text-muted">{p.m2} m²</p>
                </div>
              </div>
            ))}
            {/* +44 card */}
            <div className="col-span-2 bg-[#DCEAE9] border border-[#DCEAE9] rounded-xl px-4 py-5 flex items-center justify-center gap-3">
              <span className="text-3xl font-bold text-primary">+44</span>
              <span className="text-sm text-primary/70">autres plans inclus dans votre accès</span>
            </div>
          </div>

          <div className="mt-5">
            <CtaButton label="Débloquer les 50 plans · 29 900 FCFA →" />
          </div>
        </div>
      </section>

      {/* ── 5. PREUVE SOCIALE ──────────────────────────────────── */}
      <section className="bg-[#DCEAE9] border-b border-primary/10 px-4 py-12">
        <div className="max-w-xl mx-auto">
          <SectionLabel text="Ils ont trouvé leur plan" />

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

          <div className="grid grid-cols-2 gap-3">
            {[
              { name: "Aminata S.", loc: "Côte d'Ivoire" },
              { name: "Moussa K.", loc: "Sénégal"        },
              { name: "Fatou D.",  loc: "Cameroun"       },
              { name: "Kofi A.",   loc: "Ghana"          },
            ].map((v, i) => (
              <div key={i} className="bg-surface border border-outline/10 rounded-xl overflow-hidden">
                <div className="aspect-[9/16] bg-background flex items-center justify-center relative">
                  <span className="absolute top-2 left-2 text-[10px] bg-surface border border-outline/10 px-2 py-0.5 rounded text-muted">vidéo 9:16</span>
                  <span className="w-10 h-10 rounded-full bg-white/90 border border-outline/10 flex items-center justify-center text-accent">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                  </span>
                </div>
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold text-foreground">{v.name}</p>
                  <p className="text-[11px] text-muted">{v.loc}</p>
                </div>
              </div>
            ))}
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
                { label: "50 plans Villa & Duplex",        incl: true  },
                { label: "Devis estimatif détaillé par plan", incl: true },
                { label: "Plans de distribution",          incl: true  },
                { label: "Accès à vie · mises à jour",     incl: true  },
                { label: "Support WhatsApp prioritaire",   incl: true  },
                { label: "Garantie 14 jours",              incl: true  },
              ].map((item, i) => (
                <li key={i} className="flex justify-between items-center py-3 gap-3 text-sm">
                  <span className="flex items-center gap-2.5 text-foreground">
                    <span className="text-primary shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6"/></svg>
                    </span>
                    {item.label}
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-primary whitespace-nowrap">Inclus</span>
                </li>
              ))}
            </ul>

            <div className="flex justify-between items-baseline pt-3 border-t border-outline/10 mt-1 mb-4">
              <span className="text-xs text-muted">Valeur totale</span>
              <span className="text-sm font-semibold text-muted line-through">300 000 FCFA</span>
            </div>

            {/* Price box */}
            <div className="bg-primary rounded-xl px-5 py-4 mb-4 text-center">
              <p className="text-2xl font-bold text-white tracking-tight">Maintenant : 29 900 FCFA</p>
              <p className="text-xs text-white/60 mt-1">paiement unique</p>
            </div>

            {/* Momo logos */}
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {["Orange Money", "MTN MoMo"].map(m => (
                <span key={m} className="text-[11px] font-semibold px-3 py-1.5 border border-outline/10 rounded-lg text-muted bg-background">{m}</span>
              ))}
            </div>

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
              { n: "1", title: "Vous réglez en Mobile Money",    desc: "Orange Money, MTN — en moins de 2 minutes." },
              { n: "2", title: "Vous recevez votre code",        desc: "Par SMS et email, immédiatement après le paiement." },
              { n: "3", title: "Vous accédez à tous les plans",  desc: "Entrez votre code et explorez. Pas de compte, pas de mot de passe." },
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
            <details><summary>C&apos;est quoi exactement le Catalogue Premium ?</summary><p>Un catalogue de 50 plans (villas et duplex) conçus pour l&apos;Afrique, avec devis estimatifs et plans de distribution inclus.</p></details>
            <details><summary>Comment je reçois mon accès ?</summary><p>Dès le paiement confirmé, un code à 4 caractères vous est envoyé par SMS et email. Vous l&apos;entrez sur le site, accès immédiat.</p></details>
            <details><summary>Les plans sont-ils adaptés à mon pays ?</summary><p>Oui. Tous nos plans sont conçus pour les réalités africaines : climat, matériaux locaux, configurations de terrain courantes.</p></details>
            <details><summary>Et si ça ne me convient pas ?</summary><p>Garantie 14 jours, remboursement sans condition. Vous pouvez nous écrire à tout moment.</p></details>
            <details><summary>Est-ce un paiement unique ou un abonnement ?</summary><p>C&apos;est un paiement unique. Accès à vie, aucun renouvellement automatique.</p></details>
          </div>
        </div>
      </section>

      {/* ── 9. CTA FINAL ───────────────────────────────────────── */}
      <section className="bg-[#FAF1D6] border-b border-[#E7C36C]/40 px-4 py-12">
        <div className="max-w-xl mx-auto">
          <h2 className="text-xl md:text-2xl font-semibold text-primary tracking-tight mb-2">
            Votre projet mérite un vrai plan.<br />Profitez du prix de lancement.
          </h2>
          <div className="flex items-baseline gap-3 mt-4 mb-1">
            <span className="text-3xl font-bold text-foreground tracking-tight">29 900 FCFA</span>
            <span className="text-base text-muted line-through">300 000 FCFA</span>
          </div>

          <GaugeDark total={total} rem={rem} pct={pct} />

          <div className="mt-5">
            <a
              href={CHECKOUT}
              target="_blank"
              rel="noopener noreferrer"
              className="sp-cta sp-cta-final block w-full text-center py-4 px-6 bg-accent text-white font-bold text-base rounded-full border-2 border-accent hover:bg-[#d9781d] hover:border-[#d9781d] transition-colors"
            >
              Je rejoins maintenant · 29 900 FCFA →
            </a>
          </div>

          <div className="flex items-center justify-center gap-2.5 mt-3 text-xs text-primary bg-white/60 border border-primary/10 rounded-full px-4 py-2.5">
            <svg className="shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>
            </svg>
            <span className="font-semibold">Satisfait ou remboursé · 14 jours — Aucune question posée</span>
          </div>
        </div>
      </section>
    </>
  );
}
