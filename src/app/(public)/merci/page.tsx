import Link from "next/link";
export default function ThankYouPage() {
  return <section className="mx-auto max-w-xl px-4 py-20 text-center">
    <h1 className="text-3xl font-semibold">Retrouvez votre commande</h1>
    <p className="my-6">Votre accès est activé après confirmation du paiement par notre prestataire. Retrouvez le PDF et les instructions dans votre commande Chariow. Une arrivée sur cette page ne confirme pas à elle seule un paiement.</p>
    <Link href="/connexion" className="inline-block rounded-full bg-primary px-6 py-3 text-white">Me connecter à mon espace</Link>
    <p className="mt-6"><a href="https://wa.me/237694327885">Besoin d’aide avec votre accès ?</a></p>
  </section>;
}
