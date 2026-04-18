import Link from "next/link";

type PlanCardProps = {
  slug: string;
  name: string;
  category: string;
  thumbnail: string;
  surface: number;
  bedrooms: number;
  bathrooms: number;
};

export function PlanCard({
  slug,
  name,
  category,
  thumbnail,
  surface,
  bedrooms,
  bathrooms,
}: PlanCardProps) {
  return (
    <Link href={`/plans/${slug}`} className="group block">
      <div className="bg-surface overflow-hidden border border-outline/10 rounded-2xl transition-all duration-200 hover:shadow-sm hover:-translate-y-1">
        <div className="aspect-[4/3] overflow-hidden bg-background">
          <img
            src={thumbnail}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
        <div className="p-5 border-t border-outline/10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-semibold px-2 py-0.5 border border-primary/20 text-primary uppercase tracking-[0.15em]">
              {category}
            </span>
          </div>
          <h3 className="font-semibold text-foreground text-base mb-2 transition-colors">
            {name}
          </h3>
          <div className="flex items-center gap-3 text-sm text-foreground/60 transition-colors">
            <span>{surface} m²</span>
            <span className="text-foreground/30">·</span>
            <span>{bedrooms} ch.</span>
            <span className="text-foreground/30">·</span>
            <span>{bathrooms} SdB</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
