import type { Metadata } from "next";
import { PurchaseStatus } from "@/components/PurchaseStatus";

export const metadata: Metadata = { title: "Merci pour votre achat", robots: { index: false, follow: false } };

export default async function ThankYouPage({ searchParams }: { searchParams: Promise<{ i?: string }> }) {
  const { i } = await searchParams;
  return (
    <div className="container-page max-w-2xl py-14">
      <PurchaseStatus intentId={i} />
    </div>
  );
}
