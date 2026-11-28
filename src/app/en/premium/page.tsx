import Link from "next/link";
import { requireMemberEn } from "@/lib/auth";
import { listPremiumPlans } from "@/lib/plans";
import { factsEn, modelNameEn } from "@/lib/sales-page-en";

type Props = { searchParams: Promise<{ type?: string; beds?: string }> };

const TYPES = [
  { key: "", label: "All" },
  { key: "bungalow", label: "Bungalows" },
  { key: "two-story", label: "Two-story houses" },
];

export default async function PremiumEnIndexPage({ searchParams }: Props) {
  const member = await requireMemberEn();
  const { type = "", beds = "" } = await searchParams;
  const all = (await listPremiumPlans()).filter((p) => p.category === "villa" || p.category === "duplex");
  const plans = all.filter(
    (p) => (!type || (type === "bungalow" ? p.levels <= 1 : p.levels >= 2)) && (!beds || (beds === "5" ? p.bedrooms >= 5 : String(p.bedrooms) === beds)),
  );
  const href = (t: string, b: string) => `/en/premium${t || b ? `?${new URLSearchParams({ ...(t ? { type: t } : {}), ...(b ? { beds: b } : {}) })}` : ""}`;
  const chip = (on: boolean) => `rounded-full border px-3 py-1.5 text-sm font-semibold ${on ? "border-primary bg-primary text-white" : "border-outline"}`;

  return (
    <div className="container-page pb-8 pt-5 md:pt-8">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
        Hello{member.name ? ` ${member.name.split(" ")[0]}` : ""}, choose your future home
      </h1>
      <p className="mt-2 text-sm text-foreground/70 md:text-base">
        {all.length} house plans with 3D renders, floor plans and a construction cost calculator. New designs are added for free.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {TYPES.map((t) => <Link key={t.key} href={href(t.key, beds)} className={chip(type === t.key)}>{t.label}</Link>)}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {["", "3", "4", "5"].map((b) => (
          <Link key={b} href={href(type, b)} className={chip(beds === b)}>{b ? `${b}${b === "5" ? "+" : ""} bedrooms` : "Any size"}</Link>
        ))}
      </div>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => (
          <Link key={p.id} href={`/en/premium/plans/${p.slug}`} className="card group flex flex-col overflow-hidden">
            <div className="aspect-video bg-outline/40">
              {p.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.coverImage} alt={`3D render: ${modelNameEn(p)}`} loading="lazy" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="p-4">
              <h2 className="font-semibold">{modelNameEn(p)}</h2>
              <p className="mt-2 text-sm text-muted">{factsEn(p).join(" · ")}</p>
            </div>
          </Link>
        ))}
      </div>
      {plans.length === 0 ? <p className="mt-8 text-muted">No house plan matches these filters.</p> : null}
    </div>
  );
}
