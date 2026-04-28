import Link from "next/link";
import Script from "next/script";
import { CheckoutLeadForm } from "@/components/CheckoutLeadForm";

const FACEBOOK_PIXEL_ID = "1651374605332302";

export default function AbonnementFacebookFroidCheckoutPage() {
  return (
    <>
      <Script
        id="facebook-pixel-checkout"
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
            fbq('track', 'PageView');
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

      <main className="min-h-screen bg-dark-bg text-dark-text">
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "32px 32px",
            }}
          />

          <div className="relative mx-auto max-w-3xl px-4 py-6 md:py-8">
            <Link
              href="/abonnement-facebook-froid"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <span aria-hidden="true">←</span>
              Retour au catalogue
            </Link>
          </div>

          <div className="relative mx-auto max-w-3xl px-4 pb-16 pt-4 md:py-10">
            <div className="rounded-[2rem] border border-white/10 bg-surface p-4 shadow-2xl shadow-black/20 md:p-6">
              <div className="rounded-[1.6rem] border border-outline/10 bg-background p-5 md:p-7">
                <div className="mb-6 text-center">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-primary">
                    Formulaire de paiement
                  </p>
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-4xl">
                    Remplissez le formulaire
                  </h1>
                  <p className="mt-3 text-sm leading-relaxed text-foreground/60">
                    29 000 FCFA pour accéder aux plans, devis estimatifs et vues 3D.
                  </p>
                </div>

                <CheckoutLeadForm
                  ctaId="facebook-froid-checkout-page"
                  buttonLabel="PROCEDER AU PAIEMENT"
                  helperText="Saisissez votre numéro sans indicatif pays. Vous serez redirigé vers le paiement sécurisé après validation du formulaire."
                />
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
