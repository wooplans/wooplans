import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { UtmLinkBuilder } from "@/components/admin/UtmLinkBuilder";
import { WhatsAppGroupLinks } from "@/components/admin/WhatsAppGroupLinks";
import { PageTitle } from "@/components/admin/ui";
import { whatsappGroupLink } from "@/lib/attribution";
import { siteUrl } from "@/lib/env";

const EXAMPLES = [
  ["Facebook, publication gratuite", "?utm_source=facebook&utm_medium=social&utm_campaign=…", "social"],
  ["Facebook / Instagram, publicité", "?utm_source=facebook&utm_medium=paid_social&utm_campaign=…", "social_ads"],
  ["TikTok, vidéo", "?utm_source=tiktok&utm_medium=social&utm_campaign=…", "social"],
  ["YouTube, description ou commentaire", "?utm_source=youtube&utm_medium=social&utm_campaign=…", "social"],
];

export default async function LinksPage() {
  const plans = await getDb().query.plans.findMany({
    where: eq(schema.plans.status, "published"),
    columns: { slug: true, code: true, name: true },
    orderBy: asc(schema.plans.code),
  });
  return (
    <>
      <PageTitle
        title="Liens de suivi (UTM)"
        subtitle="Un lien par plateforme et par campagne : le tableau de bord sait alors d'où viennent vos visiteurs et vos ventes."
      />
      <section className="mb-6">
        <h2 className="mb-1 font-semibold">Partages dans les groupes WhatsApp</h2>
        <p className="mb-3 text-sm text-muted">
          Partagez ces liens plutôt que l&apos;adresse copiée depuis le site : sans eux, les visiteurs venus de WhatsApp sont comptés en « Direct ».
        </p>
        <WhatsAppGroupLinks links={plans.map((p) => ({ code: p.code, name: p.name, url: whatsappGroupLink(siteUrl(), p) }))} />
      </section>
      <UtmLinkBuilder siteUrl={siteUrl()} plans={plans} />
      <section className="card mt-6 p-5 text-sm">
        <h2 className="font-semibold">Pourquoi un lien spécial ?</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-foreground/80">
          <li>TikTok et YouTube ouvrent les liens dans leur propre navigateur, qui cache souvent la provenance : sans UTM, ces visiteurs apparaissent en « Direct ».</li>
          <li>Facebook marque tous les liens de la même façon, publication gratuite ou publicité : seul l&apos;UTM permet de distinguer les deux.</li>
          <li>Utilisez le même nom de campagne sur une même opération pour comparer vos campagnes dans le tableau de bord.</li>
          <li>Pour les publicités Facebook, collez la partie après le « ? » dans le champ « Paramètres d&apos;URL » de la publicité.</li>
        </ul>
        <table className="mt-4 w-full text-left text-xs">
          <thead className="text-muted">
            <tr><th className="py-1 pr-3">Où</th><th className="py-1 pr-3">Fin du lien</th><th className="py-1">Source dans le tableau de bord</th></tr>
          </thead>
          <tbody>
            {EXAMPLES.map(([where, params, label]) => (
              <tr key={where} className="border-t border-outline">
                <td className="py-1.5 pr-3">{where}</td>
                <td className="py-1.5 pr-3 font-mono">{params}</td>
                <td className="py-1.5">{label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
