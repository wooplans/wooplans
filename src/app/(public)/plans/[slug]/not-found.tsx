import Link from "next/link";

export default function PlanNotFound() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-20 text-center">
      <h1 className="text-4xl font-black text-foreground mb-4 tracking-tight">
        Plan introuvable
      </h1>
      <p className="text-foreground/60 mb-8">
        Le plan que vous recherchez n&apos;existe pas ou n&apos;est plus disponible.
      </p>
      <Link
        href="/plans"
        className="inline-block px-6 py-3 bg-primary text-white border-2 border-primary font-bold hover:bg-transparent hover:text-primary transition-colors"
      >
        Retour au catalogue
      </Link>
    </div>
  );
}
