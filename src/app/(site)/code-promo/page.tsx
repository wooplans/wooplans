import type { Metadata } from "next";
import Link from "next/link";
import { PROMO_GUIDE_IMAGE, UPSELL, UPSELL_CATALOGUE_PATH } from "@/lib/upsell";
import { formatFcfa } from "@/lib/plans";

export const metadata: Metadata = { title: "Utiliser mon code promo", robots: { index: false, follow: false } };

const STEPS = [
  { title: "Ouvrez le modèle qui vous intéresse", text: "Depuis le catalogue, touchez la photo du modèle pour ouvrir sa fiche." },
  { title: "Touchez « Recevoir mon plan et devis »", text: "Le bouton orange, sur la fiche du modèle (en bas de l'écran sur téléphone)." },
  {
    title: `Touchez « Code promo » et tapez ${UPSELL.code}`,
    text: "Sous votre numéro WhatsApp. Si vous venez du lien reçu par email ou WhatsApp, le code est déjà rempli et le prix réduit s'affiche en haut.",
  },
  { title: "Touchez « Procéder au paiement »", text: "Payez par Mobile Money ou carte : le plan et devis arrive tout de suite par email." },
];

/** Guide du code promo (lien envoyé par email et WhatsApp aux clients du plan et devis). */
export default function PromoGuidePage() {
  return (
    <div className="container-page max-w-2xl py-12">
      <p className="eyebrow text-center">Offre réservée aux clients</p>
      <h1 className="mt-2 text-center text-2xl font-bold md:text-3xl">Comment utiliser votre code {UPSELL.code}</h1>
      <p className="mt-3 text-center text-foreground/75">
        {formatFcfa(UPSELL.discount)} de réduction sur chaque plan et devis supplémentaire. Prenez-en autant que vous voulez.
      </p>

      <div className="mx-auto mt-6 max-w-xs rounded-2xl border-2 border-dashed border-primary bg-primary/5 p-4 text-center">
        <p className="text-xs text-muted">Votre code</p>
        <p className="font-mono text-3xl font-extrabold tracking-[0.2em] text-primary">{UPSELL.code}</p>
      </div>

      <ol className="mt-8 space-y-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="card flex gap-4 p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary font-bold text-white">{i + 1}</span>
            <div>
              <p className="font-semibold">{s.title}</p>
              <p className="mt-1 text-sm text-foreground/75">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={PROMO_GUIDE_IMAGE} alt="Les étapes en images pour saisir le code promo" className="mt-8 w-full rounded-2xl border border-outline" />

      <Link href={UPSELL_CATALOGUE_PATH} className="btn-cta mt-8 w-full py-4 text-base">
        Choisir mes modèles avec le code
      </Link>
    </div>
  );
}
