import Link from "next/link";

export function ConversionAnchor() {
  return (
    <div className="border-2 border-outline bg-surface p-8 md:p-12 text-center">
      <h2 className="text-xl md:text-2xl font-black text-foreground mb-3 tracking-tight">
        Lancez votre projet de construction
      </h2>
      <p className="text-sm text-foreground/50 max-w-md mx-auto leading-relaxed mb-8">
        Accédez aux plans de distribution, devis estimatifs et échangez avec
        nos architectes pour personnaliser votre projet.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/abonnement"
          className="px-7 py-3 bg-primary text-white font-bold text-sm border-2 border-primary hover:bg-transparent hover:text-primary transition-colors"
        >
          Découvrir l&apos;abonnement Premium
        </Link>
        <a
          href="https://wa.me/?text=Bonjour, je suis intéressé par un plan de construction WooPlans."
          target="_blank"
          rel="noopener noreferrer"
          className="px-7 py-3 border-2 border-outline text-foreground text-sm font-bold hover:bg-outline hover:text-white transition-colors"
        >
          En parler sur WhatsApp
        </a>
      </div>
    </div>
  );
}
