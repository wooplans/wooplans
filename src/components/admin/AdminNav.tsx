"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Item = { href: string; label: string; short?: string; icon: string };

/** Icônes en tracés SVG (pas de bibliothèque : rien à télécharger en plus). */
const ICONS: Record<string, string> = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  whatsapp: "M4 20l1.3-3.9A8 8 0 1 1 8 19zM9 9.5c0 2.8 2.7 5.5 5.5 5.5l1.3-1.3-2-1-1 .8c-1-.5-1.8-1.3-2.3-2.3l.8-1-1-2z",
  crm: "M16 11a4 4 0 1 0-8 0M4 21a8 8 0 0 1 16 0M12 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  fiche: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",
  sales: "M3 3v18h18M7 15l4-4 3 3 6-7",
  pipeline: "M3 5h18l-7 8v6l-4 2v-8z",
  prospects: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M17 11l2 2 4-4",
  members: "M12 2l3 6 6 .9-4.5 4.3 1 6.3L12 16.6 6.5 19.5l1-6.3L3 8.9 9 8z",
  star: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  plans: "M3 21V9l9-6 9 6v12zM9 21v-7h6v7",
  mail: "M3 5h18v14H3zM3 6l9 7 9-7",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3.1 14H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 3.1V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  external: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
};

export function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  );
}

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Au quotidien",
    items: [
      { href: "/admin", label: "Tableau de bord", short: "Accueil", icon: "home" },
      { href: "/admin/chantier", label: "Plans complets (relances)", short: "Chantiers", icon: "plans" },
      { href: "/admin/relances", label: "Relances WhatsApp", short: "Relances", icon: "whatsapp" },
      { href: "/admin/ventes", label: "Ventes", icon: "sales" },
      { href: "/admin/gains", label: "Gain réel", icon: "sales" },
      { href: "/admin/crm", label: "CRM plans complets", short: "CRM", icon: "crm" },
    ],
  },
  {
    title: "Suivi",
    items: [
      { href: "/admin/plan-devis", label: "Fiches (détail)", icon: "fiche" },
      { href: "/admin/pipeline", label: "Pipeline", icon: "pipeline" },
      { href: "/admin/prospects", label: "Prospects", icon: "prospects" },
      { href: "/admin/membres", label: "Membres", icon: "members" },
      { href: "/admin/temoignages", label: "Témoignages", icon: "star" },
    ],
  },
  {
    title: "Contenu et réglages",
    items: [
      { href: "/admin/plans", label: "Modèles", icon: "plans" },
      { href: "/admin/emails", label: "Emails", icon: "mail" },
      { href: "/admin/liens", label: "Liens UTM", icon: "link" },
      { href: "/admin/reglages", label: "Réglages", icon: "settings" },
    ],
  },
];

const ALL = GROUPS.flatMap((g) => g.items);
const TABS = ALL.filter((i) => i.short);

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Navigation de l'admin : barre latérale sur ordinateur, barre d'onglets en bas sur téléphone. */
export function AdminNav({ email, badges }: { email: string; badges?: Record<string, number> }) {
  const pathname = usePathname();
  const [pending, setPending] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  // Retour visuel immédiat au clic, effacé dès que la nouvelle page est là.
  useEffect(() => {
    setPending(null);
    setMoreOpen(false);
  }, [pathname]);

  const current = (href: string) => (pending ? pending === href : isActive(pathname, href));
  const badge = (href: string) => (badges?.[href] ? <span className="ml-auto rounded-full bg-[#25D366] px-2 py-0.5 text-[11px] font-bold text-white">{badges[href]}</span> : null);
  const go = (href: string) => () => {
    if (!isActive(pathname, href)) setPending(href);
  };

  return (
    <>
      {/* Ordinateur */}
      <aside className="sticky top-0 hidden h-screen flex-col overflow-y-auto bg-primary-dark text-white lg:flex">
        <div className="px-5 pb-4 pt-5">
          <Link href="/admin" className="inline-flex" aria-label="Tableau de bord">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/wooplans-logo-white.png" alt="WOOPLANS" style={{ height: 30, width: "auto" }} />
          </Link>
          <p className="mt-1.5 truncate text-xs text-white/45">{email}</p>
        </div>
        <nav className="flex-1 space-y-5 px-3 pb-4 text-sm">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/35">{g.title}</p>
              <div className="space-y-0.5">
                {g.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={go(item.href)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                      current(item.href) ? "bg-white/15 font-semibold text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {badge(item.href)}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="space-y-0.5 border-t border-white/10 p-3 text-sm">
          <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg px-3 py-2 text-white/55 hover:bg-white/10 hover:text-white">
            <Icon name="external" className="h-[18px] w-[18px]" /> Voir le site
          </a>
          <form action="/api/admin/deconnexion" method="post">
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-white/55 hover:bg-white/10 hover:text-white">
              <Icon name="logout" className="h-[18px] w-[18px]" /> Déconnexion
            </button>
          </form>
        </div>
      </aside>

      {/* Téléphone : en-tête */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-primary-dark px-4 py-3 text-white lg:hidden">
        <Link href="/admin" aria-label="Tableau de bord">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/wooplans-logo-white.png" alt="WOOPLANS" style={{ height: 26, width: "auto" }} />
        </Link>
        <span className="text-sm font-semibold text-white/80">{ALL.find((i) => current(i.href))?.label ?? "Admin"}</span>
      </header>

      {/* Téléphone : barre d'onglets */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-outline bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="grid grid-cols-5">
          {TABS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={go(item.href)}
              className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${current(item.href) ? "text-primary" : "text-muted"}`}
            >
              <Icon name={item.icon} className="h-[22px] w-[22px]" />
              {item.short}
              {badges?.[item.href] ? (
                <span className="absolute right-[22%] top-1 min-w-[18px] rounded-full bg-[#25D366] px-1 text-center text-[10px] font-bold leading-[18px] text-white">{badges[item.href]}</span>
              ) : null}
            </Link>
          ))}
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${moreOpen || !TABS.some((t) => current(t.href)) ? "text-primary" : "text-muted"}`}
          >
            <Icon name="more" className="h-[22px] w-[22px]" />
            Plus
          </button>
        </div>
      </nav>
      {moreOpen ? (
        <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] rounded-t-2xl bg-white p-3 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-3 gap-2">
              {ALL.filter((i) => !i.short).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={go(item.href)}
                  className={`flex flex-col items-center gap-1 rounded-xl p-3 text-center text-xs font-medium ${current(item.href) ? "bg-primary/10 text-primary" : "bg-background text-foreground/80"}`}
                >
                  <Icon name={item.icon} />
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="mt-3 flex justify-between border-t border-outline pt-3 text-sm">
              <a href="/" target="_blank" rel="noopener noreferrer" className="text-muted">Voir le site ↗</a>
              <form action="/api/admin/deconnexion" method="post">
                <button className="text-muted">Déconnexion</button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
