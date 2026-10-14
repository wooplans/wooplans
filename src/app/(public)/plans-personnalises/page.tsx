import Link from "next/link";
export const metadata = {
  title: "Plans complets personnalisés | Wooplans",
  alternates: { canonical: "/plans-personnalises" },
};
export default function Page() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 space-y-6">
      <h1 className="text-3xl font-semibold">
        Des plans adaptés à votre projet
      </h1>
      <p>
        Après avoir choisi un modèle, nous étudions votre terrain, vos besoins
        et les modifications souhaitées.
      </p>
      <h2 className="text-xl font-semibold">
        Une prestation distincte, sur devis
      </h2>
      <p>
        Le prix dépend du modèle, des adaptations et des documents convenus. Le
        devis précise les livrables, délais, modifications incluses et
        paiements. Un éventuel crédit lié à votre achat du catalogue est indiqué
        avant engagement ; il ne s’agit pas d’une seconde déduction automatique.
      </p>
      <p>
        Le budget de construction affiché sur une fiche est différent des
        honoraires pour les plans personnalisés.
      </p>
      <Link
        className="inline-flex rounded-full bg-accent px-6 py-3 text-white"
        href="/abonnement"
      >
        Commencer par le Catalogue Premium
      </Link>
      <p>
        <Link href="/premium" className="underline">
          Déjà membre ? Préparer ma demande
        </Link>
      </p>
    </section>
  );
}
