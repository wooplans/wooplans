import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { EmailOptoutScope } from "@/db/schema";
import { hmacSha256B64, timingSafeEqual } from "@/lib/crypto";
import { requireSecret, siteUrl } from "@/lib/env";

/**
 * Désinscription des emails automatiques. Le lien est signé (HMAC avec AUTH_SECRET) :
 * personne ne peut désinscrire une autre adresse. Pas d'expiration : un vieux lien doit toujours marcher.
 */
export const OPTOUT_LABELS: Record<EmailOptoutScope, string> = {
  prospects: "les rappels concernant votre achat du Catalogue Premium",
  members: "les actualités mensuelles de l'espace Premium (nouveaux modèles)",
};

async function signature(email: string, scope: EmailOptoutScope) {
  return (await hmacSha256B64(requireSecret("AUTH_SECRET"), `optout:${scope}:${email}`)).slice(0, 32);
}

export async function unsubscribeUrl(email: string, scope: EmailOptoutScope) {
  const params = new URLSearchParams({ e: email, s: scope, t: await signature(email, scope) });
  return siteUrl(`/desinscription?${params}`);
}

export async function verifyUnsubscribe(email: string, scope: string, token: string): Promise<EmailOptoutScope | null> {
  if (scope !== "prospects" && scope !== "members") return null;
  if (!email || !token) return null;
  return timingSafeEqual(token, await signature(email, scope)) ? scope : null;
}

export async function optOut(email: string, scope: EmailOptoutScope) {
  await getDb().insert(schema.emailOptouts).values({ email, scope }).onConflictDoNothing();
  if (scope === "prospects") {
    await getDb()
      .update(schema.prospects)
      .set({ status: "unsubscribed", nextEmailAt: null, updatedAt: new Date() })
      .where(and(eq(schema.prospects.email, email), eq(schema.prospects.status, "open")));
  }
}

export async function optedOutEmails(emails: string[], scope: EmailOptoutScope) {
  if (emails.length === 0) return new Set<string>();
  const rows = await getDb().query.emailOptouts.findMany({
    where: and(eq(schema.emailOptouts.scope, scope), inArray(schema.emailOptouts.email, emails)),
    columns: { email: true },
  });
  return new Set(rows.map((r) => r.email));
}

/** En-têtes standard (désinscription en un clic depuis Gmail / Outlook). */
export async function unsubscribeHeaders(email: string, scope: EmailOptoutScope) {
  const params = new URLSearchParams({ e: email, s: scope, t: await signature(email, scope) });
  return {
    "List-Unsubscribe": `<${siteUrl(`/api/desinscription?${params}`)}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
