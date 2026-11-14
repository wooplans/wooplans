import type { Metadata } from "next";
import { headers } from "next/headers";
import { GuideCheckoutForm } from "@/components/guide/GuideCheckoutForm";
import { GUIDE, GUIDE_PATH, guideEnabled } from "@/lib/guide";
import { phoneCountryOrDefault } from "@/lib/phone";
import { formatFcfa, listPublicPlans } from "@/lib/plans";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Le Guide WooPlans des maisons : villas et duplex avec leur budget",
  description: `${GUIDE.announcedModels} villas et duplex, avec la surface, le terrain nécessaire et le budget de construction de chacun. Guide PDF à ${formatFcfa(GUIDE.price)}.`,
  alternates: { canonical: GUIDE_PATH },
};

const millions = (v: number | null) => (v === null ? "" : `${(v / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M`);

/** Page de vente du Guide WooPlans des maisons (lead magnet payant, src/config/guide.json). */
export default async function GuidePage() {
  const country = phoneCountryOrDefault((await headers()).get("cf-ipcountry"));
  const plans = (await listPublicPlans({ limit: 60 }).catch(() => [])).filter((p) => p.coverImage);
  // Un aperçu varié : du plus accessible au plus grand.
  const sorted = [...plans].sort((a, b) => (a.budgetMin ?? 0) - (b.budgetMin ?? 0));
  const preview = sorted.length >= 6 ? [0, 0.2, 0.4, 0.6, 0.8, 0.99].map((f) => sorted[Math.floor(f * (sorted.length - 1))]) : sorted;
  const price = formatFcfa(GUIDE.price);

  return (
    <div className="container-page py-10 md:py-14">
      <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <p className="eyebrow">Guide PDF · {price}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">Quelle maison pouvez-vous construire avec votre budget ?</h1>
          <p className="mt-4 max-w-2xl text-lg text-foreground/80">
            Le <strong>Guide WooPlans des maisons</strong> réunit {GUIDE.announcedModels} villas et duplex, avec pour chacun la surface habitable, le
            terrain conseillé et le budget de construction estimé. Classés par budget, pour trouver en quelques minutes les maisons à votre
            portée.
          </p>
          <a href="#commander" data-cta="guide_haut_mobile" className="btn btn-cta mt-6 inline-flex px-6 py-4 text-base lg:hidden">
            Recevoir le guide · {price}
          </a>

          {GUIDE.video && (
            <video className="mt-6 aspect-[9/16] w-full max-w-sm rounded-2xl bg-black md:aspect-video md:max-w-none" controls playsInline preload="metadata" poster={GUIDE.videoPoster || undefined}>
              <source src={GUIDE.video} type="video/mp4" />
            </video>
          )}

          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
            {preview.map((p) => (
              <figure key={p.slug} className="overflow-hidden rounded-xl bg-white shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${p.coverImage}?w=480`} alt={`Rendu 3D ${p.name}`} loading="lazy" className="aspect-video w-full object-cover" />
                <figcaption className="px-3 py-2 text-xs">
                  <span className="font-semibold">{p.code}</span>
                  <span className="block text-muted">
                    {p.bedrooms} ch. · {p.surfaceTotal} m² · {millions(p.budgetMin)} à {millions(p.budgetMax)} FCFA
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>

          <section className="mt-10">
            <h2 className="text-2xl font-semibold tracking-tight">Dans le guide</h2>
            <ul className="mt-4 space-y-2">
              {[
                `${GUIDE.announcedModels} villas et duplex, de 2 à 5 chambres, avec un rendu 3D de chaque maison`,
                "Les modèles classés par budget de construction : moins de 15 millions, 15 à 25, 25 à 40, 40 à 70, plus de 70 millions",
                "Pour chaque modèle : chambres, niveaux, surface habitable, terrain conseillé et budget estimé",
                "Le tableau « Quel modèle pour mon terrain ? », de 200 à 750 m²",
                "Les 5 décisions à prendre avant de construire",
                "Une page pour noter vos 3 favoris",
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="text-primary" aria-hidden>
                    ✓
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-10 rounded-2xl bg-primary/5 p-6">
            <h2 className="text-xl font-semibold">Pour qui ?</h2>
            <p className="mt-2 text-foreground/80">
              Pour vous qui avez un terrain, ou qui allez en acheter un, et qui voulez savoir quelle maison construire et combien prévoir, avant de
              payer un architecte ou de lancer le chantier.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-xl font-semibold">Questions fréquentes</h2>
            <dl className="mt-4 space-y-4">
              {[
                ["Comment je reçois le guide ?", "Juste après le paiement : il s'ouvre sur la page suivante et vous est envoyé par email."],
                ["Est-ce un livre imprimé ?", "Non : c'est un PDF à lire sur votre téléphone ou votre ordinateur, et à imprimer si vous le souhaitez."],
                [
                  "Le guide contient-il les plans cotés et les devis détaillés ?",
                  "Non. Il montre chaque maison, ses surfaces et son budget estimé. Les distributions cotées et les devis poste par poste sont dans le Catalogue Premium.",
                ],
                ["Comment payer ?", "Par Mobile Money (Orange Money, MTN MoMo, Wave, Moov Money) ou carte bancaire."],
              ].map(([q, a]) => (
                <div key={q}>
                  <dt className="font-semibold">{q}</dt>
                  <dd className="mt-1 text-foreground/75">{a}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <GuideCheckoutForm price={price} defaultCountry={country} enabled={guideEnabled()} />
        </div>
      </div>
    </div>
  );
}
