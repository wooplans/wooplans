import type { Metadata } from "next";
import Script from "next/script";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "WooPlans — Plans de villas et duplex pour l'Afrique",
  description:
    "Catalogue de plans de construction de villas et duplex conçus pour le contexte africain. Trouvez le plan idéal pour votre projet.",
  openGraph: {
    title: "WooPlans — Plans de villas et duplex pour l'Afrique",
    description:
      "Catalogue de plans de construction de villas et duplex conçus pour le contexte africain.",
    type: "website",
    locale: "fr_FR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <Script
          src="https://js.chariowcdn.com/v1/widget.min.js"
          strategy="afterInteractive"
        />
        <link rel="stylesheet" href="https://js.chariowcdn.com/v1/widget.min.css" />
      </head>
      <body className="bg-background text-foreground min-h-screen flex flex-col antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
