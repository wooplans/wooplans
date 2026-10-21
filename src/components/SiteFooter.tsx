import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LANDING_PAGES } from "@/lib/plan-seo";
import { SITE, whatsappLink } from "@/lib/site";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto bg-primary text-white/80">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo height={44} />
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            Des plans de villas et duplex pensés pour l&apos;Afrique francophone, avec rendus 3D, distributions et budgets estimatifs.
          </p>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-white">Catalogue</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/catalogue" className="hover:text-white">Tous les modèles</Link></li>
            <li><Link href="/catalogue-villa" className="hover:text-white">Villas</Link></li>
            <li><Link href="/catalogue-duplex" className="hover:text-white">Duplex</Link></li>
            {LANDING_PAGES.map((p) => (
              <li key={p.path}><Link href={p.path} className="hover:text-white">{p.label}</Link></li>
            ))}
            <li><Link href={SITE.catalogueUrl} data-cta="footer" className="hover:text-white">Catalogue Premium</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-white">Services</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/plans-personnalises" className="hover:text-white">Plans complets personnalisés</Link></li>
            <li><Link href="/connexion" className="hover:text-white">Espace Premium</Link></li>
            <li><Link href="/a-propos" className="hover:text-white">À propos</Link></li>
            <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-white">Nous écrire</p>
          <ul className="space-y-2 text-sm">
            <li>
              <a href={whatsappLink("Bonjour WOOPLANS, j'ai une question.")} data-whatsapp="footer" target="_blank" rel="noopener noreferrer" className="hover:text-white">
                WhatsApp
              </a>
            </li>
            <li><a href={`mailto:${SITE.email}`} className="hover:text-white">{SITE.email}</a></li>
          </ul>
          <p className="mb-3 mt-6 text-sm font-semibold text-white">Suivez-nous</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {SITE.social.map((s) => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" data-social={s.label.toLowerCase()} className="hover:text-white">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} WOOPLANS. Tous droits réservés.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/mentions-legales" className="hover:text-white">Mentions légales</Link>
            <Link href="/conditions-generales-de-vente" className="hover:text-white">CGV</Link>
            <Link href="/confidentialite" className="hover:text-white">Confidentialité</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
