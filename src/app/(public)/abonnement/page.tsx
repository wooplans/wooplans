"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type CountryCode = "cm" | "sn" | "ci" | "ml";
type OfferVariant = "fomo" | "value" | "compare";

const COUNTRIES: Record<CountryCode, {
  name: string; adj: string; adjLoc: string;
  momoShort: string; momoStep: string; momoList: string[];
}> = {
  cm: { name: "Cameroun", adj: "pour le Cameroun", adjLoc: "au Cameroun", momoShort: "Orange Money, MTN", momoStep: "Orange Money, MTN — moins de 2 minutes.", momoList: ["Orange Money", "MTN MoMo"] },
  sn: { name: "Sénégal", adj: "pour le Sénégal", adjLoc: "au Sénégal", momoShort: "Wave, Orange Money", momoStep: "Wave, Orange Money, Free Money — moins de 2 minutes.", momoList: ["Wave", "Orange Money", "Free Money"] },
  ci: { name: "Côte d'Ivoire", adj: "pour la Côte d'Ivoire", adjLoc: "en Côte d'Ivoire", momoShort: "Wave, Orange, MTN", momoStep: "Wave, Orange Money, MTN, Moov — moins de 2 minutes.", momoList: ["Wave", "Orange Money", "MTN MoMo", "Moov"] },
  ml: { name: "Mali", adj: "pour le Mali", adjLoc: "au Mali", momoShort: "Orange, Moov", momoStep: "Orange Money, Moov Money, Wave — moins de 2 minutes.", momoList: ["Orange Money", "Moov Money", "Wave"] },
};

function useGauge() {
  const calc = useCallback(() => {
    const now = new Date();
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
    const elapsed = (now.getTime() - dayStart.getTime()) / 1000;
    const dayProgress = Math.min(elapsed / (23 * 3600), 1);
    const dayBase = Math.floor((now.getTime() - new Date("2026-01-01").getTime()) / 86400000);
    const total = 500 + Math.max(0, dayBase) * 20 + Math.floor(dayProgress * 20);
    const rem = Math.max(5, 25 - Math.floor(dayProgress * 20));
    const pct = 88 + ((25 - rem) / 20) * 8;
    return { total, rem, pct };
  }, []);
  const [data, setData] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setData(calc()), 60000);
    return () => clearInterval(id);
  }, [calc]);
  return data;
}

function IFlame() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3c2 3 1 5-1 7s-3 4-1 7c-3 0-6-3-6-7 0-3 2-4 3-2 0-4 3-7 5-5z" />
    </svg>
  );
}
function ICheck({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12l5 5L20 6" />
    </svg>
  );
}
function IShield() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" />
    </svg>
  );
}
function IPin() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function GaugeBar({ total, rem, pct, foot }: { total: number; rem: number; pct: number; foot?: string }) {
  return (
    <div className="spw-jauge">
      <div className="spw-jauge-top">
        <span className="spw-joined"><span>{total}</span> personnes ont rejoint</span>
        <span className="spw-remain"><IFlame /> <span>{rem}</span> places restantes</span>
      </div>
      <div className="spw-bar-bg"><div className="spw-bar-fill" style={{ width: `${pct}%` }} /></div>
      {foot && <div className="spw-jauge-foot">{foot}</div>}
    </div>
  );
}

function Guarantee() {
  return (
    <div className="spw-guarantee spw-gap12">
      <IShield />
      <div><b>Satisfait ou remboursé · 14 jours</b><span>Aucune question posée</span></div>
    </div>
  );
}

function MomoList({ list }: { list: string[] }) {
  return (
    <div className="spw-momo">
      {list.map((m) => <span key={m}>{m}</span>)}
    </div>
  );
}

function SalesSlider() {
  const slides = [
    { tag: "render 3D — V-023", label: "vue extérieure", title: "Vue extérieure 3D", desc: "Façades · perspectives", special: false },
    { tag: "plan — V-023", label: "distribution intérieure", title: "Plan de distribution", desc: "Pièces · surfaces · circulation", special: false },
    { tag: "devis — V-023", label: "tableau estimatif", title: "Devis estimatif", desc: "Matériaux · main d'œuvre · total", special: false },
    { tag: null, label: null, title: "Un seul accès. Tout débloqué.", desc: "Villas · duplex · surfaces variées", special: true },
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
    <div className="spw-slider">
      <div className="spw-viewport">
        <div className="spw-track" style={{ transform: `translateX(-${idx * 100}%)` }}>
          {slides.map((s, i) => (
            <div key={i} className="spw-slide">
              {s.special ? (
                <div className="spw-ph spw-ph-special"><b>+50</b><span style={{ fontFamily: "var(--spw-mono)", fontSize: 11, textTransform: "none" }}>plans inclus</span></div>
              ) : (
                <div className="spw-ph"><span className="spw-tag">{s.tag}</span>{s.label}</div>
              )}
              <div className="spw-cap"><h4>{s.title}</h4><p>{s.desc}</p></div>
            </div>
          ))}
        </div>
      </div>
      <div className="spw-arrows">
        <button onClick={() => { go(idx - 1); reset(); }} aria-label="précédent">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <button onClick={() => { go(idx + 1); reset(); }} aria-label="suivant">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      </div>
      <div className="spw-slider-dots">
        {slides.map((_, i) => (
          <button key={i} className={`spw-dot${idx === i ? " on" : ""}`} onClick={() => { go(i); reset(); }} aria-label={String(i + 1)} />
        ))}
      </div>
    </div>
  );
}

const PAGE_CSS = `
  .spw {
    --spw-bg:#F5F7F9; --spw-paper:#FFFFFF; --spw-ink:#1E2933;
    --spw-g700:#374151; --spw-g500:#6B7280; --spw-g400:#9CA3AF;
    --spw-g200:#E5E7EB; --spw-g100:#F1F4F7;
    --spw-primary:#0F5B59; --spw-primary-soft:#DCEAE9; --spw-primary-ink:#0A3D3B;
    --spw-acc:#F08A2E; --spw-acc-soft:#FDE9D2; --spw-acc-ink:#8A4A0F;
    --spw-secondary:#C75B3A; --spw-secondary-soft:#FAE0D5; --spw-secondary-ink:#7A2F17;
    --spw-highlight:#E7C36C; --spw-highlight-soft:#FAF1D6;
    --spw-ok:#0F5B59; --spw-ok-soft:#DCEAE9;
    --spw-warn:#C75B3A;
    --spw-serif: ui-serif, Georgia, "Times New Roman", serif;
    --spw-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    --spw-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    font-family: var(--spw-sans);
    color: var(--spw-ink);
    background: var(--spw-bg);
    -webkit-font-smoothing: antialiased;
  }
  .spw *, .spw *::before, .spw *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* Page container */
  .spw-page {
    max-width: 480px;
    margin: 0 auto;
    background: var(--spw-paper);
    box-shadow: 0 0 40px -20px rgba(0,0,0,.15);
    font-family: var(--spw-sans);
    color: var(--spw-ink);
  }

  /* Section base */
  .spw-section { padding: 22px 18px; border-bottom: 1px solid var(--spw-g200); background: var(--spw-paper); }
  .spw-section:nth-child(even) { background: var(--spw-bg); }

  /* Labels */
  .spw-label {
    font-family: var(--spw-mono); font-size: 10px; text-transform: uppercase;
    letter-spacing: .1em; color: var(--spw-g400); display: flex; align-items: center;
    gap: 8px; margin-bottom: 14px;
  }
  .spw-label::before { content:""; display:inline-block; width:16px; height:1px; background:var(--spw-g400); }

  /* Headings */
  .spw-page h1 { font-family: var(--spw-serif); font-size: 26px; line-height: 1.18; letter-spacing: -.01em; font-weight: 500; margin-bottom: 10px; color: var(--spw-primary); }
  .spw-page h2 { font-family: var(--spw-serif); font-size: 21px; line-height: 1.25; font-weight: 500; margin-bottom: 8px; color: var(--spw-primary); }
  .spw-page h3 { font-family: var(--spw-serif); font-size: 17px; line-height: 1.3; font-weight: 500; margin-bottom: 6px; color: var(--spw-primary); }

  /* Paragraphs */
  .spw-page p { font-size: 14px; line-height: 1.55; color: var(--spw-g700); }
  .spw-page p.lead { font-size: 15px; color: var(--spw-ink); }
  .spw-page p.muted { color: var(--spw-g500); font-size: 13px; }
  .spw-page p + p { margin-top: 8px; }

  /* Pills */
  .spw-pill { display:inline-flex; align-items:center; gap:6px; font-size:11px; padding:4px 9px; border-radius:99px; border:1px solid var(--spw-g200); background:var(--spw-paper); color:var(--spw-g700); font-weight:500; }
  .spw-pill.acc { background:var(--spw-secondary-soft); border-color:var(--spw-secondary-soft); color:var(--spw-secondary-ink); }
  .spw-pill.ok  { background:var(--spw-primary-soft); border-color:var(--spw-primary-soft); color:var(--spw-primary); }
  .spw-pill-row { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:14px; }

  /* Placeholder boxes */
  .spw-ph {
    position: relative; width: 100%;
    background: repeating-linear-gradient(135deg, var(--spw-g100) 0 12px, var(--spw-paper) 12px 24px);
    border: 1px dashed var(--spw-g200); border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    color: var(--spw-g400); font-family: var(--spw-mono); font-size: 11px;
    text-transform: lowercase; letter-spacing: .02em;
    aspect-ratio: 16/10;
  }
  .spw-ph.hero { aspect-ratio: 4/3; margin-bottom: 14px; }
  .spw-ph-special {
    aspect-ratio: 16/10;
    background: var(--spw-primary-soft) !important;
    border-color: transparent !important;
    color: var(--spw-primary) !important;
    font-family: var(--spw-serif) !important;
    font-size: 20px !important;
    flex-direction: column; gap: 4px;
    display: flex; align-items: center; justify-content: center;
    width: 100%;
    border-radius: 0;
    border-bottom: 1px dashed var(--spw-g200);
  }
  .spw-tag { position:absolute; top:8px; left:8px; background:var(--spw-paper); border:1px solid var(--spw-g200); padding:3px 7px; border-radius:4px; font-size:10px; color:var(--spw-g500); }

  /* CTA buttons */
  .spw-cta {
    display: flex; align-items: center; justify-content: center; gap: 10px;
    width: 100%; font: inherit; font-size: 15px; font-weight: 600;
    padding: 15px 16px; background: var(--spw-acc); color: #fff;
    border: none; border-radius: 10px; cursor: pointer; line-height: 1.2;
    text-decoration: none;
    position: relative; overflow: hidden;
    animation: spw-cta-shake 6s ease-in-out 2s infinite;
  }
  .spw-cta::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(100deg, transparent 20%, rgba(255,255,255,.45) 50%, transparent 80%);
    transform: translateX(-130%) skewX(-15deg);
    animation: spw-cta-shimmer 6s ease-in-out 2s infinite;
    pointer-events: none;
  }
  .spw-cta:hover { background: var(--spw-acc-ink); }
  .spw-cta-sub { text-align: center; font-size: 11px; color: var(--spw-g500); margin-top: 8px; }

  /* Hero section teal */
  .spw-hero-s {
    background: var(--spw-primary) !important;
    border-bottom-color: var(--spw-primary-ink) !important;
  }
  .spw-hero-s h1 { color: var(--spw-paper) !important; }
  .spw-hero-s p, .spw-hero-s p.lead, .spw-hero-s p.muted { color: rgba(255,255,255,.88) !important; }
  .spw-hero-s .spw-label { color: rgba(255,255,255,.6) !important; }
  .spw-hero-s .spw-label::before { background: rgba(255,255,255,.35) !important; }
  .spw-hero-s .spw-pill.acc { background: rgba(199,91,58,.55); border-color: rgba(199,91,58,.6); color: #fff; }
  .spw-hero-s .spw-pill.ok  { background: rgba(255,255,255,.15); border-color: rgba(255,255,255,.28); color: #fff; }
  .spw-hero-s .spw-cta-sub { color: rgba(255,255,255,.65); }
  .spw-hero-s .spw-ph {
    background: repeating-linear-gradient(135deg,rgba(255,255,255,.07) 0 12px,rgba(255,255,255,.03) 12px 24px);
    border-color: rgba(255,255,255,.18); color: rgba(255,255,255,.45);
  }
  .spw-hero-s .spw-tag { background: rgba(255,255,255,.1); border-color: rgba(255,255,255,.2); color: rgba(255,255,255,.65); }
  .spw-hero-s .spw-jauge { background: rgba(255,255,255,.1); border-color: rgba(255,255,255,.15); }
  .spw-hero-s .spw-joined { color: rgba(255,255,255,.7); }
  .spw-hero-s .spw-joined::before { background: #E7C36C; }
  .spw-hero-s .spw-bar-bg { background: rgba(255,255,255,.18); }
  .spw-hero-s .spw-bar-fill { background: #F08A2E; }
  .spw-hero-s .spw-jauge-foot { color: rgba(255,255,255,.5); }
  .spw-hero-s .spw-remain { color: #F08A2E !important; }

  /* Proof section */
  .spw-proof-s { background: var(--spw-primary-soft) !important; }
  /* Guarantee section */
  .spw-guarantee-s { background: var(--spw-highlight-soft) !important; border-bottom-color: var(--spw-highlight) !important; }

  /* Gauge */
  .spw-jauge { background:var(--spw-paper); border:1px solid var(--spw-g200); border-radius:10px; padding:12px 14px; margin:14px 0; }
  .spw-jauge-top { display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-bottom:8px; gap:8px; flex-wrap:wrap; }
  .spw-joined { color:var(--spw-g500); display:inline-flex; gap:6px; align-items:center; }
  .spw-joined::before { content:""; width:7px; height:7px; border-radius:50%; background:var(--spw-ok); display:inline-block; }
  .spw-remain { color:var(--spw-secondary); font-weight:600; display:inline-flex; gap:5px; align-items:center; animation: spw-blink-urgent 3s ease-in-out infinite; }
  .spw-bar-bg { height:7px; background:var(--spw-g100); border-radius:99px; overflow:hidden; }
  .spw-bar-fill { height:100%; background:var(--spw-secondary); border-radius:99px; transition:width .8s ease; }
  .spw-jauge-foot { font-size:11px; color:var(--spw-g500); text-align:center; margin-top:8px; }

  /* Benefits grid */
  .spw-benefits { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:6px; }
  .spw-ben { background:var(--spw-paper); border:1px solid var(--spw-g200); border-radius:10px; padding:12px; }
  .spw-ben.full { grid-column:1/-1; }
  .spw-ben-i { width:26px; height:26px; display:flex; align-items:center; justify-content:center; border:1px solid var(--spw-g200); border-radius:6px; color:var(--spw-primary); margin-bottom:8px; }
  .spw-ben h4 { font-family:var(--spw-sans); font-size:13px; font-weight:600; margin-bottom:3px; color:var(--spw-ink); }
  .spw-ben p { font-size:12px; color:var(--spw-g500); line-height:1.45; }

  /* Slider */
  .spw-slider { position:relative; border:1px solid var(--spw-g200); border-radius:10px; overflow:hidden; background:var(--spw-paper); margin-top:8px; }
  .spw-viewport { overflow:hidden; }
  .spw-track { display:flex; transition:transform .35s ease; }
  .spw-slide { min-width:100%; flex-shrink:0; }
  .spw-slide .spw-ph { border-radius:0; border:none; border-bottom:1px dashed var(--spw-g200); }
  .spw-cap { padding:10px 14px; }
  .spw-cap h4 { font-family:var(--spw-sans); font-size:13px; font-weight:600; margin-bottom:2px; color:var(--spw-ink); }
  .spw-cap p { font-size:12px; color:var(--spw-g500); }
  .spw-slider-dots { display:flex; justify-content:center; gap:6px; padding:8px 0 10px; background:var(--spw-paper); }
  .spw-dot { width:7px; height:7px; border-radius:50%; background:var(--spw-g200); cursor:pointer; border:none; padding:0; }
  .spw-dot.on { background:var(--spw-acc); width:18px; border-radius:99px; }
  .spw-arrows { position:absolute; top:38%; left:0; right:0; display:flex; justify-content:space-between; padding:0 8px; pointer-events:none; }
  .spw-arrows button { pointer-events:all; width:32px; height:32px; border-radius:50%; border:1px solid var(--spw-g200); background:var(--spw-paper); cursor:pointer; font:inherit; color:var(--spw-g700); display:flex; align-items:center; justify-content:center; }

  /* Plans grid */
  .spw-plans { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px; }
  .spw-plan { background:var(--spw-paper); border:1px solid var(--spw-g200); border-radius:10px; overflow:hidden; }
  .spw-plan .spw-ph { aspect-ratio:5/3; border-radius:0; border:none; border-bottom:1px dashed var(--spw-g200); }
  .spw-plan-info { padding:8px 10px; }
  .spw-plan-t { font-family:var(--spw-mono); font-size:9px; text-transform:uppercase; letter-spacing:.06em; color:var(--spw-g400); }
  .spw-plan-n { font-size:13px; font-weight:600; color:var(--spw-ink); margin-top:1px; }
  .spw-plan-m { font-size:11px; color:var(--spw-g500); }
  .spw-plan-more { grid-column:1/-1; background:var(--spw-primary-soft); border:1px solid var(--spw-primary-soft); border-radius:10px; padding:14px; display:flex; gap:10px; align-items:center; justify-content:center; color:var(--spw-primary); }
  .spw-plan-more b { font-family:var(--spw-serif); font-size:22px; font-weight:600; color:var(--spw-primary); }
  .spw-plan-more span { font-size:12px; }

  /* Testimonials */
  .spw-vids { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px; }
  .spw-vid { background:var(--spw-paper); border:1px solid var(--spw-g200); border-radius:10px; overflow:hidden; }
  .spw-vid .spw-ph { aspect-ratio:9/16; border-radius:0; border:none; border-bottom:1px dashed var(--spw-g200); position:relative; }
  .spw-vid-play { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; }
  .spw-vid-play span { width:38px; height:38px; border-radius:50%; background:rgba(255,255,255,.92); display:flex; align-items:center; justify-content:center; color:var(--spw-acc); font-size:14px; border:1px solid var(--spw-g200); }
  .spw-vid-meta { padding:8px 10px; }
  .spw-vid-meta b { font-size:12px; font-weight:600; display:block; }
  .spw-vid-meta span { font-size:11px; color:var(--spw-g500); }

  /* Stats */
  .spw-stats { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-top:6px; }
  .spw-stat { background:var(--spw-paper); border:1px solid var(--spw-g200); border-radius:10px; padding:12px 8px; text-align:center; }
  .spw-stat b { font-family:var(--spw-serif); font-size:22px; font-weight:500; display:block; }
  .spw-stat span { font-size:11px; color:var(--spw-g500); }

  /* Steps */
  .spw-steps { display:flex; flex-direction:column; gap:8px; margin-top:6px; }
  .spw-step { display:flex; gap:12px; align-items:flex-start; background:var(--spw-paper); border:1px solid var(--spw-g200); border-radius:10px; padding:12px; }
  .spw-step-num { flex-shrink:0; width:28px; height:28px; border-radius:50%; background:var(--spw-primary-soft); color:var(--spw-primary); font-family:var(--spw-serif); font-weight:600; display:flex; align-items:center; justify-content:center; font-size:14px; }
  .spw-step-body b { font-size:13px; display:block; margin-bottom:2px; }
  .spw-step-body span { font-size:12px; color:var(--spw-g500); line-height:1.45; }

  /* FAQ */
  .spw-page details { border-bottom:1px solid var(--spw-g200); padding:14px 0; }
  .spw-page details:first-of-type { border-top:1px solid var(--spw-g200); }
  .spw-page details summary { list-style:none; cursor:pointer; font-size:14px; font-weight:600; display:flex; justify-content:space-between; align-items:center; gap:10px; }
  .spw-page details summary::-webkit-details-marker { display:none; }
  .spw-page details summary::after { content:"+"; font-family:var(--spw-serif); font-size:20px; color:var(--spw-g400); transition:transform .2s; }
  .spw-page details[open] summary::after { content:"–"; }
  .spw-page details p { font-size:13px; color:var(--spw-g500); line-height:1.55; margin-top:8px; }

  /* Offer / pricing */
  .spw-offre { background:var(--spw-paper); border:1px solid var(--spw-g200); border-radius:14px; padding:18px; margin-top:10px; }
  .spw-price { display:flex; align-items:baseline; gap:10px; margin:6px 0 4px; }
  .spw-price .new { font-family:var(--spw-serif); font-size:30px; font-weight:600; color:var(--spw-ink); letter-spacing:-.01em; }
  .spw-price .old { font-size:14px; color:var(--spw-g400); text-decoration:line-through; }
  .spw-price .neg { background:var(--spw-secondary-soft); color:var(--spw-secondary-ink); padding:2px 8px; border-radius:99px; font-size:11px; font-weight:600; }
  .spw-micro { font-size:11px; color:var(--spw-g500); font-family:var(--spw-mono); margin-bottom:10px; }

  /* Mobile money logos */
  .spw-momo { display:flex; flex-wrap:wrap; gap:6px; margin:10px 0; }
  .spw-momo span { font-size:11px; font-weight:600; padding:5px 10px; border:1px solid var(--spw-g200); border-radius:6px; color:var(--spw-g700); background:var(--spw-paper); }

  /* Guarantee banner */
  .spw-guarantee { display:flex; gap:10px; align-items:center; justify-content:center; padding:10px 12px; background:var(--spw-primary-soft); border-radius:10px; }
  .spw-guarantee svg { color:var(--spw-primary); flex-shrink:0; }
  .spw-guarantee b { font-size:12px; color:var(--spw-primary); font-weight:600; }
  .spw-guarantee span { font-size:11px; color:var(--spw-g700); display:block; }

  /* Value list (offer v2) */
  .spw-value-list { list-style:none; margin:8px 0 0; padding:0; }
  .spw-value-list li { display:flex; justify-content:space-between; gap:10px; align-items:baseline; padding:9px 0; border-bottom:1px dashed var(--spw-g200); font-size:13px; }
  .spw-value-list li:last-child { border-bottom:none; }
  .spw-vl-name { display:flex; gap:8px; align-items:center; color:var(--spw-ink); line-height:1.35; }
  .spw-vl-check { flex-shrink:0; width:16px; height:16px; display:flex; align-items:center; justify-content:center; color:var(--spw-primary); }
  .spw-vl-val { font-family:var(--spw-mono); font-size:11px; color:var(--spw-g500); white-space:nowrap; }
  .spw-vl-val.incl { color:var(--spw-primary); font-weight:600; }
  .spw-value-total { display:flex; justify-content:space-between; align-items:baseline; padding:10px 0 0; border-top:1px solid var(--spw-g200); margin-top:4px; font-size:12px; color:var(--spw-g500); }
  .spw-value-total b { font-family:var(--spw-serif); font-size:15px; color:var(--spw-g700); text-decoration:line-through; font-weight:500; }
  .spw-value-today { background:var(--spw-primary); color:var(--spw-paper); border-radius:10px; padding:14px 16px; margin:10px 0; text-align:center; }
  .spw-value-today b { font-family:var(--spw-serif); font-size:22px; display:block; font-weight:600; letter-spacing:-.01em; }
  .spw-value-today span { font-size:11px; opacity:.85; display:block; margin-top:2px; }

  /* Compare table (offer v3) */
  .spw-compare-tbl { display:grid; grid-template-columns:1fr 1fr; border:1px solid var(--spw-g200); border-radius:10px; overflow:hidden; margin:10px 0; background:var(--spw-paper); }
  .spw-compare-tbl .head { font-family:var(--spw-serif); font-weight:600; font-size:12px; padding:10px 8px; text-align:center; background:var(--spw-ink); color:var(--spw-paper); }
  .spw-compare-tbl .head.acc { background:var(--spw-primary); }
  .spw-compare-tbl .rowlabel { grid-column:1/-1; background:var(--spw-g100); padding:6px 10px; font-family:var(--spw-mono); font-size:9px; text-transform:uppercase; letter-spacing:.06em; color:var(--spw-g500); border-top:1px solid var(--spw-g200); }
  .spw-compare-tbl .cell { padding:9px 10px; font-size:12px; color:var(--spw-g700); line-height:1.35; border-top:1px solid var(--spw-g200); }
  .spw-compare-tbl .cell.lose { color:var(--spw-warn); }
  .spw-compare-tbl .cell.win { color:var(--spw-primary); font-weight:600; background:var(--spw-primary-soft); }
  .spw-savings { background:var(--spw-primary-soft); color:var(--spw-primary); border-radius:10px; padding:12px 14px; font-size:12px; margin:10px 0; text-align:center; line-height:1.4; }
  .spw-savings b { font-family:var(--spw-serif); font-size:18px; display:block; margin-bottom:2px; font-weight:600; }
  .spw-compare-price { display:flex; justify-content:space-between; align-items:baseline; padding:10px 14px; background:var(--spw-primary); color:var(--spw-paper); border-radius:10px; margin:10px 0; }
  .spw-compare-price .label-mini { font-family:var(--spw-mono); font-size:10px; text-transform:uppercase; letter-spacing:.06em; opacity:.7; }
  .spw-compare-price .new { font-family:var(--spw-serif); font-size:22px; font-weight:600; letter-spacing:-.01em; }

  /* Final CTA box */
  .spw-final { background:var(--spw-highlight-soft); border:1px solid var(--spw-highlight); border-radius:14px; padding:20px 18px; margin-top:10px; }
  .spw-final h2 { color:var(--spw-primary); }
  .spw-final p { color:var(--spw-ink); opacity:1; }
  .spw-final .spw-cta { animation: spw-cta-shake-hard 4s ease-in-out infinite, spw-cta-pulse-glow 2s ease-in-out infinite; }
  .spw-final .spw-cta::after { animation: spw-cta-shimmer 3.5s ease-in-out infinite; background: linear-gradient(100deg, transparent 20%, rgba(255,255,255,.65) 50%, transparent 80%); }

  /* Geobar */
  .spw-geobar { display:flex; justify-content:space-between; align-items:center; padding:8px 18px; font-size:11px; color:var(--spw-g500); background:var(--spw-paper); border-bottom:1px dashed var(--spw-g200); }
  .spw-geobar .pin { display:inline-flex; gap:5px; align-items:center; }
  .spw-geobar .pin b { color:var(--spw-g700); font-weight:600; }
  .spw-geo-select { font:inherit; font-size:11px; background:transparent; border:none; color:var(--spw-g500); cursor:pointer; padding:0; }

  /* Tweaks panel */
  .spw-tweaks-toggle { position:fixed; right:18px; bottom:18px; z-index:200; padding:11px 16px; border-radius:99px; background:var(--spw-ink); color:var(--spw-paper); border:none; cursor:pointer; font:inherit; font-size:13px; font-weight:600; display:flex; align-items:center; gap:8px; box-shadow:0 10px 28px -10px rgba(0,0,0,.4); }
  .spw-tweaks-toggle::before { content:""; width:8px; height:8px; border-radius:2px; background:var(--spw-acc); display:inline-block; }
  .spw-tweaks-panel { position:fixed; right:18px; bottom:18px; z-index:201; width:300px; background:var(--spw-paper); border:1px solid var(--spw-g200); border-radius:14px; box-shadow:0 24px 48px -16px rgba(0,0,0,.28); padding:16px; font-size:13px; }
  .spw-tweaks-panel header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
  .spw-tweaks-panel h4 { font-family:var(--spw-serif); font-size:15px; margin:0; display:flex; gap:8px; align-items:baseline; font-weight:500; }
  .spw-tweaks-panel h4::before { content:""; width:8px; height:8px; background:var(--spw-acc); border-radius:2px; display:inline-block; }
  .spw-tweaks-x { background:none; border:none; font-size:22px; color:var(--spw-g500); cursor:pointer; line-height:1; padding:0 4px; }
  .spw-tweaks-ts-label { font-family:var(--spw-mono); font-size:10px; text-transform:uppercase; letter-spacing:.07em; color:var(--spw-g500); margin-bottom:8px; }
  .spw-tweaks-radio { display:flex; flex-direction:column; gap:6px; }
  .spw-tweaks-label { display:flex; gap:10px; align-items:flex-start; padding:10px 12px; border:1px solid var(--spw-g200); border-radius:6px; cursor:pointer; background:var(--spw-bg); }
  .spw-tweaks-label.on { background:var(--spw-acc-soft); border-color:var(--spw-acc); }
  .spw-tweaks-label input { position:absolute; opacity:0; pointer-events:none; }
  .spw-tweaks-rkey { font-family:var(--spw-serif); font-size:14px; font-weight:600; color:var(--spw-g500); min-width:18px; line-height:1.4; }
  .spw-tweaks-label.on .spw-tweaks-rkey { color:var(--spw-acc-ink); }
  .spw-tweaks-rname { font-weight:600; font-size:12px; color:var(--spw-ink); display:block; line-height:1.3; }
  .spw-tweaks-label.on .spw-tweaks-rname { color:var(--spw-acc-ink); }
  .spw-tweaks-rdesc { font-size:11px; color:var(--spw-g500); display:block; margin-top:2px; line-height:1.4; }

  /* Helpers */
  .spw-gap8  { margin-top:8px; }
  .spw-gap12 { margin-top:12px; }
  .spw-gap16 { margin-top:16px; }
  .spw-center { text-align:center; }

  /* Animations */
  @keyframes spw-cta-shake {
    0%,15%,100% { transform: translateX(0) rotate(0deg); }
    2%  { transform: translateX(-5px) rotate(-1.2deg); }
    4%  { transform: translateX( 5px) rotate( 1.2deg); }
    6%  { transform: translateX(-4px) rotate(-.8deg);  }
    8%  { transform: translateX( 4px) rotate( .8deg);  }
    10% { transform: translateX(-2px) rotate(-.4deg);  }
    12% { transform: translateX( 2px) rotate( .4deg);  }
  }
  @keyframes spw-cta-shake-hard {
    0%,18%,100% { transform: translateX(0) rotate(0deg); }
    2%  { transform: translateX(-7px) rotate(-1.8deg); }
    5%  { transform: translateX( 7px) rotate( 1.8deg); }
    8%  { transform: translateX(-5px) rotate(-1deg);   }
    11% { transform: translateX( 5px) rotate( 1deg);   }
    14% { transform: translateX(-3px); }
    16% { transform: translateX( 3px); }
  }
  @keyframes spw-cta-shimmer {
    0%,45%,100% { transform: translateX(-130%) skewX(-15deg); opacity: 0; }
    5%          { opacity: 1; }
    30%         { transform: translateX(130%) skewX(-15deg); opacity: 0; }
  }
  @keyframes spw-cta-pulse-glow {
    0%,100% { box-shadow: 0 0 0 0 rgba(240,138,46,.7); }
    50%     { box-shadow: 0 0 0 12px rgba(240,138,46,0); }
  }
  @keyframes spw-blink-urgent {
    0%, 100% { opacity: 1; } 55% { opacity: 1; }
    65% { opacity: 0.15; } 75% { opacity: 1; }
    85% { opacity: 0.15; } 95% { opacity: 1; }
  }
`;

export default function AbonnementPage() {
  const [country, setCountry] = useState<CountryCode>("cm");
  const [offer, setOffer] = useState<OfferVariant>("value");
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const { total, rem, pct } = useGauge();
  const c = COUNTRIES[country];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
      <div className="spw">
        <div className="spw-page">

          {/* Geobar */}
          <div className="spw-geobar">
            <span className="pin"><IPin /> <b>{c.name}</b></span>
            <span>
              <b>{c.momoShort}</b>
              &nbsp;·&nbsp;
              <select
                className="spw-geo-select"
                value={country}
                onChange={(e) => setCountry(e.target.value as CountryCode)}
                aria-label="Changer de pays"
              >
                <option value="cm">🇨🇲 Cameroun</option>
                <option value="sn">🇸🇳 Sénégal</option>
                <option value="ci">🇨🇮 Côte d&apos;Ivoire</option>
                <option value="ml">🇲🇱 Mali</option>
              </select>
            </span>
          </div>

          <article className="spw-page">

            {/* 1. HERO */}
            <section className="spw-section spw-hero-s">
              <div className="spw-pill-row">
                <span className="spw-pill acc"><IFlame /> Prix de lancement</span>
                <span className="spw-pill ok"><ICheck size={11} /> Accès immédiat</span>
              </div>
              <h1>50 plans de maison pensés {c.adj}, avec devis inclus.</h1>
              <p className="lead">Explorez. Choisissez. Construisez sereinement.</p>
              <div className="spw-ph hero spw-gap12"><span className="spw-tag">image — render 3D villa</span>visuel principal</div>
              <a href="#offre" className="spw-cta">Accéder à tous les plans · 29 900 FCFA <span style={{ fontFamily: "var(--spw-serif)" }}>→</span></a>
              <p className="spw-cta-sub">Paiement Mobile Money · Accès à vie</p>
              <GaugeBar total={total} rem={rem} pct={pct} foot="Prix de lancement · Profitez avant la fin des places disponibles" />
            </section>

            {/* 2. PROBLÈME */}
            <section className="spw-section">
              <div className="spw-label">Le problème</div>
              <h2>Trouver un plan de maison adapté à votre terrain et votre budget n&apos;est pas facile&nbsp;!</h2>
              <p className="muted spw-gap8">Devis flous, plans inadaptés au climat sur internet, allers-retours pour demander les propositions à l&apos;architecte. Vous perdez du temps et de l&apos;argent.</p>
            </section>

            {/* 3. SOLUTION */}
            <section className="spw-section">
              <div className="spw-label">La solution</div>
              <h2>Le catalogue Premium que vous attendiez...</h2>
              <p>Tout ce qu&apos;il faut pour démarrer votre projet — au même endroit.</p>
              <div className="spw-benefits spw-gap12">
                <div className="spw-ben full">
                  <div className="spw-ben-i">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>
                  </div>
                  <h4>+50 plans Villa &amp; Duplex</h4>
                  <p>Un catalogue varié, régulièrement enrichi.</p>
                </div>
                <div className="spw-ben">
                  <div className="spw-ben-i">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                  </div>
                  <h4>Plans de distribution</h4>
                  <p>Vue intérieure détaillée.</p>
                </div>
                <div className="spw-ben">
                  <div className="spw-ben-i">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>
                  </div>
                  <h4>Devis estimatif</h4>
                  <p>Budgétisez avant de construire.</p>
                </div>
                <div className="spw-ben">
                  <div className="spw-ben-i"><IPin /></div>
                  <h4>Adapté {c.adjLoc}</h4>
                  <p>Conçu pour les réalités locales.</p>
                </div>
                <div className="spw-ben">
                  <div className="spw-ben-i">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>
                  </div>
                  <h4>Accès immédiat</h4>
                  <p>Code SMS + email après paiement.</p>
                </div>
              </div>
              <p className="muted spw-gap16">Exemple sur un plan&nbsp;:</p>
              <SalesSlider />
            </section>

            {/* 4. CE QUE VOUS DÉBLOQUEZ */}
            <section className="spw-section">
              <div className="spw-label">Ce que vous débloquez</div>
              <h2>Un seul accès. 50 plans débloqués.</h2>
              <div className="spw-plans spw-gap8">
                {[
                  { type: "Villa", n: "V-001 · 4 ch.", m: "120 m²" },
                  { type: "Duplex", n: "D-005 · 5 ch.", m: "180 m²" },
                  { type: "Villa", n: "V-012 · 3 ch.", m: "95 m²" },
                  { type: "Duplex", n: "D-018 · 6 ch.", m: "210 m²" },
                  { type: "Villa", n: "V-023 · 4 ch.", m: "140 m²" },
                  { type: "Duplex", n: "D-031 · 4 ch.", m: "160 m²" },
                ].map((plan, i) => (
                  <div key={i} className="spw-plan">
                    <div className="spw-ph"><span>{plan.type.toLowerCase()}</span></div>
                    <div className="spw-plan-info">
                      <div className="spw-plan-t">{plan.type}</div>
                      <div className="spw-plan-n">{plan.n}</div>
                      <div className="spw-plan-m">{plan.m}</div>
                    </div>
                  </div>
                ))}
                <div className="spw-plan-more"><b>+44</b><span>autres plans inclus dans votre accès</span></div>
              </div>
              <a href="#offre" className="spw-cta spw-gap16">Débloquer les 50 plans · 29 900 FCFA <span style={{ fontFamily: "var(--spw-serif)" }}>→</span></a>
            </section>

            {/* 5. PREUVE SOCIALE */}
            <section className="spw-section spw-proof-s">
              <div className="spw-label">Ils ont trouvé leur plan</div>
              <div className="spw-stats">
                <div className="spw-stat"><b>{total}+</b><span>Clients satisfaits</span></div>
                <div className="spw-stat"><b>500+</b><span>Projets démarrés</span></div>
                <div className="spw-stat"><b>4,8/5</b><span>satisfaction</span></div>
              </div>
              <div className="spw-vids">
                {[
                  { name: "Aminata S.", loc: "Côte d'Ivoire" },
                  { name: "Moussa K.", loc: "Sénégal" },
                  { name: "Fatou D.", loc: "Cameroun" },
                  { name: "Kofi A.", loc: "Ghana" },
                ].map((v, i) => (
                  <div key={i} className="spw-vid">
                    <div className="spw-ph" style={{ aspectRatio: "9/16", borderRadius: 0, border: "none", borderBottom: "1px dashed var(--spw-g200)", position: "relative" }}>
                      <div className="spw-vid-play">
                        <span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                        </span>
                      </div>
                      <span className="spw-tag">vidéo 9:16</span>
                    </div>
                    <div className="spw-vid-meta"><b>{v.name}</b><span>{v.loc}</span></div>
                  </div>
                ))}
              </div>
            </section>

            {/* 6. OFFRE */}
            <section className="spw-section" id="offre">
              <div className="spw-label">L&apos;offre</div>

              {/* V1 — FOMO */}
              {offer === "fomo" && (
                <div>
                  <h2>Accédez à tout. Une seule fois.</h2>
                  <div className="spw-offre">
                    <div className="spw-price">
                      <span className="new">29 900 FCFA</span>
                      <span className="old">260 000 FCFA</span>
                      <span className="neg">−50&nbsp;%</span>
                    </div>
                    <div className="spw-micro">Soit moins de 600 FCFA par plan · accès à vie</div>
                    <GaugeBar total={total} rem={rem} pct={pct} foot="Prix de lancement · se renouvelle à minuit" />
                    <MomoList list={c.momoList} />
                    <a href="#" className="spw-cta spw-gap8">Débloquer mes 50 plans <span style={{ fontFamily: "var(--spw-serif)" }}>→</span></a>
                    <Guarantee />
                  </div>
                </div>
              )}

              {/* V2 — VALEUR */}
              {offer === "value" && (
                <div>
                  <h2>Tout ce qui est inclus dans votre Catalogue Premium.</h2>
                  <div className="spw-offre">
                    <ul className="spw-value-list">
                      {[
                        { label: "50 plans Villa & Duplex", incl: true },
                        { label: "Devis estimatif détaillé par plan", incl: false },
                        { label: "Plans de distribution", incl: true },
                        { label: "Accès à vie · mises à jour", incl: true },
                        { label: "Support WhatsApp prioritaire", incl: true },
                        { label: "Garantie 14 jours", incl: true },
                      ].map((item, i) => (
                        <li key={i}>
                          <span className="spw-vl-name">
                            <span className="spw-vl-check"><ICheck size={14} /></span>
                            {item.label}
                          </span>
                          <span className={`spw-vl-val${item.incl ? " incl" : ""}`}>Inclus</span>
                        </li>
                      ))}
                    </ul>
                    <div className="spw-value-total"><span>Valeur totale</span><b>300 000 FCFA</b></div>
                    <div className="spw-value-today">
                      <b>Maintenant&nbsp;: 29 900 FCFA</b>
                      <span>paiement unique</span>
                    </div>
                    <MomoList list={c.momoList} />
                    <a href="#" className="spw-cta spw-gap8">Tout débloquer · 29 900 FCFA <span style={{ fontFamily: "var(--spw-serif)" }}>→</span></a>
                    <Guarantee />
                  </div>
                </div>
              )}

              {/* V3 — COMPARAISON */}
              {offer === "compare" && (
                <div>
                  <h2>Pourquoi payer 200 000 FCFA pour un seul plan&nbsp;?</h2>
                  <p className="muted spw-gap8">Voici ce que coûte habituellement un plan personnalisé chez un architecte indépendant.</p>
                  <div className="spw-offre">
                    <div className="spw-compare-tbl">
                      <div className="head">Architecte indépendant</div>
                      <div className="head acc">Wooplans</div>
                      <div className="rowlabel">Prix</div>
                      <div className="cell lose">200 000 – 500 000 FCFA</div>
                      <div className="cell win">29 900 FCFA</div>
                      <div className="rowlabel">Délai</div>
                      <div className="cell lose">6 à 12 semaines</div>
                      <div className="cell win">Accès immédiat</div>
                      <div className="rowlabel">Contenu</div>
                      <div className="cell lose">1 plan unique</div>
                      <div className="cell win">50 plans + devis</div>
                      <div className="rowlabel">Devis estimatif</div>
                      <div className="cell lose">Non · facturé à part</div>
                      <div className="cell win">Inclus par plan</div>
                    </div>
                    <div className="spw-savings"><b>~170 000 FCFA d&apos;économies</b>sur votre premier projet, sans compromis sur la qualité</div>
                    <div className="spw-compare-price">
                      <span className="label-mini">Votre prix aujourd&apos;hui</span>
                      <span className="new">29 900 FCFA</span>
                    </div>
                    <MomoList list={c.momoList} />
                    <a href="#" className="spw-cta spw-gap8">Commencer avec Wooplans <span style={{ fontFamily: "var(--spw-serif)" }}>→</span></a>
                    <Guarantee />
                  </div>
                </div>
              )}
            </section>

            {/* 7. COMMENT ÇA MARCHE */}
            <section className="spw-section">
              <div className="spw-label">Comment ça marche</div>
              <h2>En 3 étapes.</h2>
              <div className="spw-steps">
                <div className="spw-step">
                  <div className="spw-step-num">1</div>
                  <div className="spw-step-body"><b>Vous réglez en Mobile Money</b><span>{c.momoStep}</span></div>
                </div>
                <div className="spw-step">
                  <div className="spw-step-num">2</div>
                  <div className="spw-step-body"><b>Vous recevez votre code</b><span>Par SMS et email, immédiatement.</span></div>
                </div>
                <div className="spw-step">
                  <div className="spw-step-num">3</div>
                  <div className="spw-step-body"><b>Vous accédez à tous les plans</b><span>Entrez votre code et explorez. Pas de compte, pas de mot de passe.</span></div>
                </div>
              </div>
            </section>

            {/* 8. FAQ */}
            <section className="spw-section">
              <div className="spw-label">FAQ</div>
              <h2>Une question&nbsp;?</h2>
              <details><summary>C&apos;est quoi exactement le Catalogue Premium ?</summary><p>Un catalogue de 50 plans (villas et duplex) conçus pour l&apos;Afrique, avec devis estimatifs et plans de distribution inclus.</p></details>
              <details><summary>Comment je reçois mon accès&nbsp;?</summary><p>Dès le paiement confirmé, un code à 4 caractères vous est envoyé par SMS et email. Vous l&apos;entrez sur le site, accès immédiat.</p></details>
              <details><summary>Les plans sont-ils adaptés à mon pays&nbsp;?</summary><p>Oui. Tous nos plans sont conçus pour les réalités {c.adjLoc}&nbsp;: climat, matériaux locaux, configurations de terrain courantes.</p></details>
              <details><summary>Et si ça ne me convient pas&nbsp;?</summary><p>Garantie 14 jours, remboursement sans condition. Vous pouvez nous écrire à tout moment.</p></details>
            </section>

            {/* 9. CTA FINAL */}
            <section className="spw-section" style={{ borderBottom: "none" }}>
              <div className="spw-final">
                <h2>Votre projet mérite un vrai plan.<br />Profitez du prix de lancement.</h2>
                <div className="spw-price spw-gap12">
                  <span className="new">29 900 FCFA</span>
                  <span className="old">300 000 FCFA</span>
                </div>
                <GaugeBar total={total} rem={rem} pct={pct} />
                <a href="#" className="spw-cta spw-gap12">Je rejoins maintenant · 29 900 FCFA <span style={{ fontFamily: "var(--spw-serif)" }}>→</span></a>
                <Guarantee />
              </div>
            </section>

          </article>
        </div>

        {/* Tweaks panel */}
        {!tweaksOpen ? (
          <button className="spw-tweaks-toggle" onClick={() => setTweaksOpen(true)}>Offre</button>
        ) : (
          <div className="spw-tweaks-panel">
            <header>
              <h4>Version offre</h4>
              <button className="spw-tweaks-x" onClick={() => setTweaksOpen(false)}>×</button>
            </header>
            <div className="spw-tweaks-ts-label">Variante active</div>
            <div className="spw-tweaks-radio">
              {([
                { key: "fomo" as OfferVariant, name: "FOMO Lancement", desc: "Jauge + urgence + réduction" },
                { key: "value" as OfferVariant, name: "Valeur empilée", desc: "Liste inclus + prix total barré" },
                { key: "compare" as OfferVariant, name: "Comparaison", desc: "Tableau vs architecte" },
              ] as const).map((v) => (
                <label key={v.key} className={`spw-tweaks-label${offer === v.key ? " on" : ""}`}>
                  <input type="radio" name="offer" value={v.key} checked={offer === v.key} onChange={() => setOffer(v.key)} />
                  <span className="spw-tweaks-rkey">{v.key[0].toUpperCase()}</span>
                  <span>
                    <span className="spw-tweaks-rname">{v.name}</span>
                    <span className="spw-tweaks-rdesc">{v.desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
