import Link from "next/link";
import { notFound } from "next/navigation";
import { PlanGallery } from "@/components/PlanGallery";
import { PlanSpecs } from "@/components/PlanSpecs";
import { FavoriteButton } from "@/components/premium/FavoriteButton";
import { requireMember } from "@/lib/auth";
import { CATEGORY_LABELS, formatFcfa, getPremiumPlan } from "@/lib/plans";
import { getFavoriteIds, privateFileUrl } from "@/lib/premium";
import { whatsappLink } from "@/lib/site";

export default async function PremiumPlanPage({ params }: { params: Promise<{ slug: string }> }) {
  const member = await requireMember();
  const plan = await getPremiumPlan((await params).slug);
  if (!plan) notFound();
  const favorites = await getFavoriteIds(member.id);
  const images = [plan.coverImage, ...plan.renders.filter((r) => r !== plan.coverImage)].filter(Boolean);
  const lotsTotal = plan.estimateLots.reduce((sum, lot) => sum + lot.amount, 0);
  const estimate = plan.estimateTotal || lotsTotal || null;
  const roomsByLevel = plan.rooms.reduce<Record<string, typeof plan.rooms>>((acc, room) => {
    const level = room.level || (plan.levels > 1 ? "Rez-de-chaussée" : "Plain-pied");
    (acc[level] ||= []).push(room);
    return acc;
  }, {});
  const orderMessage = `Bonjour WooPlans, je suis membre Premium (${member.email}) et je souhaite commander les plans complets du modèle ${plan.code} (${plan.name}).`;

  return (
    <div className="container-page py-8">
      <Link href="/espace-premium" className="text-sm text-muted hover:text-primary">← Tous les modèles</Link>
      <div className="mt-4 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <PlanGallery images={images} alt={plan.name} />
        <div>
          <p className="eyebrow">{CATEGORY_LABELS[plan.category]} · Réf. {plan.code}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{plan.name}</h1>
          {plan.summary ? <p className="mt-2 text-foreground/75">{plan.summary}</p> : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <FavoriteButton planId={plan.id} initial={favorites.has(plan.id)} />
            <Link href={`/espace-premium/comparer?m=${plan.slug}`} className="btn-ghost">Comparer</Link>
          </div>
          <div className="mt-6 rounded-2xl bg-primary p-5 text-white">
            <p className="text-sm text-white/70">Devis estimatif de construction</p>
            <p className="mt-1 text-3xl font-bold">{formatFcfa(estimate)}</p>
            <p className="mt-1 text-xs text-white/60">Hors terrain, honoraires et raccordements. Détail par lot ci-dessous.</p>
          </div>
          <div className="mt-5">
            <PlanSpecs plan={plan} />
          </div>
        </div>
      </div>

      {plan.floorPlans.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-xl font-semibold">Distributions cotées</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {plan.floorPlans.map((key, i) => (
              <a key={key} href={privateFileUrl(key)} target="_blank" rel="noopener noreferrer" className="card block overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={privateFileUrl(key)} alt={`${plan.name} — distribution ${i + 1}`} loading="lazy" className="w-full bg-white object-contain" />
                <p className="border-t border-outline px-4 py-2 text-sm text-muted">Toucher pour agrandir</p>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        {plan.rooms.length > 0 ? (
          <section>
            <h2 className="text-xl font-semibold">Pièces et surfaces</h2>
            {Object.entries(roomsByLevel).map(([level, rooms]) => (
              <div key={level} className="card mt-4 overflow-hidden">
                <p className="bg-background px-4 py-2 text-sm font-semibold">{level}</p>
                <table className="w-full text-sm">
                  <tbody>
                    {rooms.map((room, i) => (
                      <tr key={`${room.name}-${i}`} className="border-t border-outline">
                        <td className="px-4 py-2">{room.name}</td>
                        <td className="px-4 py-2 text-right font-medium">{room.area} m²</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </section>
        ) : null}

        {plan.estimateLots.length > 0 ? (
          <section>
            <h2 className="text-xl font-semibold">Devis estimatif détaillé</h2>
            <div className="card mt-4 overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {plan.estimateLots.map((lot) => (
                    <tr key={lot.label} className="border-t border-outline first:border-t-0">
                      <td className="px-4 py-2">{lot.label}</td>
                      <td className="px-4 py-2 text-right font-medium">{formatFcfa(lot.amount)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-primary bg-primary/5">
                    <td className="px-4 py-3 font-semibold">Total</td>
                    <td className="px-4 py-3 text-right font-bold text-primary">{formatFcfa(lotsTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {plan.costAssumptions ? (
              <div className="mt-4 rounded-xl bg-background p-4 text-sm text-foreground/75">
                <p className="font-semibold text-foreground">Hypothèses de coût</p>
                <p className="mt-1 whitespace-pre-line">{plan.costAssumptions}</p>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>

      {plan.strengths.length > 0 || plan.watchouts.length > 0 ? (
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {plan.strengths.length > 0 ? (
            <section className="card p-6">
              <h2 className="text-lg font-semibold text-primary">Atouts</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {plan.strengths.map((s) => <li key={s} className="flex gap-2"><span className="text-primary">✓</span>{s}</li>)}
              </ul>
            </section>
          ) : null}
          {plan.watchouts.length > 0 ? (
            <section className="card p-6">
              <h2 className="text-lg font-semibold text-secondary">Points d&apos;attention</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {plan.watchouts.map((s) => <li key={s} className="flex gap-2"><span className="text-secondary">!</span>{s}</li>)}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}

      {plan.premiumNotes ? (
        <section className="mt-8 max-w-3xl">
          <h2 className="text-lg font-semibold">Notes de l&apos;architecte</h2>
          <p className="mt-2 whitespace-pre-line text-foreground/80">{plan.premiumNotes}</p>
        </section>
      ) : null}

      <section className="mt-12 rounded-2xl bg-[#0B2E2D] p-6 text-white md:p-8">
        <h2 className="text-xl font-semibold">Ce modèle est le bon ?</h2>
        <p className="mt-2 max-w-2xl text-white/75">
          Nos architectes l&apos;adaptent à votre terrain et réalisent vos plans complets. En tant que membre, le prix du catalogue est déduit de la commande.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <a href={whatsappLink(orderMessage)} target="_blank" rel="noopener noreferrer" data-whatsapp={`premium_order_${plan.slug}`} className="btn bg-[#25D366] text-white hover:bg-[#1eb457]">
            Commander sur WhatsApp
          </a>
          <Link href={`/plans-personnalises?modele=${plan.code}`} className="btn border border-white/30 text-white hover:bg-white/10">
            Voir les honoraires
          </Link>
        </div>
      </section>
    </div>
  );
}
