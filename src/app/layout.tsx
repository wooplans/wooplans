import type { Metadata } from "next";
import Script from "next/script";
import { Suspense } from "react";
import { FacebookPixelEvents } from "@/components/FacebookPixelEvents";
import "./globals.css";

const FACEBOOK_PIXEL_ID = "1651374605332302";

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
        <Script
          id="facebook-pixel-global"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${FACEBOOK_PIXEL_ID}');
            `,
          }}
        />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            alt=""
            src={`https://www.facebook.com/tr?id=${FACEBOOK_PIXEL_ID}&ev=PageView&noscript=1`}
          />
        </noscript>
        <Suspense fallback={null}>
          <FacebookPixelEvents />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
