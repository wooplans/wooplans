import Link from "next/link";
export function PlanPersonalizationCTA({ isPremium }: { isPremium: boolean }) {
  return (
    <div className="rounded-2xl border border-outline/10 bg-surface p-6">
      <h3 className="text-lg font-semibold">
        Après votre choix, adaptez le modèle à votre projet
      </h3>
      <p className="my-3 text-sm text-foreground/70">
        Les plans complets personnalisés sont une prestation distincte. Le
        terrain, les modifications et les documents à produire déterminent le
        devis.
      </p>
      <Link
        href={isPremium ? "/premium" : "/plans-personnalises"}
        className="font-semibold text-primary"
      >
        {isPremium ? "Préparer ma demande" : "Comprendre la prestation"} →
      </Link>
    </div>
  );
}
