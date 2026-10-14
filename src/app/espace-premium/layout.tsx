import type { Metadata } from "next";
import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { whatsappLink } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Espace Premium", robots: { index: false, follow: false } };

const NAV = [
  { href: "/espace-premium", label: "Modèles" },
  { href: "/espace-premium/favoris", label: "Favoris" },
  { href: "/espace-premium/comparer", label: "Comparer" },
  { href: "/espace-premium/telechargements", label: "PDF" },
];

export default async function PremiumLayout({ children }: { children: React.ReactNode }) {
  const member = await requireMember();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-outline bg-surface/95 backdrop-blur">
        <div className="container-page flex h-14 items-center justify-between gap-3">
          <Link href="/espace-premium" className="flex items-center gap-2 font-bold text-primary">
            WooPlans
            <span className="rounded bg-highlight px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-foreground">Premium</span>
          </Link>
          <form action="/api/membre/deconnexion" method="post">
            <button type="submit" className="text-sm text-muted hover:text-primary">Déconnexion</button>
          </form>
        </div>
        <nav className="container-page -mb-px flex gap-1 overflow-x-auto text-sm font-medium">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-foreground/70 hover:border-primary hover:text-primary">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1 pb-24">{children}</main>
      <footer className="border-t border-outline bg-surface py-6 text-center text-sm text-muted">
        Connecté en tant que {member.email} ·{" "}
        <a href={whatsappLink("Bonjour WooPlans, je suis membre Premium et j'ai une question.")} target="_blank" rel="noopener noreferrer" data-whatsapp="premium_footer" className="font-semibold text-primary">
          Besoin d&apos;aide ?
        </a>
      </footer>
    </div>
  );
}
