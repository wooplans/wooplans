import { Analytics } from "@/components/Analytics";

/** Pages du Guide des maisons : sans en-tête, pied de page ni bouton WhatsApp (aucune distraction avant l'achat). */
export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="flex-1">{children}</main>
      <Analytics />
    </>
  );
}
