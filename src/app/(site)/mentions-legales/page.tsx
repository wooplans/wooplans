import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Mentions légales", alternates: { canonical: "/mentions-legales" } };

export default function LegalPage() {
  return (
    <ContentPage title="Mentions légales">
      <h2>Éditeur du site</h2>
      <p>
        Le site wooplans.com est édité par WooPlans. Contact : {SITE.email}.
      </p>
      <h2>Hébergement</h2>
      <p>Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, États-Unis.</p>
      <h2>Propriété intellectuelle</h2>
      <p>
        Les plans, rendus, textes et estimations publiés sur ce site sont la propriété de WooPlans. Toute reproduction ou diffusion sans autorisation écrite est interdite.
      </p>
    </ContentPage>
  );
}
