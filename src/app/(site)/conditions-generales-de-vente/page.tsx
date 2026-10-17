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
        Le Catalogue Premium WOOPLANS est un produit numérique comprenant un accès personnel à l&apos;espace Premium en ligne (modèles de villas et duplex, y compris ceux ajoutés ultérieurement) et une fiche PDF téléchargeable pour chaque modèle, marquée au nom de l&apos;acheteur.
      </p>
      <h2>2. Prix et paiement</h2>
      <p>
        Le prix est de {formatFcfa(cataloguePrice())}, en paiement unique. Le paiement est traité par notre prestataire Chariow (Mobile Money, carte bancaire).
      </p>
      <h2>3. Livraison</h2>
      <p>
        Après confirmation du paiement, le code d&apos;accès personnel est affiché à l&apos;écran et envoyé à l&apos;adresse email indiquée lors de la commande. Les fiches PDF se téléchargent depuis l&apos;espace Premium.
      </p>
      <h2>4. Nature des documents</h2>
      <p>
        Les distributions cotées et les devis estimatifs servent à comparer et à choisir un modèle. Ils ne constituent pas des plans d&apos;exécution. L&apos;adaptation au terrain et le dossier technique complet font l&apos;objet d&apos;une prestation distincte, à prix fixe (149 000 FCFA pour une villa, 249 000 FCFA pour un duplex) ; le prix du catalogue est alors déduit de ce prix.
      </p>
      <h2>5. Accès et usage</h2>
      <p>
        L&apos;accès est personnel et non cessible. En cas de partage abusif ou de remboursement, WOOPLANS peut désactiver l&apos;accès à l&apos;espace Premium.
      </p>
      <p>
        Les plans, distributions cotées, rendus 3D, devis et textes sont la propriété de WOOPLANS et protégés par le droit d&apos;auteur. Les fiches PDF sont
        destinées à un usage personnel : l&apos;acheteur peut les imprimer et les transmettre en privé à un proche ou à l&apos;entrepreneur qu&apos;il consulte pour son
        propre projet. Sont interdits la publication sur les réseaux sociaux ou sur internet, la revente, l&apos;usage commercial ou publicitaire, la
        reproduction ou la modification des plans, ainsi que la suppression des filigranes. Chaque fiche est marquée au nom de l&apos;acheteur avec un
        identifiant unique permettant d&apos;en retrouver l&apos;origine.
      </p>
      <p>
        Pour prévenir la copie du catalogue, le téléchargement des fiches est limité à 3 nouveaux modèles par jour et 10 par période de 30 jours ;
        re-télécharger une fiche déjà obtenue n&apos;est pas décompté. Au-delà de 20 fiches téléchargées au total, les téléchargements sont bloqués
        définitivement. Tous les modèles restent consultables en ligne dans l&apos;espace Premium.
      </p>
      <h2>6. Rétractation</h2>
      <p>
        S&apos;agissant d&apos;un contenu numérique fourni immédiatement après le paiement, l&apos;acheteur accepte que la livraison commence dès la confirmation du paiement. Pour toute réclamation, écrivez à {SITE.email}.
      </p>
    </ContentPage>
  );
}
