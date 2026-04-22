import Image from "next/image";
import Link from "next/link";

type SimilarPlansProps = {
  plans: {
    slug: string;
    name: string;
    category: string;
    thumbnail: string;
    surface: number;
    bedrooms: number;
    bathrooms: number;
  }[];
  currentSlug: string;
};

export function SimilarPlans({ plans, currentSlug }: SimilarPlansProps) {
  const filtered = plans.filter((p) => p.slug !== currentSlug).slice(0, 3);

  if (filtered.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-foreground tracking-tight">Plans similaires</h2>
          <p className="text-sm text-foreground/50 mt-1">
            Découvrez d&apos;autres modèles qui pourraient vous intéresser
          </p>
        </div>
        <Link
          href="/plans"
          className="text-sm font-bold text-primary border-2 border-primary px-4 py-1.5 hover:bg-primary hover:text-white transition-colors"
        >
          Tout voir →
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border-2 border-outline">
        {filtered.map((plan, i) => (
          <Link key={plan.slug} href={`/plans/${plan.slug}`} className={`group block ${i > 0 ? "border-l-2 border-outline" : ""}`}>
            <div className="bg-white overflow-hidden transition-all duration-200 group-hover:bg-outline">
              <div className="aspect-[4/3] overflow-hidden bg-surface border-b-2 border-outline">
                <Image
                  src={plan.thumbnail}
                  alt={plan.name}
                  width={800}
                  height={600}
                  unoptimized
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4">
                <span className="text-xs font-bold px-2 py-0.5 border border-outline uppercase tracking-wide group-hover:border-white group-hover:text-white transition-colors">
                  {plan.category}
                </span>
                <h3 className="font-bold text-foreground text-sm mt-2 group-hover:text-white transition-colors">
                  {plan.name}
                </h3>
                <div className="flex items-center gap-3 text-xs text-foreground/60 mt-1 group-hover:text-white/60 transition-colors">
                  <span>{plan.surface} m²</span>
                  <span>·</span>
                  <span>{plan.bedrooms} ch.</span>
                  <span>·</span>
                  <span>{plan.bathrooms} SdB</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
