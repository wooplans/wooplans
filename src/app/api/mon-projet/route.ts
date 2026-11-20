import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { projectHotAdminEmail, sendEmail } from "@/lib/email";
import { getEnv } from "@/lib/env";
import { isBurningProject, parseProjectAnswers, projectRedirectPath, projectSummary } from "@/lib/project-form";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { whatsappLink } from "@/lib/site";
import { waNumber } from "@/lib/whatsapp-rules";

/**
 * Formulaire « Mon projet » : réponses enregistrées sur la fiche du prospect (lien personnel, aucune donnée saisie),
 * puis redirection vers le catalogue des villas, des duplex, ou le catalogue complet. Terrain + démarrage dans les
 * 6 mois : alerte à Tao (prospect brûlant).
 */
export async function POST(request: NextRequest) {
  if (!(await rateLimit(`mon-projet:${clientIp(request.headers)}`, 30, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Trop de tentatives." }, { status: 429 });
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const answers = parseProjectAnswers(body);
  if (!answers) return NextResponse.json({ error: "Merci de répondre aux 4 questions." }, { status: 400 });
  const redirect = projectRedirectPath(answers);
  const id = String(body.id ?? "").slice(0, 64);
  const db = getDb();
  const prospect = id ? await db.query.prospects.findFirst({ where: eq(schema.prospects.id, id) }) : null;
  // Lien inconnu : on redirige quand même, sans rien enregistrer.
  if (!prospect) return NextResponse.json({ ok: true, redirect });

  const now = new Date();
  const summary = projectSummary(answers);
  const burning = isBurningProject(answers);
  const firstTime = !prospect.projectAnsweredAt;
  const line = `${now.toISOString().slice(0, 10)} : formulaire Mon projet, ${summary}`;
  await db
    .update(schema.prospects)
    .set({
      projectAnswers: JSON.stringify(answers),
      projectAnsweredAt: now,
      notes: prospect.notes ? `${prospect.notes}\n${line}` : line,
      ...(burning && prospect.pipelineStage !== "client" ? { pipelineStage: "chaud" as const, pipelineUpdatedAt: now } : {}),
      updatedAt: now,
    })
    .where(eq(schema.prospects.id, prospect.id));

  const notify = getEnv().ADMIN_NOTIFY_EMAIL;
  if (burning && firstTime && notify && prospect.pipelineStage !== "client") {
    const phone = waNumber(prospect.phone);
    const mail = projectHotAdminEmail({
      name: prospect.name,
      email: prospect.email,
      phone: prospect.phone,
      summary,
      whatsappUrl: phone ? whatsappLink(`Bonjour ${prospect.name?.split(" ")[0] ?? ""}, merci pour vos réponses ! Vous avez votre terrain et voulez construire bientôt : je vous aide à choisir votre maison ?`, phone.replace("+", "")) : null,
    });
    await sendEmail({ to: notify, ...mail, template: "admin_projet_brulant" }).catch((error) => console.error("Alerte prospect brûlant non envoyée", error));
  }
  return NextResponse.json({ ok: true, redirect });
}
