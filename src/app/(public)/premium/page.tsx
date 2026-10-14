import { serverEnv } from "@/lib/server-env";
import { redirect } from "next/navigation";
import { getCurrentSession, hasPremiumAccess } from "@/lib/auth-server";
import { getPrisma } from "@/lib/prisma";
import { listPlans } from "@/lib/db";
import { ensureD1Schema } from "@/lib/d1-schema";
import { PremiumWorkspace } from "@/components/PremiumWorkspace";
export const dynamic = "force-dynamic";
export const runtime = "edge";
export const metadata = {
  title: "Mon espace Premium | Wooplans",
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: { modele?: string };
}) {
  if (!(await hasPremiumAccess())) redirect("/connexion?callbackUrl=/premium");
  const session = await getCurrentSession();
  await ensureD1Schema();
  const db = getPrisma();
  const plans = await listPlans({ published: true });
  const favorites = await db.favorite.findMany({
    where: { subscriberId: session!.user.id },
  });
  const projects = await db.project.findMany({
    where: { subscriberId: session!.user.id },
    orderBy: { createdAt: "desc" },
  });
  const resources = [
    ["catalogue", "Catalogue PDF", serverEnv("CATALOGUE_PDF_KEY")],
    ["guide", "Guide et fiche de comparaison", serverEnv("PREMIUM_GUIDE_KEY")],
    [
      "video-choix",
      "Vidéo : choisir ses modèles",
      serverEnv("PREMIUM_VIDEO_CHOIX_KEY"),
    ],
    [
      "video-plans",
      "Vidéo : lire les plans",
      serverEnv("PREMIUM_VIDEO_PLANS_KEY"),
    ],
    [
      "video-devis",
      "Vidéo : comprendre le devis",
      serverEnv("PREMIUM_VIDEO_DEVIS_KEY"),
    ],
  ];
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 space-y-8">
      <h1 className="text-3xl font-semibold">Votre espace Premium</h1>
      <p>
        Définissez vos besoins, sélectionnez trois modèles et comparez avant de
        choisir.
      </p>
      <section className="rounded-2xl border p-6">
        <h2 className="text-xl font-semibold">Mes ressources</h2>
        <ul className="mt-4 space-y-3">
          {resources.map(([id, title, key]) => (
            <li key={id}>
              {key ? (
                <a
                  className="underline text-primary"
                  href={`/api/premium/resources/${id}`}
                >
                  {title}
                </a>
              ) : (
                <span>
                  {title} : consultez les documents de votre commande ou
                  contactez le support.
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
      <PremiumWorkspace
        plans={plans.map((p) => ({
          slug: p.slug,
          name: p.name,
          surface: p.surface,
          bedrooms: p.bedrooms,
          budget: p.estimatedTotalPrice,
        }))}
        favorites={favorites.map((f) => f.modelSlug)}
        initialModel={searchParams.modele}
      />
      <section>
        <h2 className="text-xl font-semibold">Mes demandes</h2>
        {projects.map((p) => (
          <p key={p.id} className="mt-3">
            {p.modelSlug} · demande enregistrée le{" "}
            {p.createdAt.toLocaleDateString("fr-FR")}
          </p>
        ))}
      </section>
    </div>
  );
}
