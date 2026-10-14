import Link from "next/link";
import { cataloguePrice } from "@/lib/offer";
type Props = {
  category: string;
  name: string;
  slug: string;
  thumbnail: string;
  initialPremium?: boolean;
};
export function ConversionAnchor({
  name,
  slug,
  initialPremium = false,
}: Props) {
  return (
    <div className="rounded-2xl bg-primary p-8 text-center text-white">
      <h2 className="text-2xl font-semibold">
        {initialPremium
          ? "Ce modèle vous convient ?"
          : `${name} est inclus dans le Catalogue Premium`}
      </h2>
      <p className="my-4">
        {initialPremium
          ? "Décrivez votre terrain et vos besoins pour préparer un devis de plans personnalisés."
          : "Comparez les distributions et les estimations, puis sélectionnez vos modèles favoris."}
      </p>
      <Link
        href={
          initialPremium
            ? `/premium?modele=${encodeURIComponent(slug)}`
            : "/abonnement"
        }
        className="inline-flex rounded-full bg-accent px-7 py-3 font-semibold text-white"
      >
        {initialPremium
          ? "Demander une personnalisation"
          : "Obtenir le Catalogue Premium"}
      </Link>
      {!initialPremium && (
        <p className="mt-3 text-sm">
          {cataloguePrice} · achat unique · accès à vie
        </p>
      )}
    </div>
  );
}
