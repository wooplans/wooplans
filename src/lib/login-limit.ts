import { getPrisma } from "@/lib/prisma";
import { ensureD1Schema } from "@/lib/d1-schema";
export async function allowLoginAttempt(email: string) {
  await ensureD1Schema();
  const hash = Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(email.toLowerCase()),
      ),
    ),
    (n) => n.toString(16).padStart(2, "0"),
  ).join("");
  const bucket = Math.floor(Date.now() / (15 * 60 * 1000));
  const db = getPrisma();
  // Atomic counter prevents simultaneous requests from bypassing the limit.
  const row = await db.authAttempt.upsert({
    where: { id: `${bucket}:${hash}` },
    create: { id: `${bucket}:${hash}`, count: 1 },
    update: { count: { increment: 1 } },
  });
  return row.count <= 10;
}
