"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SITE } from "@/lib/site";

export function MobileMenu({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <button
        type="button"
        className="rounded-lg p-2 text-white lg:hidden"
        aria-label="Ouvrir le menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setOpen(false)}>
          <div
            className="absolute right-0 top-0 flex h-full w-[84%] max-w-sm flex-col gap-1 bg-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="mb-4 self-end p-2 text-2xl leading-none" aria-label="Fermer" onClick={() => setOpen(false)}>
              ×
            </button>
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-xl px-3 py-3 text-base font-medium hover:bg-background">
                {link.label}
              </Link>
            ))}
            <Link href="/connexion" className="rounded-xl px-3 py-3 text-base font-medium hover:bg-background">
              Espace Premium
            </Link>
            <Link href={SITE.catalogueUrl} data-cta="mobile_menu" className="btn-cta mt-4 w-full">
              {SITE.catalogueCta}
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
