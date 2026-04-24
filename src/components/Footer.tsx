import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-secondary text-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid gap-10 md:grid-cols-[1.3fr_1fr_1fr] md:items-start">
          <div>
            <p className="font-display text-3xl tracking-tight">WooPlans</p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-surface/65">
              Des modèles de villas et duplex pensés pour explorer, comparer et lancer un projet de construction avec plus de clarté.
            </p>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-primary">Catalogue</p>
            <ul className="mt-4 space-y-3 text-sm font-semibold text-surface/70">
              <li>
                <Link href="/plans" className="hover:text-surface transition-colors">
                  Tous les plans
                </Link>
              </li>
              <li>
                <Link href="/abonnement" className="hover:text-surface transition-colors">
                  Accès Premium
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-primary">Espace</p>
            <ul className="mt-4 space-y-3 text-sm font-semibold text-surface/70">
              <li>
                <Link href="/connexion" className="hover:text-surface transition-colors">
                  Connexion
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-surface transition-colors">
                  Admin
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-surface/10 pt-5 text-xs text-surface/45 md:flex-row md:items-center md:justify-between">
          <p>&copy; {new Date().getFullYear()} WooPlans. Tous droits réservés.</p>
          <p>Plans, devis et accompagnement pour construire avec méthode.</p>
        </div>
      </div>
    </footer>
  );
}
