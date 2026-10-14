import Link from "next/link";
import { MobileMenu } from "@/components/MobileMenu";
import { SITE } from "@/lib/site";

export const NAV_LINKS = [
  { href: "/plans", label: "Les modèles" },
  { href: "/plans?categorie=villa", label: "Villas" },
  { href: "/plans?categorie=duplex", label: "Duplex" },
  { href: "/plans-personnalises", label: "Plans personnalisés" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-outline/70 bg-surface/95 backdrop-blur">
      <nav className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="text-xl font-bold tracking-tight text-primary">
          WooPlans
        </Link>
        <ul className="hidden items-center gap-7 text-sm font-medium text-foreground/80 lg:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="hover:text-primary">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <Link href="/connexion" className="hidden text-sm font-medium text-foreground/70 hover:text-primary sm:inline">
            Espace Premium
          </Link>
          <Link href={SITE.catalogueUrl} data-cta="header" className="btn-cta hidden px-5 py-2.5 sm:inline-flex">
            {SITE.catalogueCta}
          </Link>
          <MobileMenu links={NAV_LINKS} />
        </div>
      </nav>
    </header>
  );
}
