import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";
import { SITE, whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contactez WOOPLANS sur WhatsApp ou par email pour toute question sur nos plans de maisons et le Catalogue Premium.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <ContentPage eyebrow="Contact" title="Parlons de votre projet">
      <p>Le moyen le plus rapide de nous joindre est WhatsApp. Nous répondons du lundi au samedi.</p>
      <p>
        <a
          href={whatsappLink("Bonjour WOOPLANS, j'ai une question.")}
          target="_blank"
          rel="noopener noreferrer"
          data-whatsapp="contact"
          className="btn bg-[#25D366] text-white hover:bg-[#1eb457]"
        >
          Écrire sur WhatsApp
        </a>
      </p>
      <p>
        Par email : <a href={`mailto:${SITE.email}`} className="font-semibold text-primary">{SITE.email}</a>
      </p>
    </ContentPage>
  );
}
