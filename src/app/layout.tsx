import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
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

export const viewport: Viewport = { themeColor: "#0F5B59", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="flex min-h-screen flex-col bg-background font-sans text-foreground antialiased">
        {children}
        <Suspense fallback={null}>
          <Tracker />
        </Suspense>
      </body>
    </html>
  );
}
