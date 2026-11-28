import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { requireMemberEn } from "@/lib/auth";
import { whatsappLink } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Premium space", robots: { index: false, follow: false } };

/** Espace Premium anglais (membres lang = en, achats de /en/premium-catalogue). */
export default async function PremiumEnLayout({ children }: { children: React.ReactNode }) {
  const member = await requireMemberEn();
  return (
    <div lang="en" className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 bg-primary text-white">
        <div className="container-page flex h-14 items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <Logo href="/en/premium" height={36} />
            <span className="rounded bg-highlight px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-foreground">Premium</span>
          </span>
          <form action="/api/membre/deconnexion" method="post">
            <button type="submit" className="text-sm text-white/70 hover:text-white">Log out</button>
          </form>
        </div>
        <nav className="container-page -mb-px flex gap-1 overflow-x-auto text-sm font-medium">
          <Link href="/en/premium" className="whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-white/75 hover:border-accent hover:text-white">House plans</Link>
        </nav>
      </header>
      <main className="flex-1 pb-24">{children}</main>
      <footer className="border-t border-outline bg-surface py-6 text-center text-sm text-muted">
        Logged in as {member.email} ·{" "}
        <a href={whatsappLink("Hello WOOPLANS, I am a Premium member and I have a question.")} target="_blank" rel="noopener noreferrer" data-whatsapp="premium_en_footer" className="font-semibold text-primary">
          Need help?
        </a>
      </footer>
    </div>
  );
}
