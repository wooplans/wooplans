import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { normalizeAccessCode, randomAccessCode, randomId, sha256Hex } from "@/lib/crypto";
import { requireSecret } from "@/lib/env";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function hashAccessCode(code: string) {
  return sha256Hex(`${requireSecret("AUTH_SECRET")}:member-code:${normalizeAccessCode(code)}`);
}

type GrantInput = {
  email: string;
  name?: string | null;
  phone?: string | null;
  country?: string | null;
  source: "chariow" | "wajub" | "legacy_import" | "manual";
  chariowCustomerId?: string | null;
};

/**
 * Crée le membre ou réactive l'accès existant, avec un nouveau code.
 * Retourne le code en clair (à transmettre une seule fois) et le membre.
 */
export async function grantAccess(input: GrantInput) {
  const db = getDb();
  const email = normalizeEmail(input.email);
  const code = randomAccessCode();
  const codeHash = await hashAccessCode(code);
  // CRM prospects : devenu membre (Chariow, ajout manuel, outil MCP) → plus aucune relance d'achat.
  await db
    .update(schema.prospects)
    .set({ status: "converted", convertedAt: new Date(), nextEmailAt: null, updatedAt: new Date() })
    .where(and(eq(schema.prospects.email, email), inArray(schema.prospects.status, ["open", "lost"])));
  const existing = await db.query.members.findFirst({ where: eq(schema.members.email, email) });

  if (existing) {
    const [member] = await db
      .update(schema.members)
      .set({
        status: "active",
        codeHash,
        sessionVersion: sql`${schema.members.sessionVersion} + 1`,
        revokedAt: null,
        revokedReason: null,
        name: existing.name || input.name || "",
        phone: existing.phone || input.phone || null,
        country: existing.country || input.country || null,
        chariowCustomerId: existing.chariowCustomerId || input.chariowCustomerId || null,
        updatedAt: new Date(),
      })
      .where(eq(schema.members.id, existing.id))
      .returning();
    return { member, code, created: false };
  }

  const [member] = await db
    .insert(schema.members)
    .values({
      id: randomId(),
      email,
      name: input.name || "",
      phone: input.phone || null,
      country: input.country || null,
      source: input.source,
      chariowCustomerId: input.chariowCustomerId || null,
      codeHash,
    })
    .returning();
  return { member, code, created: true };
}

/** Génère un nouveau code (l'ancien cesse de fonctionner, les sessions sont fermées). */
export async function rotateAccessCode(memberId: string) {
  const code = randomAccessCode();
  const [member] = await getDb()
    .update(schema.members)
    .set({
      codeHash: await hashAccessCode(code),
      sessionVersion: sql`${schema.members.sessionVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(schema.members.id, memberId))
    .returning();
  return { member, code };
}

export async function revokeAccess(memberId: string, reason: string) {
  await getDb()
    .update(schema.members)
    .set({
      status: "revoked",
      revokedAt: new Date(),
      revokedReason: reason,
      sessionVersion: sql`${schema.members.sessionVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(schema.members.id, memberId));
}

export async function verifyMemberCredentials(email: string, code: string) {
  const member = await getDb().query.members.findFirst({
    where: eq(schema.members.email, normalizeEmail(email)),
  });
  if (!member || member.status !== "active") return null;
  const hash = await hashAccessCode(code);
  return hash === member.codeHash ? member : null;
}
