import { Countdown } from "@/components/offre/Countdown";
import { TrackedLink } from "@/components/extrait/ExtraitTracker";
import { deadlineLabel, type Offer } from "@/lib/catalogue-offer";
import { EXTRAIT_SUITE_PATH } from "@/lib/lead-offers";
import { formatFcfa } from "@/lib/plans";

/** Offre du Catalogue Premium sur l'extrait en ligne : prix réservé et vraie date de fin, sinon prix public. */
export function ExtraitOffer({ id, offer, publicPrice, total, compact = false }: { id: string; offer: Offer; publicPrice: number; total: number; compact?: boolean }) {
  const reserved = offer.tier !== "public";
  const href = `${EXTRAIT_SUITE_PATH}?utm_source=mon_extrait&utm_medium=page&utm_campaign=extrait_web`;
  return (
    <div className={`rounded-2xl bg-primary text-white ${compact ? "p-4" : "p-5 md:p-6"}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-highlight">{reserved ? "⚡ Votre prix réservé" : "Catalogue Premium"}</p>
      <p className="mt-1 font-semibold">Débloquez les plans et devis des {total} maisons</p>
      <p className="mt-2 flex flex-wrap items-end gap-x-3">
        <span className="text-3xl font-bold">{formatFcfa(offer.price)}</span>
        {reserved ? <span className="pb-1 text-sm text-white/75">au lieu de {formatFcfa(publicPrice)} (prix public)</span> : <span className="pb-1 text-sm text-white/75">paiement unique</span>}
      </p>
      {reserved && offer.until ? (
        <div className="mt-2 text-sm text-white/85">
          Jusqu&apos;au <strong className="text-white">{deadlineLabel(offer.until)}</strong>
          {compact ? null : <Countdown until={offer.until.toISOString()} className="mt-2 flex text-base" />}
        </div>
      ) : null}
      <div className="cta-pulse mt-4">
        <TrackedLink id={id} type="offer" href={href} className="btn-cta w-full py-3.5 text-base">
          Débloquer les {total} maisons →
        </TrackedLink>
      </div>
    </div>
  );
}
