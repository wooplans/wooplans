import Link from "next/link";
import { Logo } from "@/components/Logo";
import { MobileMenu } from "@/components/MobileMenu";
import { SITE } from "@/lib/site";

export const NAV_LINKS = [
  { href: "/catalogue", label: "Les modèles" },
  { href: "/catalogue-villa", label: "Villas" },
  { href: "/catalogue-duplex", label: "Duplex" },
  { href: "/plans-personnalises", label: "Plans personnalisés" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-primary text-white shadow-sm">
      <nav className="container-page flex h-16 items-center justify-between gap-4">
        <Logo height={42} />
        <ul className="hidden items-center gap-7 text-sm font-medium text-white/85 lg:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="hover:text-white">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <Link href="/connexion" className="hidden text-sm font-medium text-white/80 hover:text-white sm:inline">
            Espace Premium
          </Link>
          <Link href={SITE.catalogueUrl} data-cta="header" className="btn-cta hidden px-5 py-2.5 shadow-none sm:inline-flex">
            {SITE.catalogueCta}
          </Link>
          <MobileMenu links={NAV_LINKS} />
        </div>
      </nav>
    </header>
  );
}
