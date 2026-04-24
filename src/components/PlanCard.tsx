import Image from "next/image";
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
      <div className="overflow-hidden rounded-[2rem] border border-outline/10 bg-surface shadow-[0_20px_70px_rgba(38,33,29,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_80px_rgba(38,33,29,0.12)]">
        <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
          <Image
            src={thumbnail}
            alt={name}
            width={800}
            height={600}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            quality={55}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-secondary/55 via-transparent to-transparent opacity-80" />
          <span className="absolute left-4 top-4 rounded-full bg-surface/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary backdrop-blur">
            {category}
          </span>
        </div>
        <div className="p-5">
          <h3 className="font-display text-2xl text-foreground transition-colors">
            {name}
          </h3>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-muted">
            <span className="rounded-full bg-background px-2 py-2 font-bold">{surface} m²</span>
            <span className="rounded-full bg-background px-2 py-2 font-bold">{bedrooms} ch.</span>
            <span className="rounded-full bg-background px-2 py-2 font-bold">{bathrooms} SdB</span>
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-outline/10 pt-4 text-sm">
            <span className="font-semibold text-muted">Voir le modèle</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white transition-colors group-hover:bg-primary-dark">
              →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
