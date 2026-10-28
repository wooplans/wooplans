import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import { ImageGuard } from "@/components/ImageGuard";
import { ScrollMemory } from "@/components/ScrollMemory";
import { Tracker } from "@/components/Tracker";
import { siteUrl } from "@/lib/env";
import { SITE } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: {
    type: "website",
    locale: SITE.locale,
    siteName: SITE.name,
    images: [{ url: "/images/hero-home.webp", width: 1600, height: 900, alt: "Villa moderne WOOPLANS" }],
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/favicon.png", apple: "/apple-touch-icon.png" },
};

// Montserrat (sous-ensemble latin, licence OFL) versionnée dans le dépôt : pas de feuille de style Google bloquante
// et pas de téléchargement au build (Google Fonts renvoie parfois des fichiers sans extension, ce qui cassait le build).
const montserrat = localFont({
  src: [
    { path: "./fonts/montserrat-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/montserrat-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/montserrat-latin-800-normal.woff2", weight: "800", style: "normal" },
  ],
  display: "swap",
  variable: "--font-heading",
});

export const viewport: Viewport = { themeColor: "#0F5B59", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // data-scroll-behavior : Next coupe le défilement doux (globals.css) pendant un changement de page,
    // sinon l'arrivée sur une fiche défilait visiblement du bas vers le haut.
    <html lang="fr" className={montserrat.variable} data-scroll-behavior="smooth">
      <body className="flex min-h-screen flex-col bg-background font-sans text-foreground antialiased">
        {children}
        <ImageGuard />
        <ScrollMemory />
        <Suspense fallback={null}>
          <Tracker />
        </Suspense>
      </body>
    </html>
  );
}
