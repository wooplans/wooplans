import type { Metadata } from "next";
import type { PlanFilters } from "@/lib/plan-filters";
import { CatalogueView, catalogueMetadata } from "./view";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<PlanFilters> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return catalogueMetadata(await searchParams);
}

export default async function CataloguePage({ searchParams }: Props) {
  return <CatalogueView filters={await searchParams} />;
}
