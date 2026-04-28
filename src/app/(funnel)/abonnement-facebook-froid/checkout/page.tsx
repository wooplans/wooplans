import Link from "next/link";
import { CheckoutLeadForm } from "@/components/CheckoutLeadForm";

export default function AbonnementFacebookFroidCheckoutPage() {
  return (
    <main className="min-h-screen bg-[#172331] text-white">
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
            <div className="rounded-[2rem] bg-white p-4 shadow-2xl shadow-black/25 md:p-6">
              <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5 text-slate-950 md:p-7">
                <div className="mb-6 text-center">
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-4xl">
                    Remplissez le formulaire
                  </h1>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    29 000 FCFA pour accéder aux plans, devis estimatifs et vues 3D.
                  </p>
                </div>

                <CheckoutLeadForm
                  ctaId="facebook-froid-checkout-page"
                  buttonLabel="PROCEDER AU PAIEMENT"
                  helperText="Saisissez votre numéro sans indicatif pays."
                />
              </div>
            </div>
          </div>
        </section>
    </main>
  );
}
