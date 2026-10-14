import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Politique de confidentialité", alternates: { canonical: "/confidentialite" } };

export default function PrivacyPage() {
  return (
    <ContentPage title="Politique de confidentialité">
      <p>Nous collectons uniquement les données nécessaires pour livrer le Catalogue Premium, gérer votre accès et répondre à vos demandes.</p>
      <h2>Données collectées</h2>
      <ul>
        <li>Achat : nom, email, téléphone et pays transmis par notre prestataire de paiement Chariow.</li>
        <li>Demandes de plans : les informations que vous saisissez dans le formulaire.</li>
        <li>Mesure d&apos;audience : pages vues et provenance des visites (paramètres UTM), via un identifiant anonyme, ainsi que le Pixel Meta et Microsoft Clarity.</li>
      </ul>
      <h2>Utilisation</h2>
      <p>Livraison du produit, envoi de votre code d&apos;accès, suivi de vos demandes et amélioration du site. Vos données ne sont jamais revendues.</p>
      <h2>Vos droits</h2>
      <p>Vous pouvez demander l&apos;accès, la rectification ou la suppression de vos données en écrivant à {SITE.email}.</p>
    </ContentPage>
  );
}
