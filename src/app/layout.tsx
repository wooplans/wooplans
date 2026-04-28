import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://wooplans.com"),
  title: "WooPlans â€” Plans de villas et duplex pour l'Afrique",
  description:
    "Catalogue de plans de construction de villas et duplex conÃ§us pour le contexte africain. Trouvez le plan idÃ©al pour votre projet.",
  openGraph: {
    title: "WooPlans â€” Plans de villas et duplex pour l'Afrique",
    description:
      "Catalogue de plans de construction de villas et duplex conÃ§us pour le contexte africain.",
    type: "website",
    locale: "fr_FR",
    images: [
      {
        url: "/images/hero-home.webp",
        width: 1600,
        height: 900,
        alt: "Hero WooPlans avec maquette architecturale et plans",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WooPlans â€” Plans de villas et duplex pour l'Afrique",
    description:
      "Catalogue de plans de construction de villas et duplex conÃ§us pour le contexte africain.",
    images: ["/images/hero-home.webp"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('wooplans-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="bg-background text-foreground min-h-screen flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}