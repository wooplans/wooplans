import Image from "next/image";
import Link from "next/link";
import { CheckoutLeadForm } from "@/components/CheckoutLeadForm";
import { cataloguePrice } from "@/lib/offer";
export const metadata = {
  title: "Catalogue Premium Wooplans | Choisir et budgétiser votre maison",
  alternates: { canonical: "/abonnement" },
};
export default function CatalogueSalesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 space-y-12">
      <section className="rounded-2xl bg-primary p-8 text-white md:p-12">
        <Link href="/" className="text-sm">
          Wooplans
        </Link>
        <p className="mt-8 text-sm uppercase tracking-widest">
          Catalogue Premium
        </p>
        <h1 className="mt-3 text-3xl font-semibold md:text-5xl">
          Choisissez votre future maison avec une vision claire de son budget.
        </h1>
        <p className="my-6 text-lg">
          Comparez plus de 50 villas et duplex, leurs distributions et leurs
          devis estimatifs. Un achat pour avancer dans votre choix en famille.
        </p>
        <a
          href="#commander"
          className="inline-flex rounded-full bg-accent px-7 py-4 font-semibold"
        >
          Obtenir le Catalogue Premium · {cataloguePrice}
        </a>
        <p className="mt-4 text-sm">
          Paiement unique · accès à vie · mises à jour incluses
        </p>
      </section>
      <div className="overflow-hidden rounded-2xl">
        <Image
          src="/images/premium-catalogue-mockup.webp"
          alt="Présentation du Catalogue Premium Wooplans"
          width={1200}
          height={800}
          sizes="(max-width: 768px) 100vw, 896px"
        />
      </div>
      <section>
        <h2 className="text-2xl font-semibold">
          Un produit, deux façons de le consulter
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            [
              "Votre catalogue à télécharger",
              "Un PDF pour conserver les modèles, les parcourir hors connexion et comparer avec votre conjoint.",
            ],
            [
              "Votre espace Premium",
              "Les fiches par modèle, les documents détaillés et les mises à jour réunis au même endroit.",
            ],
          ].map(([title, text]) => (
            <article
              key={title}
              className="rounded-2xl border border-outline/10 bg-surface p-6"
            >
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-3">{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section>
        <h2 className="text-2xl font-semibold">
          Ce que vous examinez pour chaque modèle
        </h2>
        <ul className="mt-5 space-y-3">
          <li>Rendus 3D, chambres, surfaces et caractéristiques.</li>
          <li>Plans de distribution cotés pour comprendre les pièces.</li>
          <li>Devis estimatifs pour comparer les budgets et les postes.</li>
        </ul>
        <p className="mt-5 text-sm text-foreground/70">
          Les coûts restent indicatifs : terrain, localisation, matériaux et
          niveau de finition influencent le budget réel. Ils ne constituent pas
          un prix garanti de construction.
        </p>
        <Link
          href="/plans"
          className="mt-5 inline-block font-semibold text-primary"
        >
          Découvrir les modèles →
        </Link>
      </section>
      <section>
        <h2 className="text-2xl font-semibold">
          Commencez par trois modèles favoris
        </h2>
        <p className="mt-4">
          Définissez vos besoins, sélectionnez vos références favorites et
          comparez leurs distributions et budgets. Vous pouvez ensuite préparer
          une demande de personnalisation.
        </p>
      </section>
      <section className="rounded-2xl bg-surface p-6">
        <h2 className="text-2xl font-semibold">
          Après le choix : les plans personnalisés
        </h2>
        <p className="mt-4">
          Le catalogue sert à choisir et budgétiser. L’adaptation au terrain et
          les documents techniques complets font l’objet d’une prestation
          distincte, sur devis. Les conditions d’un éventuel crédit catalogue
          sont précisées dans votre proposition avant engagement.
        </p>
        <Link
          href="/plans-personnalises"
          className="mt-4 inline-block text-primary font-semibold"
        >
          Comprendre cette prestation →
        </Link>
      </section>
      <section
        id="commander"
        className="scroll-mt-8 rounded-2xl border border-outline/10 bg-white p-6 text-slate-950"
      >
        <h2 className="text-2xl font-semibold">
          Obtenir mon Catalogue Premium
        </h2>
        <p className="my-4">{cataloguePrice} · achat unique · accès à vie</p>
        <CheckoutLeadForm
          ctaId="catalogue-order"
          buttonLabel="Continuer vers le paiement sécurisé"
        />
        <p className="mt-5 text-sm">
          Les moyens de paiement et le montant final sont confirmés par le
          prestataire. Les documents et instructions de livraison sont
          disponibles dans votre commande après paiement confirmé.
        </p>
      </section>
      <section className="space-y-5">
        <h2 className="text-2xl font-semibold">Avant de commander</h2>
        <details className="rounded-xl border p-4">
          <summary>Est-ce un abonnement ?</summary>
          <p className="mt-3">
            Non. C’est un achat unique, avec accès à vie et ajouts inclus.
          </p>
        </details>
        <details className="rounded-xl border p-4">
          <summary>Puis-je construire directement avec le catalogue ?</summary>
          <p className="mt-3">
            Vous recevez les distributions et estimations pour comprendre et
            sélectionner les modèles. Le dossier technique adapté à votre projet
            est une prestation distincte.
          </p>
        </details>
        <details className="rounded-xl border p-4">
          <summary>Comment recevoir mon achat et obtenir de l’aide ?</summary>
          <p className="mt-3">
            Consultez votre commande Chariow et ses instructions. Pour une
            difficulté de livraison ou les conditions de remboursement,
            contactez{" "}
            <a className="underline" href="https://wa.me/237694327885">
              le support Wooplans
            </a>{" "}
            et consultez les conditions affichées avant paiement.
          </p>
        </details>
      </section>
    </div>
  );
}
