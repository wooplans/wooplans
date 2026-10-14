import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/ContentPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "À propos de WooPlans",
  description: "WooPlans conçoit des plans de villas et duplex adaptés au contexte de l'Afrique francophone, pour aider chaque famille à choisir sa maison.",
  alternates: { canonical: "/a-propos" },
};

export default function AboutPage() {
  return (
    <ContentPage eyebrow="À propos" title="Aider chaque famille à choisir la bonne maison">
      <p>
        WooPlans est né d&apos;un constat simple : avant de construire, la plupart des familles n&apos;ont ni plans à comparer ni idée claire du budget. On choisit souvent trop tard, ou sur la base d&apos;une seule image.
      </p>
      <p>
        Nous avons donc réuni plus de 50 modèles de villas et de duplex pensés pour l&apos;Afrique francophone : climat, modes de vie, tailles de terrains et coûts de construction locaux. Chaque modèle est présenté avec ses rendus 3D, sa distribution cotée et un devis estimatif détaillé.
      </p>
      <h2>Notre approche</h2>
      <ul>
        <li>Des modèles réalistes, conçus par des architectes, adaptés aux terrains courants.</li>
        <li>Des budgets estimés à partir de ratios professionnels actualisés.</li>
        <li>Un accompagnement sur WhatsApp, de la sélection du modèle jusqu&apos;aux plans complets.</li>
      </ul>
      <p>
        <Link href={SITE.catalogueUrl} data-cta="about" className="font-semibold text-primary hover:underline">
          Découvrir le Catalogue Premium →
        </Link>
      </p>
    </ContentPage>
  );
}
