import type { Metadata } from "next";
import Link from "next/link";
import {
  CUSTOMIZATION_EXAMPLES,
  CUSTOMIZATION_STEPS,
  DELIVERABLE_GROUPS,
  DELIVERABLES,
  TECHNICIAN_POINTS,
  type DeliverableIcon,
} from "@/lib/deliverables";
import { whatsappLink } from "@/lib/site";

const TITLE = "Ce que contiennent vos plans complets";
const DESCRIPTION =
  "Le dossier à remettre à votre technicien pour construire : le détail des 10 plans livrés pour votre villa ou votre duplex : fondations, distribution, façades, coupes, toiture et fosses septiques. Chaque modèle peut être personnalisé selon vos exigences.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/livrables-plans-complets" },
  openGraph: {
    title: `${TITLE} | WOOPLANS`,
    description: DESCRIPTION,
    images: [{ url: "/images/livrables-plans-complets.png", width: 1080, height: 1350, alt: "Les 10 plans livrés dans le dossier complet WOOPLANS" }],
  },
};

const ICON_PATHS: Record<DeliverableIcon, React.ReactNode> = {
  foundation: (
    <>
      <path d="M3 20h18M5 20v-4h14v4M8 16v-4h8v4M11 12V8h2v4" />
    </>
  ),
  layout: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="1" />
      <path d="M3 12h9M12 3v9M12 17h9M16 12v9" />
    </>
  ),
  facade: (
    <>
      <path d="M3 21V9l9-6 9 6v12M3 21h18" />
      <rect x="9" y="13" width="6" height="8" />
    </>
  ),
  section: (
    <>
      <path d="M3 21h18M5 21V8h14v13M5 14h14" />
      <path d="M2 4l3 2M22 4l-3 2" />
    </>
  ),
  roof: <path d="M2 14L12 4l10 10M5 12v8h14v-8" />,
  septic: (
    <>
      <rect x="3" y="8" width="18" height="11" rx="2" />
      <path d="M3 8l2-3h14l2 3M9 13h6" />
    </>
  ),
};

function Icon({ name, className = "h-6 w-6" }: { name: DeliverableIcon; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICON_PATHS[name]}
    </svg>
  );
}

export default function DeliverablesPage() {
  const ask = whatsappLink("Bonjour WOOPLANS, j'aimerais commander des plans complets et personnaliser un modèle.");
  const custom = whatsappLink("Bonjour WOOPLANS, je voudrais modifier un modèle selon mes exigences. Voici ce que je souhaite :");
  let n = 0;

  return (
    <>
      <section className="bg-primary text-white">
        <div className="container-page py-12 md:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-highlight">Plans complets WOOPLANS</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-extrabold tracking-tight md:text-5xl">Ce que contient votre dossier de plans complets</h1>
          <p className="mt-4 max-w-2xl text-base text-white/85 md:text-lg">
            Le document que vous remettez à votre technicien : il n&apos;a qu&apos;à le suivre pour construire votre maison. Il couvre
            l&apos;implantation, l&apos;organisation, les façades, les coupes, la toiture, les fondations et le principe d&apos;assainissement.
          </p>
          <dl className="mt-8 grid max-w-2xl grid-cols-3 gap-3">
            {[
              [String(DELIVERABLES.length), "plans livrés"],
              ["4", "façades"],
              ["2", "coupes"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl bg-white/10 px-4 py-3">
                <dt className="sr-only">{label}</dt>
                <dd className="text-3xl font-extrabold text-highlight">{value}</dd>
                <p className="text-sm text-white/80">{label}</p>
              </div>
            ))}
          </dl>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={ask} target="_blank" rel="noopener noreferrer" data-whatsapp="livrables_hero" className="btn-cta">
              Commander mes plans sur WhatsApp
            </a>
            <Link href="/plans-personnalises" data-cta="livrables_tarifs" className="btn border border-white/40 text-white hover:bg-white/10">
              Voir les tarifs
            </Link>
          </div>
        </div>
      </section>

      <div className="container-page py-12">
        <p className="eyebrow">Les livrables</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Les 10 plans de votre dossier</h2>
        <p className="mt-3 max-w-2xl text-foreground/75">
          Ces plans sont livrés pour chacun de vos projets : si vous faites réaliser une villa et un duplex, vous recevez le dossier complet pour
          chacun des deux.
        </p>

        <div className="mt-8 space-y-8">
          {DELIVERABLE_GROUPS.map((group) => (
            <section key={group.id} aria-labelledby={`g-${group.id}`}>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
                  <Icon name={group.icon} />
                </span>
                <h3 id={`g-${group.id}`} className="text-lg font-bold text-primary">
                  {group.title}
                </h3>
              </div>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {group.items.map((item) => {
                  n += 1;
                  return (
                    <li key={item.title} className="card flex gap-4 p-4">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent font-heading text-sm font-bold text-white">{n}</span>
                      <div>
                        <p className="font-semibold">{item.title}</p>
                        <p className="mt-1 text-sm text-foreground/70">{item.description}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>

      <section className="container-page pb-12">
        <div className="card flex flex-col gap-6 border-primary/30 p-6 md:flex-row md:items-center md:p-8">
          <div className="md:w-2/5">
            <p className="eyebrow">Pour construire</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">Un dossier prêt à remettre à votre technicien</h2>
          </div>
          <ul className="space-y-2.5 text-sm md:w-3/5">
            {TECHNICIAN_POINTS.map((t) => (
              <li key={t} className="flex gap-2.5">
                <span className="text-primary" aria-hidden>✓</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-primary/5">
        <div className="container-page py-12">
          <p className="eyebrow">Sur mesure</p>
          <h2 className="mt-2 max-w-3xl text-2xl font-bold tracking-tight md:text-3xl">Les plans sont personnalisables : vous donnez vos exigences, nous modifions le modèle</h2>
          <p className="mt-3 max-w-2xl text-foreground/75">
            Le modèle que vous choisissez n&apos;est pas figé. Dites-nous ce que vous voulez changer : nous l&apos;adaptons à votre convenance avant de
            vous livrer le dossier.
          </p>

          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <div className="card p-6">
              <h3 className="font-semibold">Par exemple, vous pouvez demander à…</h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                {CUSTOMIZATION_EXAMPLES.map((e) => (
                  <li key={e} className="flex gap-2.5">
                    <span className="text-primary" aria-hidden>✓</span>
                    {e}
                  </li>
                ))}
              </ul>
            </div>
            <ol className="space-y-3">
              {CUSTOMIZATION_STEPS.map((s, i) => (
                <li key={s.title} className="card flex gap-4 p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-sm font-bold text-white">{i + 1}</span>
                  <div>
                    <p className="font-semibold">{s.title}</p>
                    <p className="mt-0.5 text-sm text-foreground/70">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="container-page py-12">
        <div className="rounded-3xl bg-primary px-6 py-10 text-center text-white md:px-12">
          <h2 className="text-2xl font-bold md:text-3xl">Parlons de votre projet</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">
            Envoyez-nous vos exigences sur WhatsApp : nous vous répondons avec la marche à suivre pour adapter le modèle de votre choix.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a href={custom} target="_blank" rel="noopener noreferrer" data-whatsapp="livrables_footer" className="btn-cta">
              Écrire sur WhatsApp
            </a>
            <Link href="/catalogue" data-cta="livrables_catalogue" className="btn border border-white/40 text-white hover:bg-white/10">
              Parcourir les modèles
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
