import Link from "next/link";
import { SITE } from "@/lib/site";

type Teaser = { floorPlans: number[]; lots: { label: string; digits: number }[] };

const levelName = (i: number, n: number) => (n === 1 ? "Plan de distribution coté" : i === 0 ? "Rez-de-chaussée coté" : "Étage coté");

/** Montant masqué d'autant de chiffres que le vrai (le vrai montant n'est jamais envoyé) : « 0 000 000 », affiché flouté. */
function maskedAmount(digits: number) {
  return Number("8".repeat(Math.max(digits, 1))).toLocaleString("fr-FR").replace(/8/g, "0");
}

function Lock() {
  return (
    <span className="absolute inset-0 grid place-items-center">
      <span className="rounded-full bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-md">🔒 Réservé au Catalogue Premium</span>
    </span>
  );
}

/**
 * Teaser « Plan et devis » de la fiche (décision de Tao, 16 nov. 2026) : le vrai plan coté, flouté légèrement par le
 * serveur (/api/apercu/fiche/<modèle>?doux=1, l'original n'est jamais transmis), et le vrai devis avec ses postes,
 * montants masqués et floutés. En glissement horizontal sur mobile pour ne pas prendre trop de place.
 */
export function PlanDevisTeaser({ slug, code, teaser }: { slug: string; code: string; teaser: Teaser }) {
  const levels = teaser.floorPlans;
  const lots = teaser.lots.slice(0, 10);
  if (levels.length === 0 && lots.length === 0) return null;
  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold">Plan et devis</h2>
      <p className="mt-1 text-sm text-foreground/70">Le plan coté et le devis poste par poste du modèle {code}, dans le Catalogue Premium.</p>
      <div className="no-scrollbar -mx-4 mt-4 flex items-start snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
        {levels.map((n, i) => (
          <figure key={n} className="relative w-[78%] shrink-0 snap-start overflow-hidden rounded-2xl border border-outline bg-white md:w-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/apercu/fiche/${slug}?n=${n}&doux=1`} alt="" loading="lazy" decoding="async" className="aspect-[4/3] w-full bg-white object-contain p-1" />
            {/* Dégradé : le flou s'épaissit vers le bas, un voile blanc couvre le bas du plan. */}
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/0 via-white/25 to-white/85" aria-hidden />
            <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 backdrop-blur-[3px] [mask-image:linear-gradient(to_bottom,transparent,black)]" aria-hidden />
            <Lock />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-6 text-sm font-semibold text-white">
              {levelName(i, levels.length)}
            </figcaption>
          </figure>
        ))}
        {lots.length > 0 ? (
          <figure className="relative w-[78%] shrink-0 snap-start overflow-hidden rounded-2xl border border-outline bg-white p-4 md:w-auto">
            <p className="text-sm font-bold text-primary">Devis estimatif par poste</p>
            <ul className="mt-3 space-y-2 text-[13px]" aria-hidden>
              {lots.map((l, i) => (
                <li key={l.label + i} className="flex justify-between gap-3 border-b border-outline/70 pb-1.5">
                  <span className="truncate">{l.label}</span>
                  <span className="select-none font-semibold blur-[3.5px]">{maskedAmount(l.digits)}</span>
                </li>
              ))}
              <li className="flex justify-between gap-3 pt-1 font-bold text-primary">
                <span>Total estimatif</span>
                <span className="select-none blur-[4px]">{maskedAmount(Math.max(...lots.map((l) => l.digits)) + 1)} FCFA</span>
              </li>
            </ul>
            <Lock />
          </figure>
        ) : null}
      </div>
      <Link href={SITE.catalogueUrl} data-cta="plan_teaser" data-plan={slug} className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
        Débloquer le plan et le devis de ce modèle →
      </Link>
    </section>
  );
}
