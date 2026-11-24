import type { Metadata } from "next";
import { ChantierForm } from "@/components/guide/ChantierForm";
import { CHANTIER_QUESTIONS } from "@/lib/chantier-rules";

export const metadata: Metadata = {
  title: "Démarrez votre chantier",
  description: "Quelques questions sur votre projet de construction, puis un architecte WooPlans vous répond sur WhatsApp.",
  robots: { index: false, follow: false },
};

/**
 * Page des campagnes « Démarre ton chantier » (plans complets) : formulaire de qualification, puis WhatsApp avec le
 * code du dossier. Aucune distraction (mise en page des pages d'entrée, sans en-tête ni pied de page).
 */
export default function DemarrerMonChantierPage() {
  return (
    <div className="min-h-dvh bg-primary text-white">
      <div className="container-page max-w-xl py-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/wooplans-logo-white.png" alt="WOOPLANS" width={120} height={36} className="h-8 w-auto" />
        <h1 className="mt-6 text-2xl font-bold leading-tight md:text-3xl">Démarrez votre chantier avec les bons plans</h1>
        <p className="mt-2 text-white/80">
          Quelques questions rapides sur votre projet, puis votre nom et la ville du chantier. Ensuite, un architecte WooPlans vous répond sur WhatsApp.
        </p>
        <ChantierForm
          questions={CHANTIER_QUESTIONS.map((q) => ({
            key: q.key,
            label: q.label,
            showIf: "showIf" in q ? q.showIf : undefined,
            options: q.options.map(([value, label]) => ({ value, label })),
          }))}
        />
      </div>
    </div>
  );
}
