import { getDefaultCostRate } from "@/lib/cost-rates";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export default async function AdminSettingsPage() {
  let rates = {
    villa: null as number | null,
    duplex: null as number | null,
  };

  try {
    const [villa, duplex] = await Promise.all([
      getDefaultCostRate("villa"),
      getDefaultCostRate("duplex"),
    ]);

    rates = {
      villa: villa?.amountPerSquareMeter ?? null,
      duplex: duplex?.amountPerSquareMeter ?? null,
    };
  } catch (error) {
    console.error("Failed to load admin settings:", error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground tracking-tight">Reglages</h1>
        <p className="text-sm text-foreground/50 mt-1">
          Configure les prix utilises pour generer les devis estimatifs.
        </p>
      </div>

      <SettingsForm initialRates={rates} />
    </div>
  );
}
