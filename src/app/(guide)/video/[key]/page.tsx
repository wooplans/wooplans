import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Countdown } from "@/components/offre/Countdown";
import { TrackedVideo, VideoCta, VideoOpen } from "@/components/video/TrackedVideo";
import { deadlineLabel, offerFor, publicOffer, RESERVED_COOKIE } from "@/lib/catalogue-offer";
import { EXTRAIT_SUITE_PATH } from "@/lib/lead-offers";
import { formatFcfa } from "@/lib/plans";
import { TESTIMONIALS } from "@/lib/testimonials";
import { videoPage } from "@/lib/videos";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const page = videoPage((await params).key);
  if (!page) return {};
  return {
    title: page.title,
    description: page.intro,
    robots: { index: false, follow: false },
    openGraph: { title: `${page.title} · WooPlans`, description: page.intro, images: [{ url: page.og, width: 1200, height: 630 }] },
  };
}

/**
 * Page vidéo envoyée sur WhatsApp à la place d'une pièce jointe (23 nov. 2026) : la vidéo, puis l'offre de la
 * personne (prix réservé avec sa date si son lien personnel l'a reconnue, sinon le prix public).
 */
export default async function VideoPageRoute({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const page = videoPage(key);
  if (!page) notFound();
  const token = (await cookies()).get(RESERVED_COOKIE)?.value ?? null;
  const { offer } = await offerFor({ token }).catch(() => ({ offer: publicOffer() }));
  const reserved = offer.tier !== "public";
  const href = reserved ? `${EXTRAIT_SUITE_PATH}?utm_source=video&utm_campaign=${key}` : `/catalogue-premium?utm_source=video&utm_campaign=${key}`;

  return (
    <div className="min-h-screen bg-primary text-white">
      <VideoOpen video={key} />
      <div className="container-page max-w-2xl py-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/wooplans-logo-white.png" alt="WOOPLANS" width={120} height={36} className="h-8 w-auto" />
        <h1 className="mt-5 text-2xl font-bold leading-tight md:text-3xl">{page.title}</h1>
        <p className="mt-2 text-white/80">{page.intro}</p>

        {page.src ? (
          <TrackedVideo video={key} src={page.src} poster={page.poster} className="mx-auto mt-5 aspect-[9/16] w-full max-w-[360px] rounded-2xl bg-black shadow-2xl" />
        ) : null}
        {page.testimonials ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {TESTIMONIALS.map((t) => (
              <figure key={t.id} className="overflow-hidden rounded-2xl bg-black/30">
                <TrackedVideo video={key} src={t.video} poster={t.poster} className="aspect-[9/16] w-full bg-black" />
                <figcaption className="p-3 text-sm">
                  <strong>{t.name}</strong> · {t.location}
                  <span className="block text-white/75">« {t.quote} »</span>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : null}

        <div className="mt-6 rounded-2xl bg-white p-5 text-foreground">
          <p className="text-xs font-bold uppercase tracking-wide text-secondary">{reserved ? "⚡ Votre prix réservé" : "Catalogue Premium"}</p>
          <p className="mt-1 font-semibold">Les plans cotés et les devis de nos 100 villas et duplex</p>
          <p className="mt-2 flex flex-wrap items-end gap-x-3">
            <span className="text-3xl font-bold text-primary">{formatFcfa(offer.price)}</span>
            <span className="pb-1 text-sm text-muted">{reserved ? `au lieu de ${formatFcfa(publicOffer().price)} (prix public)` : "paiement unique, accès à vie"}</span>
          </p>
          {reserved && offer.until ? (
            <div className="mt-2 text-sm">
              Jusqu&apos;au <strong>{deadlineLabel(offer.until)}</strong>
              <Countdown until={offer.until.toISOString()} className="mt-2 flex text-base text-white" />
            </div>
          ) : null}
          <div className="cta-pulse mt-4">
            <VideoCta video={key} href={href} className="btn-cta w-full py-3.5 text-base">
              Voir le Catalogue Premium →
            </VideoCta>
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-white/50">© WOOPLANS · wooplans.com</p>
      </div>
    </div>
  );
}
