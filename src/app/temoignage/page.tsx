import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { getSetting } from "@/lib/settings";
import { whatsappLink } from "@/lib/site";
import { TESTIMONIAL_QUESTIONS, TESTIMONIAL_WHATSAPP_TEXT } from "@/lib/testimonial-request";
import { TESTIMONIALS } from "@/lib/testimonials";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Votre avis",
  description: "2 minutes pour laisser votre avis sur le Catalogue Premium, en vocal sur WhatsApp.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Votre avis compte pour WOOPLANS 🙏",
    description: "2 minutes, un simple vocal sur WhatsApp.",
  },
};

/** Page envoyée par WhatsApp : message audio de WOOPLANS, 3 questions, et un bouton pour laisser un vocal. */
export default async function TestimonialPage() {
  const introAudio = await getSetting<string>("testimonial_intro_audio", "");
  const whatsapp = whatsappLink(TESTIMONIAL_WHATSAPP_TEXT);
  return (
    <>
      <header className="bg-primary">
        <div className="mx-auto flex max-w-md items-center px-4 py-3">
          <Logo height={30} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 space-y-6 px-4 pb-16 pt-6">
        <section>
          <h1 className="text-[26px] font-extrabold leading-tight">2 minutes pour nous donner votre avis ? 🙏</h1>
          <p className="mt-2 text-foreground/80">Un simple vocal WhatsApp suffit. Beaucoup de familles hésitent encore à payer en ligne : votre expérience les aidera à se lancer en confiance.</p>
        </section>

        {introAudio ? (
          <section className="card p-4">
            <p className="mb-2 text-sm font-semibold">🔊 Écoutez d&apos;abord notre petit message</p>
            <audio src={introAudio} controls preload="metadata" className="w-full" />
          </section>
        ) : null}

        <section className="card p-5">
          <h2 className="text-base font-bold">Dans votre vocal, dites-nous simplement :</h2>
          <ol className="mt-3 space-y-2">
            {TESTIMONIAL_QUESTIONS.map((q, i) => (
              <li key={q} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{i + 1}</span>
                <span>{q}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-sm text-muted">Parlez naturellement, comme à un ami. 1 à 2 minutes, c&apos;est parfait.</p>
        </section>

        <section className="space-y-2">
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            data-cta="temoignage_whatsapp"
            className="btn w-full bg-[#25D366] py-4 text-base text-white shadow-lg shadow-black/10"
          >
            🎙️ Laisser mon avis sur WhatsApp
          </a>
          <p className="text-center text-sm text-muted">WhatsApp s&apos;ouvre : envoyez le message, puis maintenez le micro 🎙️ pour enregistrer.</p>
        </section>

        <section>
          <h2 className="text-base font-bold">Ils ont donné leur avis</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {TESTIMONIALS.slice(0, 2).map((t) => (
              <figure key={t.id}>
                <video src={`${t.video}#t=1`} controls playsInline preload="metadata" className="aspect-[9/16] w-full rounded-xl bg-black object-cover" />
                <figcaption className="mt-1 text-xs">
                  <span className="font-semibold">{t.name.replace(/^M\.\s*/, "")}</span> · <span className="text-muted">{t.location}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <p className="text-center text-xs text-muted">
          En nous envoyant votre avis, vous acceptez qu&apos;il soit partagé (avec votre prénom) pour aider d&apos;autres clients. Vous préférez rester anonyme ? Dites-le simplement dans votre message.
        </p>
      </main>
    </>
  );
}
