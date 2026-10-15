import type { Metadata } from "next";
import { ConsentSettings } from "@/components/BehaviorAnalytics";
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
        <li>Mesure d&apos;audience : pages vues et provenance des visites (paramètres UTM), via un identifiant anonyme, ainsi que le Pixel Meta et PostHog.</li>
      </ul>
      <h2>Mesure d&apos;audience et amélioration du site (PostHog)</h2>
      <p>
        Pour comprendre comment le site est utilisé et l&apos;améliorer (pages consultées, clics, défilement, difficultés rencontrées),
        nous utilisons PostHog, hébergé dans l&apos;Union européenne (Francfort). Des enregistrements anonymisés de navigation peuvent être réalisés :
        tout ce que vous saisissez dans les formulaires est masqué, le module de paiement est exclu, et aucune mesure n&apos;a lieu sur
        l&apos;espace Premium, la page de connexion ni la page de confirmation d&apos;achat. Aucun email, téléphone ou code d&apos;accès
        n&apos;est transmis : seul un identifiant aléatoire relie vos visites.
      </p>
      <p>
        Durées de conservation : enregistrements de navigation 30 jours, statistiques d&apos;utilisation 1 an au plus, cookies de mesure 1 an,
        cookie mémorisant votre choix 13 mois. Les visiteurs situés en Europe sont mesurés uniquement après leur accord.
      </p>
      <ConsentSettings />
      <h2>Utilisation</h2>
      <p>Livraison du produit, envoi de votre code d&apos;accès, suivi de vos demandes et amélioration du site. Vos données ne sont jamais revendues.</p>
      <h2>Vos droits</h2>
      <p>Vous pouvez demander l&apos;accès, la rectification ou la suppression de vos données en écrivant à {SITE.email}.</p>
    </ContentPage>
  );
}
