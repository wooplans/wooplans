export const metadata = {
  title: "WooPlans Premium — Économisez 30-50% sur votre construction",
  description:
    "Accédez à 95+ plans de villas et duplex avec devis détaillés, cotations précises et accompagnement architecte. Offre de lancement à 19 900 FCFA seulement.",
  openGraph: {
    title: "WooPlans Premium — Économisez 30-50% sur votre construction",
    description:
      "Accédez à 95+ plans de villas et duplex avec devis détaillés. Offre de lancement à 19 900 FCFA.",
    type: "website",
    locale: "fr_FR",
  },
};

export default function FunnelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="min-h-screen bg-background text-foreground antialiased">{children}</div>;
}
