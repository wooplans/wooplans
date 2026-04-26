"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import type { SessionUser } from "@/lib/auth";
import { useTheme } from "@/hooks/useTheme";

type SessionResponse = {
  session?: { user?: SessionUser } | null;
};

const isPremium = (u: SessionUser | null) =>
  u?.role === "subscriber" && u.isActive === true;

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    fetch("/api/auth/session")
      .then((r) => r.json() as Promise<SessionResponse>)
      .then((data) => setSessionUser(data.session?.user ?? null))
      .catch(() => undefined);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = () => setMenuOpen(false);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-200 bg-surface ${
        scrolled ? "border-b border-outline/15 shadow-sm" : "border-b border-transparent"
      }`}
    >
      <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 text-xl font-semibold text-foreground tracking-tight">
          WooPlans
          {isPremium(sessionUser) && (
            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-highlight text-foreground rounded-sm">
              Premium
            </span>
          )}
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Activer le mode clair" : "Activer le mode sombre"}
            className="p-1.5 rounded-full text-foreground/70 hover:text-foreground transition-colors"
          >
            {theme === "dark" ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          <button
            className="md:hidden text-foreground"
            onClick={() => setMenuOpen(true)}
            aria-label="Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <ul className="hidden md:flex items-center gap-8 text-sm font-medium text-foreground/80">
          <li>
            <Link href="/" className="hover:text-foreground transition-colors">Accueil</Link>
          </li>
          <li>
            <Link href="/plans" className="hover:text-foreground transition-colors">Catalogue</Link>
          </li>
          <li>
            <Link
              href="/abonnement"
              className="px-4 py-2 rounded-full border border-outline/20 text-foreground hover:border-outline/60 transition-colors"
            >
              Abonnement
            </Link>
          </li>
          {sessionUser?.role === "subscriber" ? (
            <li>
              <Link href="/connexion" className="text-sm text-primary hover:text-primary-dark font-semibold">
                Mon Compte
              </Link>
            </li>
          ) : (
            <li>
              <Link href="/connexion" className="text-sm text-primary hover:text-primary-dark font-semibold">
                Connexion
              </Link>
            </li>
          )}
          <li>
            <Link href="/admin" className="text-xs text-foreground/40 hover:text-foreground transition-colors uppercase tracking-wider">
              Admin
            </Link>
          </li>
        </ul>
      </nav>

      {/* Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 md:hidden ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={close}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-dvh w-[280px] max-w-[80vw] bg-surface shadow-2xl transform transition-transform duration-300 ease-in-out md:hidden flex flex-col ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-outline/10">
          <span className="flex items-center gap-1.5 text-lg font-semibold text-foreground tracking-tight">
            Menu
            {isPremium(sessionUser) && (
              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-highlight text-foreground rounded-sm">
                Premium
              </span>
            )}
          </span>
          <button onClick={close} aria-label="Fermer" className="text-foreground">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <ul className="flex flex-col px-4 py-6 gap-5 text-base font-medium text-foreground/80 flex-1">
          <li>
            <Link href="/" onClick={close} className="block hover:text-foreground transition-colors">Accueil</Link>
          </li>
          <li>
            <Link href="/plans" onClick={close} className="block hover:text-foreground transition-colors">Catalogue</Link>
          </li>
          <li>
            <Link href="/abonnement" onClick={close} className="block text-primary font-semibold hover:text-primary-dark transition-colors">
              Abonnement
            </Link>
          </li>
          {sessionUser?.role === "subscriber" ? (
            <li>
              <Link href="/connexion" onClick={close} className="block text-primary font-semibold hover:text-primary-dark transition-colors">
                Mon Compte
              </Link>
            </li>
          ) : (
            <li>
              <Link href="/connexion" onClick={close} className="block text-primary font-semibold hover:text-primary-dark transition-colors">
                Connexion
              </Link>
            </li>
          )}
          <li>
            <Link href="/admin" onClick={close} className="block text-xs text-foreground/40 uppercase tracking-wider hover:text-foreground transition-colors">
              Admin
            </Link>
          </li>
          <li>
            <button
              onClick={() => { toggleTheme(); }}
              className="flex items-center gap-3 text-foreground/60 hover:text-foreground transition-colors"
            >
              {theme === "dark" ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
              {theme === "dark" ? "Mode clair" : "Mode sombre"}
            </button>
          </li>
        </ul>

        {!isPremium(sessionUser) && (
          <div className="p-4 border-t border-outline/10">
            <Link
              href="/abonnement"
              onClick={close}
              className="block w-full text-center py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition-colors"
            >
              Devenir Premium — 19 900 FCFA/an
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}