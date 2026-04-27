import type { Metadata } from "next";
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