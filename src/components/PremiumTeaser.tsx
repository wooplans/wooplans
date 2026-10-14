import Link from "next/link";
import { cataloguePrice } from "@/lib/offer";

// This component receives no protected URLs or documents for anonymous visitors.
export function PremiumTeaser({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-outline/10 bg-primary/5 p-8 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="my-3 text-sm text-foreground/70">{subtitle}</p>
      <p className="mb-5 text-sm">
        Ce modèle et tous les autres sont inclus dans le Catalogue Premium.
      </p>
      <Link
        href="/abonnement"
        className="inline-flex rounded-full bg-accent px-6 py-3 font-semibold text-white"
      >
        Obtenir le Catalogue Premium
      </Link>
      <p className="mt-3 text-xs">
        {cataloguePrice} · paiement unique · accès à vie
      </p>
    </div>
  );
}
