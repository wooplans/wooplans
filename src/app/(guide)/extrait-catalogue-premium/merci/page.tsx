import type { Metadata } from "next";
import { GuideThanks } from "@/components/guide/GuideThanks";
import { siteUrl } from "@/lib/env";
import { GUIDE } from "@/lib/guide";
import { LEAD_OFFERS } from "@/lib/lead-offers";
import { formatFcfa } from "@/lib/plans";
import { cataloguePrice, whatsappLink } from "@/lib/site";

/** Numéro WhatsApp Business de WooPlans (celui des relances). */
const WHATSAPP_BUSINESS = "237653769998";

export const metadata: Metadata = { title: "Merci pour votre achat de l'extrait", robots: { index: false, follow: false } };

export default async function ExtraitThanksPage({ searchParams }: { searchParams: Promise<{ i?: string }> }) {
  const { i } = await searchParams;
  return (
    <div className="container-page max-w-4xl py-12">
      <GuideThanks
        offer="extrait"
        intentId={i}
        pixelId={process.env.FB_PIXEL_ID || undefined}
        guidePrice={LEAD_OFFERS.extrait.price}
        cataloguePrice={formatFcfa(cataloguePrice())}
        catalogueUrl={siteUrl("/catalogue-premium?utm_source=extrait&utm_medium=merci&utm_campaign=extrait_catalogue")}
        whatsappUrl={whatsappLink("Bonjour Tao, j'ai acheté l'Extrait du Catalogue Premium et je n'ai pas reçu mon PDF.")}
        video={GUIDE.catalogueVideo}
        videoPoster={GUIDE.catalogueVideoPoster}
        announcedModels={GUIDE.announcedModels}
        waDeliveryUrl={whatsappLink("Salut l'équipe WooPlans 👋 Je viens d'acheter l'Extrait du Catalogue Premium. Pouvez-vous me l'envoyer ici sur WhatsApp ?", WHATSAPP_BUSINESS)}
        waDeliveryNumber={WHATSAPP_BUSINESS}
      />
    </div>
  );
}
