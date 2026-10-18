import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { TestimonialRecorder } from "@/components/TestimonialRecorder";
import { TESTIMONIALS } from "@/lib/testimonials";
import { TESTIMONIAL_MAX_BYTES, TESTIMONIAL_MAX_SECONDS, TESTIMONIAL_QUESTIONS } from "@/lib/testimonial-request";

export const metadata: Metadata = {
  title: "Votre témoignage",
  description: "Racontez-nous votre expérience avec le Catalogue Premium en 30 secondes, en vidéo ou en audio, depuis votre téléphone.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Votre avis compte pour WOOPLANS 🙏",
    description: "30 secondes, en vidéo ou en audio, depuis votre téléphone. Votre expérience aidera d'autres familles à choisir leur maison.",
  },
};

/**
 * Page envoyée par WhatsApp pour recueillir un témoignage vidéo ou audio.
 * Lien personnel : /temoignage#<jeton> (fragment jamais transmis au serveur ni aux statistiques) ; sans jeton, lien général.
 */
export default function TestimonialPage() {
  return (
    <>
      <header className="bg-primary">
        <div className="mx-auto flex max-w-xl items-center px-4 py-3">
          <Logo height={30} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-16 pt-6">
        <TestimonialRecorder
          examples={TESTIMONIALS.slice(0, 3)}
          questions={TESTIMONIAL_QUESTIONS}
          maxSeconds={TESTIMONIAL_MAX_SECONDS}
          maxBytes={TESTIMONIAL_MAX_BYTES}
          whatsappNumber={process.env.WHATSAPP_NUMBER || ""}
        />
      </main>
    </>
  );
}
