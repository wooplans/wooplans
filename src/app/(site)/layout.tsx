import { Analytics } from "@/components/Analytics";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";
import { FOCUS_INLINE_SCRIPT } from "@/lib/focus-mode";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Avant l'en-tête : pose html[data-focus] pour les visiteurs des pubs « plan et devis », sans clignotement. */}
      <script dangerouslySetInnerHTML={{ __html: FOCUS_INLINE_SCRIPT }} />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <WhatsAppFloat />
      <Analytics />
    </>
  );
}
