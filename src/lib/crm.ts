export const PROJECT_STAGES = {
  received: "Demande reçue",
  qualified: "Projet qualifié",
  quoted: "Devis envoyé",
  confirmed: "Commande confirmée",
  production: "Production",
  delivered: "Livré",
  lost: "Sans suite",
} as const;
export type ProjectStage = keyof typeof PROJECT_STAGES;
export function parseFinancials(data: Record<string, unknown>) {
  const keys = ["grossPrice", "catalogueCredit", "paidAmount"] as const;
  const values = Object.fromEntries(
    keys.map((key) => [key, Number(data[key] ?? 0)]),
  ) as Record<(typeof keys)[number], number>;
  if (
    Object.values(values).some((v) => !Number.isSafeInteger(v) || v < 0) ||
    values.catalogueCredit > values.grossPrice ||
    values.paidAmount > values.grossPrice - values.catalogueCredit
  )
    throw new Error("Montants incohérents");
  return values;
}
