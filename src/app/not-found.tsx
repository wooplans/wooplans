import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="container-page flex flex-1 flex-col items-center justify-center py-24 text-center">
        <p className="eyebrow">Erreur 404</p>
        <h1 className="mt-2 text-3xl font-bold">Cette page n&apos;existe pas (ou plus)</h1>
        <p className="mt-3 text-foreground/70">Le modèle que vous cherchez a peut-être changé d&apos;adresse.</p>
        <div className="mt-8 flex gap-3">
          <Link href="/catalogue" className="btn-primary">Voir les modèles</Link>
          <Link href="/" className="btn-ghost">Accueil</Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
