import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";
import { formatFcfa } from "@/lib/plans";
import { cataloguePrice, SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Conditions générales de vente", alternates: { canonical: "/conditions-generales-de-vente" } };

export default function CgvPage() {
  return (
    <ContentPage title="Conditions générales de vente">
      <h2>1. Produit</h2>
      <p>
        Le Catalogue Premium WOOPLANS est un produit numérique comprenant un catalogue PDF de plus de 50 modèles de villas et duplex et un accès personnel à l&apos;espace Premium en ligne, y compris les modèles ajoutés ultérieurement.
      </p>
      <h2>2. Prix et paiement</h2>
      <p>
        Le prix est de {formatFcfa(cataloguePrice())}, en paiement unique. Le paiement est traité par notre prestataire Chariow (Mobile Money, carte bancaire).
      </p>
      <h2>3. Livraison</h2>
      <p>
        Après confirmation du paiement, le PDF et le code d&apos;accès personnel sont envoyés à l&apos;adresse email indiquée lors de la commande. Le code est aussi affiché à l&apos;écran après l&apos;achat.
      </p>
      <h2>4. Nature des documents</h2>
      <p>
        Les distributions cotées et les devis estimatifs servent à comparer et à choisir un modèle. Ils ne constituent pas des plans d&apos;exécution. L&apos;adaptation au terrain et le dossier technique complet font l&apos;objet d&apos;une prestation distincte, sur devis ; le prix du catalogue est alors déduit des honoraires.
      </p>
      <h2>5. Accès et usage</h2>
      <p>
        L&apos;accès est personnel et non cessible. En cas de partage abusif ou de remboursement, WOOPLANS peut désactiver l&apos;accès à l&apos;espace Premium.
      </p>
      <h2>6. Rétractation</h2>
      <p>
        S&apos;agissant d&apos;un contenu numérique fourni immédiatement après le paiement, l&apos;acheteur accepte que la livraison commence dès la confirmation du paiement. Pour toute réclamation, écrivez à {SITE.email}.
      </p>
    </ContentPage>
  );
}
