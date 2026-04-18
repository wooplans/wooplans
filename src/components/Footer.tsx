import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-surface text-foreground border-t border-outline/10">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-lg font-semibold tracking-tight text-foreground">WooPlans</p>
          <ul className="flex gap-6 text-sm font-medium text-foreground/70">
            <li>
              <Link href="/plans" className="hover:text-foreground transition-colors">
                Catalogue
              </Link>
            </li>
            <li>
              <Link
                href="/abonnement"
                className="hover:text-foreground transition-colors"
              >
                Abonnement
              </Link>
            </li>
            <li>
              <Link
                href="/admin"
                className="hover:text-foreground transition-colors"
              >
                Admin
              </Link>
            </li>
          </ul>
        </div>
        <div className="mt-8 pt-4 border-t border-outline/10 text-center text-xs text-foreground/50">
          &copy; {new Date().getFullYear()} WooPlans. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
