import { PlanDevisButton } from "@/components/PlanDevisButton";
import { PreviewDialog } from "@/components/PreviewDialog";
import { minimumLand, SETBACKS } from "@/lib/plan-pdf";
import { CATEGORY_LABELS, formatBudgetRange, levelsLabel } from "@/lib/plans";

type Plan = {
  slug: string;
  code: string;
  name: string;
  category: string;
  summary: string;
  bedrooms: number;
  bathrooms: number;
  levels: number;
  surfaceTotal: number;
  buildingWidth: number | null;
  buildingDepth: number | null;
  landArea: number | null;
  landWidth: number | null;
  landDepth: number | null;
  budgetMin: number | null;
  budgetMax: number | null;
  coverImage: string | null;
};

const num = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

/**
 * Aperçu du plan et devis, mis en page comme la fiche PDF livrée (src/lib/plan-pdf.ts) :
 * - page 1 (couverture) et terrain minimum lisibles : uniquement des informations déjà publiques sur la fiche ;
 * - distributions : image floutée par le serveur (/api/apercu/fiche/<modèle>) ;
 * - pièces et devis : lignes factices floutées. Aucune donnée Premium (pièces, montants des lots) n'est envoyée.
 */
export function PlanDevisPreview({ plan, price, online, fallbackHref }: { plan: Plan; price: string; online: boolean; fallbackHref?: string }) {
  const category = CATEGORY_LABELS[plan.category as keyof typeof CATEGORY_LABELS] ?? plan.category;
  const land =
    plan.landArea || (plan.landWidth && plan.landDepth)
      ? {
          area: plan.landArea,
          width: plan.landWidth,
          depth: plan.landDepth,
        }
      : plan.buildingWidth && plan.buildingDepth
        ? minimumLand(plan.buildingWidth, plan.buildingDepth)
        : null;
  const specs: [string, string | null][] = [
    ["Chambres", String(plan.bedrooms)],
    ["Salles de bain", String(plan.bathrooms)],
    ["Niveaux", levelsLabel(plan.levels)],
    ["Surface habitable", plan.surfaceTotal ? `${plan.surfaceTotal} m²` : null],
    ["Dimensions du bâtiment", plan.buildingWidth && plan.buildingDepth ? `${num(plan.buildingWidth)} m × ${num(plan.buildingDepth)} m` : null],
    [
      "Terrain conseillé",
      land?.area ? `${num(land.area)} m²${land.width && land.depth ? ` (${num(land.width)} m × ${num(land.depth)} m)` : ""}` : null,
    ],
    ["Budget indicatif", formatBudgetRange(plan.budgetMin, plan.budgetMax)],
  ];
  const levelCount = Math.max(1, plan.levels);

  return (
    <PreviewDialog planSlug={plan.slug} label="Voir un aperçu du plan et devis">
      <div className="mx-auto grid max-w-[480px] gap-4">
        {/* Page 1 : couverture, lisible. */}
        <Page code={plan.code} number={1}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
            {category} · Réf. {plan.code}
          </p>
          <p className="mt-1 text-xl font-bold leading-tight text-[#1d2a30]">{plan.name}</p>
          {plan.summary ? <p className="mt-1 text-[11px] leading-snug text-[#5f6b72]">{plan.summary}</p> : null}
          {plan.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={plan.coverImage} alt="" className="mt-3 aspect-[16/10] w-full rounded object-cover" loading="lazy" />
          ) : null}
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
            {specs
              .filter((s): s is [string, string] => Boolean(s[1]))
              .map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[8px] font-bold uppercase tracking-wide text-[#5f6b72]">{label}</dt>
                  <dd className="text-[12px] font-bold text-[#1d2a30]">{value}</dd>
                </div>
              ))}
          </dl>
        </Page>

        {/* Distributions cotées : floutées par le serveur. */}
        {Array.from({ length: levelCount }, (_, i) => (
          <Page key={i} code={plan.code} number={i + 2} title={`Distribution cotée${levelCount > 1 ? ` · ${i === 0 ? "rez-de-chaussée" : `étage ${i}`}` : ""}`}>
            <Locked>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/apercu/fiche/${plan.slug}?n=${i + 1}`}
                alt=""
                className="aspect-[3/4] w-full object-contain"
                loading="lazy"
                style={{ background: "repeating-linear-gradient(0deg,#f3f5f6,#f3f5f6 14px,#e6eaed 14px,#e6eaed 15px)" }}
              />
            </Locked>
          </Page>
        ))}

        {/* Terrain minimum : dimensions lisibles (déjà publiques sur la fiche). */}
        {plan.buildingWidth && plan.buildingDepth ? (
          <Page code={plan.code} number={levelCount + 2} title="Terrain minimum estimé">
            <TerrainSketch width={plan.buildingWidth} depth={plan.buildingDepth} land={land} />
          </Page>
        ) : null}

        {/* Pièces et devis : titres lisibles, contenu factice flouté. */}
        <Page code={plan.code} number={levelCount + (plan.buildingWidth && plan.buildingDepth ? 3 : 2)} title="Pièces et surfaces">
          <Locked>
            <FakeRows rows={9} />
          </Locked>
          <p className="mt-4 text-[13px] font-bold text-[#0f5757]">Devis estimatif de construction</p>
          <Locked>
            <FakeRows rows={10} amounts />
          </Locked>
        </Page>

        <div className="sticky bottom-0 -mx-3 bg-gradient-to-t from-[#e9edf0] via-[#e9edf0] to-transparent px-3 pb-1 pt-6 sm:-mx-5 sm:px-5">
          <PlanDevisButton
            plan={plan}
            label={`Recevoir le document complet · ${price.replace(/ /g, " ")}`}
            price={price}
            ctaId="plan_projet_apercu"
            className="btn-cta w-full px-4 py-3.5 text-base"
            fallbackHref={online ? undefined : fallbackHref}
          />
        </div>
      </div>
    </PreviewDialog>
  );
}

function Page({ code, number, title, children }: { code: string; number: number; title?: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded bg-white shadow-md shadow-black/10" aria-label={`Page ${number}`}>
      <div className="flex items-center justify-between bg-[#0f5757] px-4 py-2 text-[9px] font-semibold uppercase tracking-wider text-white/90">
        <span>WOOPLANS · Réf. {code}</span>
        <span>Page {number}</span>
      </div>
      <div className="p-4">
        {title ? <p className="mb-3 text-[13px] font-bold text-[#0f5757]">{title}</p> : null}
        {children}
      </div>
    </section>
  );
}

/** Contenu réservé à l'acheteur : flouté, avec un cadenas par-dessus. */
function Locked({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative select-none" aria-hidden>
      {children}
      <div className="absolute inset-0 grid place-items-center">
        <span className="rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-[#1d2a30] shadow">🔒 Lisible après l&apos;achat</span>
      </div>
    </div>
  );
}

/** Lignes de tableau factices (aucune donnée réelle), floutées. */
function FakeRows({ rows, amounts = false }: { rows: number; amounts?: boolean }) {
  const widths = [62, 48, 70, 55, 66, 44, 58, 72, 50, 60];
  return (
    <div className="space-y-2 blur-[3px]">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center justify-between gap-4 border-b border-[#e6eaed] pb-1.5">
          <span className="h-2.5 rounded bg-[#1d2a30]/35" style={{ width: `${widths[i % widths.length]}%` }} />
          <span className="h-2.5 rounded bg-[#1d2a30]/45" style={{ width: amounts ? "22%" : "12%" }} />
        </div>
      ))}
    </div>
  );
}

/** Schéma du terrain minimum, comme dans la fiche PDF : parcelle, maison, reculs et cotes. */
function TerrainSketch({ width, depth, land }: { width: number; depth: number; land: { area: number | null; width: number | null; depth: number | null } | null }) {
  const lw = land?.width || width + 2 * SETBACKS.side;
  const ld = land?.depth || depth + SETBACKS.front + SETBACKS.back;
  const scale = 220 / Math.max(lw, ld);
  const W = lw * scale;
  const D = ld * scale;
  const hx = ((lw - width) / 2) * scale;
  const hy = SETBACKS.back * scale;
  return (
    <div>
      <svg viewBox={`-40 -24 ${W + 80} ${D + 70}`} className="mx-auto w-full max-w-[320px]" role="img" aria-label={`Terrain de ${num(lw)} m sur ${num(ld)} m`}>
        <rect x={0} y={0} width={W} height={D} fill="#e6f2e8" stroke="#549a61" strokeWidth={1.5} />
        <rect x={hx} y={hy} width={width * scale} height={depth * scale} fill="#0f5757" opacity={0.85} />
        <text x={hx + (width * scale) / 2} y={hy + (depth * scale) / 2} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="#fff" fontWeight={700}>
          {num(width)} × {num(depth)} m
        </text>
        <rect x={-30} y={D + 8} width={W + 60} height={16} fill="#d6d9db" />
        <text x={W / 2} y={D + 19} textAnchor="middle" fontSize={8} fill="#5f6b72">Route (façade)</text>
        <text x={W / 2} y={-8} textAnchor="middle" fontSize={10} fontWeight={700} fill="#1d2a30">{num(lw)} m</text>
        <text x={-8} y={D / 2} textAnchor="middle" fontSize={10} fontWeight={700} fill="#1d2a30" transform={`rotate(-90 -8 ${D / 2})`}>
          {num(ld)} m
        </text>
      </svg>
      <p className="mt-2 text-center text-[12px] font-bold text-[#1d2a30]">
        Terrain minimum : {land?.area ? `${num(land.area)} m²` : `${num(lw * ld)} m²`} ({num(lw)} m × {num(ld)} m)
      </p>
      <p className="mt-1 text-center text-[10px] text-[#5f6b72]">
        Reculs pris en compte : {num(SETBACKS.front)} m devant, {num(SETBACKS.back)} m derrière, {num(SETBACKS.side)} m sur les côtés.
      </p>
    </div>
  );
}
