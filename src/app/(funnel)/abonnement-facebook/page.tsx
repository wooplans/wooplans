import Image from "next/image";
import Link from "next/link";
import { listPlans } from "@/lib/db";
import { VideoTestimonials } from "@/components/VideoTestimonials";
import { FAQAccordion } from "@/components/FAQAccordion";

export const dynamic = "force-dynamic";

function formatPrice(value: number) {
  return value.toLocaleString("fr-FR").replace(/\u202f/g, " ");
}

const painPoints = [
  {
    stat: "30-50%",
    label: "de dépassement de budget",
    desc: "Faute d'un plan détaillé et d'un devis fiable avant de commencer, la plupart des constructions dérapent financièrement.",
  },
  {
    stat: "6-12 mois",
    label: "de retard moyen",
    desc: "Des changements en cours de chantier, des disputes sur les dimensions et des mauvaises surprises qui s'enchaînent.",
  },
  {
    stat: "80%",
    label: "des propriétaires stressés",
    desc: "Parce qu'ils ne savent pas où ils vont avant de signer le devis de l'entrepreneur. La peur de l'inconnu ronge le projet.",
  },
];

const features = [
  {
    title: "Plans de distribution HD",
    desc: "Visualisez le plan architectural complet avec cotations et dimensions précises de chaque pièce.",
    value: "25 000 FCFA",
  },
  {
    title: "Devis estimatifs complets",
    desc: "Budget prévisionnel ventilé par poste : fondation, gros œuvre, finitions, toiture, électricité, plomberie.",
    value: "20 000 FCFA",
  },
  {
    title: "Vues 3D détaillées",
    desc: "Explorez chaque plan sous tous les angles pour mieux projeter votre futur logement avant la première pierre.",
    value: "15 000 FCFA",
  },
  {
    title: "Architecte sur WhatsApp",
    desc: "Discutez directement avec nos architectes pour adapter le plan à votre terrain et vos besoins spécifiques.",
    value: "30 000 FCFA",
  },
  {
    title: "Catalogue 95+ modèles",
    desc: "Villas, duplex et maisons familiales conçus pour le contexte africain. Tous les nouveaux modèles inclus.",
    value: "50 000 FCFA",
  },
  {
    title: "Accès illimité 12 mois",
    desc: "Consultez sans restriction pendant 1 an. Revenez quand vous voulez, téléchargez, comparez.",
    value: "Inclus",
  },
];

const steps = [
  {
    number: "01",
    title: "Payez en 2 minutes",
    desc: "Mobile Money sécurisé. Pas de carte bancaire. Pas de complications.",
  },
  {
    number: "02",
    title: "Recevez votre code",
    desc: "Un code Premium à 4 chiffres vous est envoyé instantanément par SMS et email.",
  },
  {
    number: "03",
    title: "Accédez à tout",
    desc: "Connectez-vous et explorez immédiatement l'intégralité du catalogue avec tous les détails débloqués.",
  },
];

const faqs = [
  {
    question: "Que contient exactement l'abonnement Premium ?",
    answer:
      "Vous accédez à tous les plans de distribution détaillés avec cotations, aux devis estimatifs complets ventilés par poste de dépenses, aux vues 3D haute définition et à la possibilité d'échanger avec nos architectes sur WhatsApp pour personnaliser votre plan.",
  },
  {
    question: "Combien de temps dure l'accès ?",
    answer:
      "12 mois complets à compter de l'activation. Vous consultez tous les plans sans restriction, y compris les nouveaux modèles ajoutés pendant votre période.",
  },
  {
    question: "Dois-je payer tous les mois ?",
    answer:
      "Non. C'est un paiement unique de 19 900 FCFA. Zéro renouvellement automatique. Zéro surprise. Vous payez une fois et profitez pendant 1 an.",
  },
  {
    question: "Le devis estimatif est-il fiable ?",
    answer:
      "Nos devis sont basés sur des ratios professionnels et des tarifs au m² actualisés pour le marché africain. Ils constituent une estimation fiable à +/- 15% selon la qualité des matériaux et la localisation exacte.",
  },
  {
    question: "Et si je ne suis pas satisfait ?",
    answer:
      "Vous avez 7 jours pour tester l'intégralité du catalogue. Si vous n'êtes pas convaincu, contactez-nous par WhatsApp et nous vous remboursons intégralement, sans discussion.",
  },
  {
    question: "Comment je parle à un architecte ?",
    answer:
      "Dès que vous êtes Premium, un bouton WhatsApp apparaît sur chaque fiche plan. Un clic, et vous discutez directement avec notre équipe pour adapter le modèle à votre terrain.",
  },
];

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

type PlanPreview = {
  slug: string;
  name: string;
  category: string;
  thumbnail: string;
  surface: number;
  bedrooms: number;
  bathrooms: number;
  estimatedTotalPrice: number;
};

function PreviewCard({ plan }: { plan: PlanPreview }) {
  return (
    <div className="group relative bg-surface overflow-hidden border border-outline/10 rounded-2xl">
      {/* Badge Premium */}
      <div className="absolute top-3 right-3 z-10 bg-accent text-white text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full shadow-lg">
        Inclus Premium
      </div>

      <div className="aspect-[4/3] overflow-hidden bg-background relative">
        <Image
          src={plan.thumbnail}
          alt={plan.name}
          width={600}
          height={450}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          quality={55}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {/* Overlay subtil */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
      </div>

      <div className="p-5 border-t border-outline/10">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-semibold px-2 py-0.5 border border-primary/20 text-primary uppercase tracking-[0.15em]">
            {plan.category}
          </span>
        </div>
        <h3 className="font-semibold text-foreground text-base mb-2">
          {plan.name}
        </h3>
        <div className="flex items-center gap-3 text-sm text-foreground/60">
          <span>{plan.surface} m²</span>
          <span className="text-foreground/30">·</span>
          <span>{plan.bedrooms} ch.</span>
          <span className="text-foreground/30">·</span>
          <span>{plan.bathrooms} SdB</span>
        </div>
        {plan.estimatedTotalPrice > 0 && (
          <p className="mt-3 text-sm font-semibold text-foreground">
            Budget estimé:{" "}
            <span className="text-accent">
              {formatPrice(plan.estimatedTotalPrice)} FCFA
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

export default async function AbonnementFacebookPage() {
  const allPlans = await listPlans({ published: true });
  const previewPlans = allPlans.slice(0, 6);

  return (
    <>
      {/* ─── BANDEAU URGENCE ─── */}
      <div className="bg-accent text-white text-center px-4 py-2.5 text-sm font-semibold tracking-wide">
        <span className="inline-flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
          </svg>
          Offre de lancement limitée : -60% sur Premium — Seulement 19 900 FCFA au lieu de 50 000 FCFA
        </span>
      </div>

      {/* ─── HERO ─── */}
      <section className="relative bg-dark-bg text-dark-text overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative max-w-4xl mx-auto px-4 pt-12 pb-16 md:pt-20 md:pb-24 text-center">
          {/* Badge social proof */}
          <div className="mb-6">
            <span className="inline-flex items-center gap-2 text-xs font-black px-4 py-1.5 bg-highlight/20 text-highlight uppercase tracking-[0.15em] rounded-full border border-highlight/30">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Déjà utilisé par 200+ propriétaires en Afrique
            </span>
          </div>

          {/* Headline orientée douleur + promesse */}
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-semibold text-white leading-[1.1] mb-6 tracking-tight">
            Arrêtez de faire gonfler votre budget construction de{" "}
            <span className="text-highlight">30 à 50%</span> faute d&apos;un bon plan
          </h1>

          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed mb-8">
            Accédez à <strong className="text-white/90">{allPlans.length}+ plans de villas et duplex</strong> avec devis détaillés,
            cotations précises et un architecte disponible sur WhatsApp — pour le prix d&apos;un repas de famille.
          </p>

          {/* CTA Principal */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link
              href="#offre"
              className="w-full sm:w-auto px-10 py-5 bg-accent text-white font-bold text-lg rounded-full border-2 border-accent hover:bg-accent/90 transition-colors shadow-xl shadow-accent/30 text-center animate-pulse"
            >
              Oui, je veux économiser sur ma construction →
            </Link>
            <a
              href="https://wa.me/237694327885?text=Bonjour%2C%20j'ai%20vu%20l'offre%20Premium%20sur%20Facebook%20et%20j'aimerais%20en%20savoir%20plus."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-10 py-5 border-2 border-dark-text/30 text-dark-text font-semibold text-lg rounded-full hover:bg-dark-text hover:text-dark-bg transition-colors text-center"
            >
              Une question ? WhatsApp
            </a>
          </div>

          {/* Micro-preuves */}
          <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-white/50">
            <div className="flex items-center gap-2">
              <CheckIcon className="w-4 h-4 text-highlight" />
              Paiement unique
            </div>
            <div className="flex items-center gap-2">
              <CheckIcon className="w-4 h-4 text-highlight" />
              12 mois d&apos;accès
            </div>
            <div className="flex items-center gap-2">
              <CheckIcon className="w-4 h-4 text-highlight" />
              Garantie 7 jours
            </div>
            <div className="flex items-center gap-2">
              <CheckIcon className="w-4 h-4 text-highlight" />
              Mobile Money
            </div>
          </div>
        </div>
      </section>

      {/* ─── APERÇU DU CATALOGUE ─── */}
      <section className="bg-surface border-y border-outline/10">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-20">
          <div className="text-center mb-10">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-3 block">
              Un aperçu de ce qui vous attend
            </span>
            <h2 className="text-2xl md:text-4xl font-semibold text-foreground tracking-tight max-w-3xl mx-auto">
              Des plans concrets, avec budgets estimés, prêts à être utilisés
            </h2>
            <p className="text-foreground/60 mt-4 max-w-xl mx-auto">
              Voici quelques-uns des modèles que vous débloquez instantanément avec votre accès Premium.
              Chaque plan inclut la distribution détaillée, le devis par poste et la vue 3D.
            </p>
          </div>

          {previewPlans.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {previewPlans.map((plan) => (
                  <PreviewCard
                    key={plan.slug}
                    plan={{
                      slug: plan.slug,
                      name: plan.name,
                      category: plan.category,
                      thumbnail: plan.thumbnail,
                      surface: plan.surface,
                      bedrooms: plan.bedrooms,
                      bathrooms: plan.bathrooms,
                      estimatedTotalPrice: plan.estimatedTotalPrice,
                    }}
                  />
                ))}
              </div>

              <div className="mt-10 text-center">
                <p className="text-foreground/60 text-sm mb-4">
                  Et <strong className="text-foreground">{allPlans.length - previewPlans.length > 0 ? `${allPlans.length - previewPlans.length}` : "bien d'autres"}</strong> plans supplémentaires,
                  avec de nouveaux modèles ajoutés chaque mois — tous inclus dans votre abonnement.
                </p>
                <Link
                  href="#offre"
                  className="inline-flex items-center justify-center px-8 py-3 bg-accent text-white font-semibold rounded-full hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20"
                >
                  Débloquer tous les plans maintenant →
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-foreground/50">Le catalogue est en cours de mise à jour.</p>
            </div>
          )}
        </div>
      </section>

      {/* ─── LE PROBLÈME ─── */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-20">
        <div className="text-center mb-12">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-secondary mb-3 block">
            Le vrai problème
          </span>
          <h2 className="text-2xl md:text-4xl font-semibold text-foreground tracking-tight max-w-2xl mx-auto">
            Construire sans plan détaillé, c&apos;est signer un chèque en blanc…
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {painPoints.map((p, i) => (
            <div
              key={i}
              className="bg-surface border border-outline/10 rounded-2xl p-8 text-center"
            >
              <div className="text-4xl md:text-5xl font-bold text-accent mb-2">
                {p.stat}
              </div>
              <div className="text-sm font-bold text-foreground uppercase tracking-wide mb-3">
                {p.label}
              </div>
              <p className="text-sm text-foreground/60 leading-relaxed">
                {p.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-foreground/70 text-lg max-w-xl mx-auto">
            La bonne nouvelle ? Il existe une façon simple et abordable d&apos;éviter tout ça.
          </p>
        </div>
      </section>

      {/* ─── LA SOLUTION ─── */}
      <section className="bg-surface border-y border-outline/10">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-20">
          <div className="text-center mb-12">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-3 block">
              La solution
            </span>
            <h2 className="text-2xl md:text-4xl font-semibold text-foreground tracking-tight max-w-3xl mx-auto">
              WooPlans Premium : le plan de votre maison, le devis précis, et un architecte dans votre poche
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="bg-background border border-outline/10 rounded-2xl p-6 hover:border-primary/20 transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-primary/10 text-primary flex items-center justify-center rounded-full font-bold text-sm">
                    {i + 1}
                  </div>
                  <span className="text-xs font-bold text-secondary bg-secondary/10 px-2.5 py-1 rounded-full">
                    Valeur : {f.value}
                  </span>
                </div>
                <h3 className="font-semibold text-foreground text-base mb-2 tracking-tight">
                  {f.title}
                </h3>
                <p className="text-sm text-foreground/60 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── STACK DE VALEUR ─── */}
      <section className="bg-dark-bg py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-semibold text-dark-text mb-3 tracking-tight">
              Voici ce que vous recevez aujourd&apos;hui
            </h2>
            <p className="text-dark-text/60">
              La vraie valeur de ce que vous emportez — et ce que vous payez réellement.
            </p>
          </div>

          <div className="bg-surface border-2 border-highlight/30 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 md:p-8">
              <div className="space-y-4">
                {features.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-3 border-b border-outline/10 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <CheckIcon className="w-5 h-5 text-accent shrink-0" />
                      <span className="text-foreground/80 text-sm md:text-base">{f.title}</span>
                    </div>
                    <span className="text-foreground/40 text-sm font-medium shrink-0 ml-4">
                      {f.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t-2 border-dashed border-outline/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground/60 text-sm">Valeur totale réelle</span>
                  <span className="text-foreground/60 text-sm line-through font-medium">140 000+ FCFA</span>
                </div>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-foreground/60 text-sm">Prix normal WooPlans</span>
                  <span className="text-foreground/60 text-sm line-through font-medium">50 000 FCFA</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-accent font-bold text-lg">Votre investissement aujourd&apos;hui</span>
                  <span className="text-accent font-bold text-2xl md:text-3xl">19 900 FCFA</span>
                </div>
              </div>
            </div>

            <div className="bg-accent p-6 text-center">
              <Link
                href="#offre"
                className="inline-block w-full sm:w-auto px-10 py-4 bg-white text-accent font-bold text-lg rounded-full hover:bg-white/90 transition-colors shadow-lg"
              >
                Oui, je veux tout ça pour 19 900 FCFA →
              </Link>
              <p className="text-white/80 text-xs mt-3">
                Paiement unique · Pas d&apos;abonnement caché · Accès immédiat
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TÉMOIGNAGES VIDÉO ─── */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-20">
        <div className="text-center mb-10">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-3 block">
            Ils l&apos;ont fait avant vous
          </span>
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-3 tracking-tight">
            Des propriétaires comme vous ont déjà construit avec WooPlans
          </h2>
          <p className="text-foreground/60 max-w-xl mx-auto">
            Écoutez leurs témoignages. Aucun montage, juste des résultats réels.
          </p>
        </div>
        <VideoTestimonials />
      </section>

      {/* ─── COMMENT ÇA MARCHE ─── */}
      <section className="bg-surface border-y border-outline/10">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-3 tracking-tight">
              De votre paiement à votre plan en 3 étapes
            </h2>
            <p className="text-foreground/60 max-w-xl mx-auto">
              Pas de paperasse. Pas d&apos;attente. Votre accès est prêt en moins de 5 minutes.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <div
                key={i}
                className="text-center p-8 border border-outline/10 bg-background rounded-2xl"
              >
                <div className="w-14 h-14 bg-primary text-white text-lg font-bold flex items-center justify-center mx-auto mb-5 rounded-full">
                  {step.number}
                </div>
                <h3 className="font-semibold text-base text-foreground mb-2 tracking-tight">
                  {step.title}
                </h3>
                <p className="text-sm text-foreground/60 leading-relaxed max-w-xs mx-auto">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── OFFRE + CTA PRINCIPAL ─── */}
      <section id="offre" className="bg-dark-bg py-16 md:py-24">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <span className="inline-flex items-center gap-2 text-xs font-black px-4 py-1.5 bg-secondary text-white uppercase tracking-[0.2em] rounded-full mb-6">
            Offre de lancement
          </span>

          <h2 className="text-3xl md:text-5xl font-semibold text-white mb-4 tracking-tight">
            Ne laissez pas cette offre passer
          </h2>
          <p className="text-dark-text/60 text-lg max-w-lg mx-auto mb-10">
            Le prix de lancement à <strong className="text-white">19 900 FCFA</strong> ne durera pas éternellement.
            Dès qu&apos;on atteint notre prochain palier, le prix repasse à 50 000 FCFA.
          </p>

          {/* Carte de prix */}
          <div className="bg-surface border-2 border-accent rounded-2xl overflow-hidden shadow-2xl shadow-accent/20 text-left">
            <div className="p-8 text-center">
              <h3 className="text-xl font-semibold text-foreground mb-1 tracking-tight">
                Accès Premium WooPlans
              </h3>
              <p className="text-sm text-foreground/50 mb-6">
                12 mois complets · Tout inclus
              </p>

              <div className="flex items-baseline justify-center gap-2 mb-2">
                <span className="text-5xl md:text-6xl font-bold text-foreground">
                  19 900
                </span>
                <span className="text-xl font-bold text-foreground/60">
                  FCFA
                </span>
              </div>
              <div className="flex items-center justify-center gap-2 mb-6">
                <span className="text-base text-secondary line-through">
                  50 000 FCFA
                </span>
                <span className="text-xs font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">
                  Économisez 60%
                </span>
              </div>

              <div className="flex items-center justify-center gap-2 mb-8 text-sm text-primary bg-primary/5 border border-primary/20 rounded-full px-4 py-2 max-w-fit mx-auto">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Garantie satisfait ou remboursé sous 7 jours
              </div>

              <Link
                href="#offre"
                className="block w-full py-4 bg-accent text-white font-bold text-lg rounded-full border-2 border-accent hover:bg-accent/90 transition-colors shadow-lg shadow-accent/25 text-center"
              >
                Obtenir mon accès Premium maintenant →
              </Link>

              <p className="text-xs text-foreground/40 mt-4">
                Paiement sécurisé par Mobile Money · Code envoyé instantanément
              </p>
            </div>

            <div className="border-t border-outline/10 bg-background px-8 py-6">
              <ul className="space-y-3">
                {[
                  "Plans de distribution détaillés avec cotations",
                  "Devis estimatifs complets par poste",
                  "Vues 3D haute définition",
                  "Échanges architectes sur WhatsApp",
                  `Catalogue ${allPlans.length}+ plans (villas, duplex, familles)`,
                  "Nouveaux modèles ajoutés inclus",
                  "Accès illimité pendant 12 mois",
                  "Garantie satisfait ou remboursé 7 jours",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <CheckIcon className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                    <span className="text-foreground/70">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Second CTA sous la carte */}
          <div className="mt-8">
            <a
              href="https://wa.me/237694327885?text=Bonjour%2C%20j'ai%20vu%20l'offre%20Premium%20sur%20Facebook%20et%20j'aimerais%20en%20savoir%20plus."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 text-dark-text/60 hover:text-dark-text text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Préférez parler à quelqu&apos;un ? Écrivez-nous sur WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ─── GARANTIE ─── */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-surface border border-outline/10 rounded-2xl p-8 md:p-12 text-center">
          <div className="w-16 h-16 bg-highlight/20 text-highlight flex items-center justify-center mx-auto mb-6 rounded-full">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4 tracking-tight">
            Garantie satisfait ou remboursé : 7 jours
          </h2>
          <p className="text-foreground/60 max-w-xl mx-auto leading-relaxed mb-6">
            Testez WooPlans Premium pendant une semaine complète. Parcourez tous les plans, consultez les devis,
            parlez à nos architectes. Si vous n&apos;êtes pas convaincu à 100%, envoyez-nous un message sur WhatsApp
            et nous vous remboursons intégralement. Sans discussion. Sans justification.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-primary font-medium">
            <CheckIcon className="w-4 h-4" />
            Votre seul risque est de ne pas essayer.
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-3 block">
            Questions fréquentes
          </span>
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-3 tracking-tight">
            Tout ce que vous vous demandez avant de vous lancer
          </h2>
        </div>
        <FAQAccordion items={faqs} />
      </section>

      {/* ─── CTA FINAL ─── */}
      <section className="bg-dark-bg">
        <div className="max-w-3xl mx-auto px-4 py-16 md:py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4 tracking-tight">
            Votre projet mérite un vrai plan
          </h2>
          <p className="text-dark-text/60 text-lg max-w-lg mx-auto leading-relaxed mb-8">
            Chaque jour sans plan détaillé, c&apos;est un risque de dépassement de budget.
            Pour <strong className="text-white">19 900 FCFA</strong>, sécurisez votre construction dès aujourd&apos;hui.
          </p>

          <Link
            href="#offre"
            className="inline-block w-full sm:w-auto px-10 py-5 bg-accent text-white font-bold text-xl rounded-full border-2 border-accent hover:bg-accent/90 transition-colors shadow-xl shadow-accent/30"
          >
            Obtenir mon accès Premium maintenant →
          </Link>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-white/40">
            <span className="flex items-center gap-1.5">
              <CheckIcon className="w-3.5 h-3.5" />
              Paiement unique
            </span>
            <span className="flex items-center gap-1.5">
              <CheckIcon className="w-3.5 h-3.5" />
              Accès immédiat
            </span>
            <span className="flex items-center gap-1.5">
              <CheckIcon className="w-3.5 h-3.5" />
              Garantie 7 jours
            </span>
          </div>
        </div>
      </section>

      {/* ─── FOOTER MINIMAL ─── */}
      <footer className="bg-dark-bg border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center">
          <p className="text-white/30 text-sm mb-2">
            © {new Date().getFullYear()} WooPlans. Tous droits réservés.
          </p>
          <p className="text-white/20 text-xs">
            Plans de construction pour l&apos;Afrique. Architectes certifiés. Paiement sécurisé.
          </p>
        </div>
      </footer>
    </>
  );
}
