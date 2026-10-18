import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

const NAV = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/crm", label: "CRM plans complets" },
  { href: "/admin/ventes", label: "Ventes catalogue" },
  { href: "/admin/prospects", label: "Prospects catalogue" },
  { href: "/admin/membres", label: "Membres" },
  { href: "/admin/temoignages", label: "Témoignages" },
  { href: "/admin/plans", label: "Modèles" },
  { href: "/admin/emails", label: "Emails" },
  { href: "/admin/liens", label: "Liens UTM" },
  { href: "/admin/reglages", label: "Réglages" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="admin-shell min-h-screen lg:grid lg:grid-cols-[220px_1fr]">
      <aside className="border-b border-outline bg-primary text-white lg:min-h-screen lg:border-b-0">
        <div className="flex items-center justify-between p-4 lg:block">
          <Logo href="/admin" height={34} />
          <p className="hidden text-xs text-white/50 lg:mt-1 lg:block">{admin.email}</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 text-sm lg:flex-col lg:px-3">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="whitespace-nowrap rounded-lg px-3 py-2 text-white/80 hover:bg-white/10 hover:text-white">
              {item.label}
            </Link>
          ))}
          <Link href="/" target="_blank" className="whitespace-nowrap rounded-lg px-3 py-2 text-white/50 hover:text-white">Voir le site ↗</Link>
          <form action="/api/admin/deconnexion" method="post" className="lg:mt-4">
            <button className="whitespace-nowrap rounded-lg px-3 py-2 text-left text-white/50 hover:text-white">Déconnexion</button>
          </form>
        </nav>
      </aside>
      <main className="min-w-0 p-4 md:p-8">{children}</main>
    </div>
  );
}
