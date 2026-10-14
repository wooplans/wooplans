import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import {
  ADMIN_COOKIE,
  MEMBER_COOKIE,
  verifyToken,
  type AdminToken,
  type MemberToken,
} from "@/lib/session";

export type CurrentMember = typeof schema.members.$inferSelect;
export type CurrentAdmin = { id: string; email: string; name: string };

/** Vérifie le jeton ET l'état du membre en base (révocation immédiate). */
export async function getCurrentMember(): Promise<CurrentMember | null> {
  const token = await verifyToken<MemberToken>((await cookies()).get(MEMBER_COOKIE)?.value, "member");
  if (!token) return null;
  const member = await getDb().query.members.findFirst({ where: eq(schema.members.id, token.sub) });
  if (!member || member.status !== "active" || member.sessionVersion !== token.ver) return null;
  return member;
}

export async function requireMember(): Promise<CurrentMember> {
  const member = await getCurrentMember();
  if (!member) redirect("/connexion");
  return member;
}

export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  const token = await verifyToken<AdminToken>((await cookies()).get(ADMIN_COOKIE)?.value, "admin");
  if (!token) return null;
  const admin = await getDb().query.admins.findFirst({ where: eq(schema.admins.id, token.sub) });
  return admin ? { id: admin.id, email: admin.email, name: admin.name } : null;
}

export async function requireAdmin(): Promise<CurrentAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/connexion");
  return admin;
}
