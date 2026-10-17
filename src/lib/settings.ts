import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { normalizeCostSettings } from "@/lib/plan-pricing";

export type CustomPlanOffer = {
  title: string;
  priceFrom: number;
  priceLabel: string;
  description: string;
  deliverables: string[];
};

export type CustomPlanPricing = { offers: CustomPlanOffer[]; notes: string[] };

export const DEFAULT_CUSTOM_PLAN_PRICING: CustomPlanPricing = {
  offers: [
    {
      title: "Villa (plain-pied)",
      priceFrom: 150000,
      priceLabel: "à partir de",
      description: "Adaptation d'un modèle du catalogue à votre terrain et à vos besoins.",
      deliverables: ["Plans architecturaux cotés", "Façades et coupes", "Plan de masse sur votre terrain", "Plans de fondation"],
    },
    {
      title: "Duplex (R+1)",
      priceFrom: 250000,
      priceLabel: "à partir de",
      description: "Adaptation d'un duplex du catalogue, niveaux et escalier compris.",
      deliverables: ["Plans architecturaux de chaque niveau", "Façades et coupes", "Plan de masse", "Plans de fondation et de dalle"],
    },
  ],
  notes: [
    "Le prix du Catalogue Premium (39 000 FCFA) est déduit des honoraires.",
    "Les honoraires couvrent les plans ; ils sont distincts du budget de construction de la maison.",
    "Devis précis après étude de votre terrain et de vos demandes de modification.",
  ],
};

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const row = await getDb().query.settings.findFirst({ where: eq(schema.settings.key, key) });
    return (row?.value as T) ?? fallback;
  } catch {
    return fallback;
  }
}

export async function setSetting(key: string, value: unknown) {
  await getDb()
    .insert(schema.settings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } });
}

export const getCustomPlanPricing = () => getSetting("custom_plan_pricing", DEFAULT_CUSTOM_PLAN_PRICING);

export const getCostSettings = async () => normalizeCostSettings(await getSetting<unknown>("cost_settings", null));
