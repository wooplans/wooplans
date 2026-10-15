import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { accessCodeEmail, sendEmail } from "@/lib/email";
import { normalizeEmail, rotateAccessCode } from "@/lib/members";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/** Envoie un nouveau code par email. Réponse identique que l'email existe ou non. */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = normalizeEmail(body.email || "");
  const generic = NextResponse.json({
    ok: true,
    message: "Si cet email correspond à un accès Premium actif, un nouveau code vient d'être envoyé.",
  });
  if (!email) return generic;

  const allowed =
    (await rateLimit(`forgot-ip:${clientIp(request.headers)}`, 10, 60 * 60 * 1000)) &&
    (await rateLimit(`forgot-email:${email}`, 3, 60 * 60 * 1000));
  if (!allowed) return generic;

  const member = await getDb().query.members.findFirst({ where: eq(schema.members.email, email) });
  if (!member || member.status !== "active") return generic;

  const { code } = await rotateAccessCode(member.id);
  const mail = accessCodeEmail({ name: member.name, email, code, kind: "new_code" });
  await sendEmail({ to: email, ...mail, template: "access_code_reset", memberId: member.id });
  return generic;
}
