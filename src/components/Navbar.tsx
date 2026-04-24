"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import type { SessionUser } from "@/lib/auth";

type SessionResponse = {
  session?: { user?: SessionUser } | null;
};

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    fetch("/api/auth/session")
      .then((response) => response.json() as Promise<SessionResponse>)
      .then((data) => {
        setSessionUser(data.session?.user ?? null);
      })
      .catch(() => undefined);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-200 bg-surface/85 backdrop-blur-xl ${
        scrolled ? "border-b border-outline/15 shadow-[0_10px_40px_rgba(30,26,23,0.08)]" : "border-b border-transparent"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 min-h-[72px] flex items-center justify-between">
        <Link href="/" className="group flex items-center gap-3 text-foreground">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-black text-surface">
            WP
          </span>
          <span className="leading-none">
            <span className="block font-display text-2xl tracking-tight">WooPlans</span>
            <span className="hidden text-[10px] font-bold uppercase tracking-[0.24em] text-muted sm:block">
              Architecture catalogue
            </span>
          </span>
        </Link>

        <button
          className="md:hidden text-foreground"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {menuOpen ? (
              <path
                strokeLinecap="square"
                strokeLinejoin="miter"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="square"
                strokeLinejoin="miter"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>

        <ul className="hidden md:flex items-center gap-8 text-sm font-semibold text-foreground/75">
          <li>
            <Link href="/" className="hover:text-foreground transition-colors">
              Accueil
            </Link>
          </li>
          <li>
            <Link
              href="/plans"
              className="hover:text-foreground transition-colors"
            >
              Catalogue
            </Link>
          </li>
          <li>
            <Link
              href="/abonnement"
              className="rounded-full bg-primary px-5 py-2.5 text-white shadow-[0_12px_30px_rgba(184,106,60,0.25)] transition-colors hover:bg-primary-dark"
            >
              Abonnement
            </Link>
          </li>
          {sessionUser?.role === "subscriber" ? (
            <li>
              <Link
                href="/connexion"
                className="text-sm text-primary hover:text-primary-dark font-bold"
              >
                Mon Compte
              </Link>
            </li>
          ) : (
            <li>
              <Link
                href="/connexion"
                className="text-sm text-primary hover:text-primary-dark font-bold"
              >
                Connexion
              </Link>
            </li>
          )}
        </ul>
      </nav>

      {menuOpen && (
        <div className="md:hidden bg-surface border-t border-outline/10 shadow-xl">
          <ul className="flex flex-col px-4 py-5 gap-4 text-sm font-semibold">
            <li>
              <Link href="/" onClick={() => setMenuOpen(false)}>
                Accueil
              </Link>
            </li>
            <li>
              <Link href="/plans" onClick={() => setMenuOpen(false)}>
                Catalogue
              </Link>
            </li>
            <li>
              <Link href="/abonnement" onClick={() => setMenuOpen(false)} className="text-primary">
                Abonnement
              </Link>
            </li>
            {sessionUser?.role === "subscriber" ? (
              <li>
                <Link href="/connexion" onClick={() => setMenuOpen(false)} className="text-primary font-semibold">
                  Mon Compte
                </Link>
              </li>
            ) : (
              <li>
                <Link href="/connexion" onClick={() => setMenuOpen(false)} className="text-primary font-semibold">
                  Connexion
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}
    </header>
  );
}
