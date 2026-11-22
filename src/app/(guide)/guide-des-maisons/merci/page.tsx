import type { Metadata } from "next";
import { GuideThanks } from "@/components/guide/GuideThanks";
import { siteUrl } from "@/lib/env";
import { GUIDE } from "@/lib/guide";
import { formatFcfa } from "@/lib/plans";
import { cataloguePrice, catalogueReservedPrice, whatsappLink } from "@/lib/site";

/** Numéro WhatsApp Business de WooPlans (celui des relances). */
const WHATSAPP_BUSINESS = "237653769998";

export const metadata: Metadata = { title: "Merci pour votre achat du guide", robots: { index: false, follow: false } };

export default async function GuideThanksPage({ searchParams }: { searchParams: Promise<{ i?: string }> }) {
  const { i } = await searchParams;
  return (
    <div className="container-page max-w-4xl py-12">
      <GuideThanks
        intentId={i}
        pixelId={process.env.FB_PIXEL_ID || undefined}
        guidePrice={GUIDE.price}
        cataloguePrice={formatFcfa(cataloguePrice())}
        reservedPrice={formatFcfa(catalogueReservedPrice())}
        catalogueUrl={siteUrl("/catalogue-premium?utm_source=guide&utm_medium=merci&utm_campaign=guide_maisons")}
        whatsappUrl={whatsappLink("Bonjour Tao, j'ai le Guide WooPlans des maisons. J'ai un terrain et je veux démarrer mon projet.")}
        video={GUIDE.catalogueVideo}
        videoPoster={GUIDE.catalogueVideoPoster}
        announcedModels={GUIDE.announcedModels}
        waDeliveryUrl={whatsappLink("Salut l'équipe WooPlans 👋 Je viens d'acheter le Guide WooPlans des maisons. Pouvez-vous me l'envoyer ici sur WhatsApp ?", WHATSAPP_BUSINESS)}
        waDeliveryNumber={WHATSAPP_BUSINESS}
      />
    </div>
  );
}
