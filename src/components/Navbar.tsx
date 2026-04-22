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
      className={`sticky top-0 z-50 transition-all duration-200 bg-background/90 backdrop-blur ${
        scrolled ? "border-b border-outline/15 shadow-sm" : "border-b border-transparent"
      }`}
    >
      <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold text-foreground tracking-tight">
          WooPlans
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

        <ul className="hidden md:flex items-center gap-8 text-sm font-medium text-foreground/80">
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
              className="px-4 py-2 rounded-full border border-foreground/20 text-foreground hover:border-foreground/60 transition-colors"
            >
              Abonnement
            </Link>
          </li>
          {sessionUser?.role === "subscriber" ? (
            <li>
              <Link
                href="/connexion"
                className="text-sm text-primary hover:text-primary-dark font-semibold"
              >
                Mon Compte
              </Link>
            </li>
          ) : (
            <li>
              <Link
                href="/connexion"
                className="text-sm text-primary hover:text-primary-dark font-semibold"
              >
                Connexion
              </Link>
            </li>
          )}
        </ul>
      </nav>

      {menuOpen && (
        <div className="md:hidden bg-background border-t border-outline/10">
          <ul className="flex flex-col px-4 py-4 gap-4 text-sm font-medium">
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
