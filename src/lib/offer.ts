// Single commercial configuration shared by the public site.
export const CATALOGUE = {
  price: 39000,
  currency: "FCFA",
  salesPath: "/abonnement",
  access: "à vie",
} as const;
export const cataloguePrice = `${CATALOGUE.price.toLocaleString("fr-FR")} ${CATALOGUE.currency}`;
