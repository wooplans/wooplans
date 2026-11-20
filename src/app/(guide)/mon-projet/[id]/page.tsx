import type { Metadata } from "next";
import { and, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { ProjectForm } from "@/components/guide/ProjectForm";
import { PROJECT_QUESTIONS } from "@/lib/project-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Votre projet de maison", robots: { index: false, follow: false } };

/**
 * Formulaire « Mon projet » : lien personnel envoyé par WhatsApp et email (J10, puis J90). L'identifiant du prospect
 * suffit : aucune information personnelle à saisir. La première ouverture est notée (signal d'intérêt).
 */
export default async function MonProjetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pid = decodeURIComponent(id).slice(0, 64);
  const db = getDb();
  const prospect = await db.query.prospects.findFirst({ where: eq(schema.prospects.id, pid), columns: { id: true, name: true } }).catch(() => null);
  if (prospect) {
    await db
      .update(schema.prospects)
      .set({ projectOpenedAt: new Date() })
      .where(and(eq(schema.prospects.id, prospect.id), isNull(schema.prospects.projectOpenedAt)))
      .catch(() => null);
  }
  const first = prospect?.name?.trim().split(/\s+/)[0] ?? null;
  return (
    <div className="min-h-dvh bg-primary text-white">
      <div className="container-page max-w-xl py-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/wooplans-logo-white.png" alt="WOOPLANS" width={120} height={36} className="h-8 w-auto" />
        <h1 className="mt-6 text-2xl font-bold leading-tight md:text-3xl">
          {first ? `${first.charAt(0).toUpperCase()}${first.slice(1).toLowerCase()}, parlez-nous de votre projet` : "Parlez-nous de votre projet"}
        </h1>
        <p className="mt-2 text-white/80">4 questions, 20 secondes. Ensuite, nous vous montrons les maisons qui vous correspondent.</p>
        <ProjectForm id={prospect?.id ?? pid} questions={PROJECT_QUESTIONS.map((q) => ({ key: q.key, label: q.label, options: q.options.map(([value, label]) => ({ value, label })) }))} />
      </div>
    </div>
  );
}
