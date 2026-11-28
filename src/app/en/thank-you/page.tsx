import type { Metadata } from "next";
import { PurchaseStatusEn } from "@/components/premium-en/PurchaseStatusEn";
import catalogueEn from "@/config/catalogue-en.json";

export const metadata: Metadata = { title: "Thank you for your purchase", robots: { index: false, follow: false } };

export default async function ThankYouEnPage({ searchParams }: { searchParams: Promise<{ i?: string }> }) {
  const { i } = await searchParams;
  return (
    <div lang="en" className="container-page max-w-2xl py-14">
      <PurchaseStatusEn intentId={i} pixelId={process.env.FB_PIXEL_ID || undefined} value={catalogueEn.priceXaf} />
    </div>
  );
}
