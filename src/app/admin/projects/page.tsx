import { OfflineProjectForm } from "@/components/OfflineProjectForm";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth-server";
import { ensureD1Schema } from "@/lib/d1-schema";
import { getPrisma } from "@/lib/prisma";
import { ProjectEditor } from "@/components/ProjectEditor";
export const dynamic = "force-dynamic";
export const runtime = "edge";
export const metadata = {
  title: "Projets et encaissements | Wooplans",
  robots: { index: false, follow: false },
};
export default async function Page() {
  if ((await getCurrentSession())?.user.role !== "admin")
    redirect("/admin/login");
  await ensureD1Schema();
  const db = getPrisma();
  const [projects, members, plans] = await Promise.all([
    db.project.findMany({ orderBy: { updatedAt: "desc" } }),
    db.subscriber.findMany(),
    db.plan.findMany({
      where: { published: true },
      select: { slug: true, name: true },
    }),
  ]);
  const won = projects.filter((p) =>
    ["confirmed", "production", "delivered"].includes(p.status),
  );
  const converted = new Set(won.map((p) => p.subscriberId)).size;
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold">
        Projets personnalisés et suivi CRM
      </h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Demandes", projects.length],
          ["Membres convertis", converted],
          [
            "Encaissements plans complets",
            projects
              .reduce((sum, p) => sum + p.paidAmount, 0)
              .toLocaleString("fr-FR") + " FCFA",
          ],
        ].map(([label, value]) => (
          <div key={label} className="border bg-surface p-5">
            <p>{label}</p>
            <strong className="text-2xl">{value}</strong>
          </div>
        ))}
      </div>
      <p>
        Les montants ci-dessous concernent les plans complets. Les ventes du
        catalogue sont suivies dans le dashboard Tunnel. Le crédit catalogue
        réduit les honoraires ; il ne constitue pas un nouvel encaissement.
      </p>
      <OfflineProjectForm
        members={members.map((m) => ({ id: m.id, email: m.email }))}
        plans={plans}
      />
      {projects.length === 0 && (
        <p>
          Aucune demande enregistrée. Les demandes des membres apparaîtront ici.
        </p>
      )}
      {projects.map((p) => (
        <article key={p.id} className="rounded-2xl border bg-surface p-6">
          <h2 className="text-xl font-semibold">
            {p.modelSlug} ·{" "}
            {members.find((m) => m.id === p.subscriberId)?.email ||
              "Membre introuvable"}
          </h2>
          <p className="mt-3">
            Contact : {p.phone} · {p.location}
          </p>
          <p className="mt-2">Terrain : {p.terrain}</p>
          <p className="mt-2 whitespace-pre-wrap">Besoins : {p.needs}</p>
          <ProjectEditor
            project={{
              id: p.id,
              status: p.status,
              notes: p.notes,
              nextFollowUp: p.nextFollowUp?.toISOString().slice(0, 10) || "",
              grossPrice: p.grossPrice,
              catalogueCredit: p.catalogueCredit,
              paidAmount: p.paidAmount,
            }}
          />
        </article>
      ))}
    </div>
  );
}
